import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heading, Text, Button, Card, Checkbox, Note, Select, Spinner } from '../../components/ui';
import {
  IconArrowLeft, IconShieldCheck, IconArrowRight,
} from '@tabler/icons-react';
import {
  FileDropZone, ColumnMapper, ImportProgressDialog,
  type ParsedPreview,
} from '../../components/contacts';
import { useLists } from '../../hooks/useLists';
import { uploadImport, type ColumnMapping, type ImportJob } from '../../lib/api/imports';
import { ApiError } from '../../lib/api/client';
import { withFormToast } from '../../lib/toast';
import styles from '@styles/components/contacts/ContactImport.module.scss';

const CONSENT_TEXT =
  "I confirm these contacts explicitly opted in to receive emails from this client. " +
  "Importing scraped or purchased lists violates SendMyMail's terms and Nepal's Advertisement Act 2076.";

export function ContactImport() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const lists = useLists(clientId ?? null);

  const [preview,       setPreview]       = useState<ParsedPreview | null>(null);
  const [listId,        setListId]        = useState<string>('');         // '' = no list
  const [mapping,       setMapping]       = useState<ColumnMapping>({});
  const [consent,       setConsent]       = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState<string | null>(null);
  const [progressJob,   setProgressJob]   = useState<ImportJob | null>(null);

  // Derived state — exactly one email column required
  const emailColumnCount = useMemo(
    () => Object.values(mapping).filter((t) => t === 'email').length,
    [mapping],
  );
  const canSubmit = !!preview && emailColumnCount === 1 && consent && !submitting;

  /* Step gating — soft hints that block submit. The user can still scroll
     and edit any section; we just disable the bottom button. */
  function disabledReason(): string | null {
    if (!preview) return 'Pick a CSV file to begin.';
    if (emailColumnCount === 0) return 'Map one column to Email.';
    if (emailColumnCount > 1) return 'Only one column can map to Email.';
    if (!consent) return 'Confirm consent to proceed.';
    return null;
  }

  async function submit() {
    if (!preview || !clientId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await withFormToast(
        uploadImport(clientId, {
          file:          preview.file,
          listId:        listId || null,
          columnMapping: mapping,
          consentText:   CONSENT_TEXT,
        }),
        {
          loading: 'Starting import…',
          success: 'Import queued — watching progress',
        },
      );
      setProgressJob(res.data.job);
    } catch (err) {
      if (err instanceof ApiError) setSubmitError(err.message);
      else setSubmitError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!clientId) return null;

  return (
    <div className={styles.narrow}>
      <Link to={`/clients/${clientId}/contacts`} className={styles.back}>
        <IconArrowLeft size={14} /> Back to contacts
      </Link>

      <div className={styles.head}>
        <Heading size="xl">Import contacts from CSV</Heading>
        <Text tone="muted" className={styles.sub}>
          Upload a CSV, map the columns, and confirm consent. Imports run asynchronously —
          you'll see live progress in a moment.
        </Text>
      </div>

      {/* Step 1 — File */}
      <Card padding="lg" className={styles.step}>
        <StepHead n={1} title="File" />
        <FileDropZone
          value={preview}
          onPicked={(p) => { setPreview(p); setMapping({}); }}
          onCleared={() => { setPreview(null); setMapping({}); }}
        />
      </Card>

      {/* Step 2 — Add to list */}
      <Card padding="lg" className={styles.step}>
        <StepHead n={2} title="Add to list" subtitle="(optional)" />
        {lists.status === 'loading' || lists.status === 'idle' ? (
          <div className={styles.spinnerRow}><Spinner /></div>
        ) : lists.items.length === 0 ? (
          <Text tone="muted" size="sm">
            You don't have any lists yet — imported contacts will live in the client without a list.
            <br />
            You can <Link to={`/clients/${clientId}/lists`} className={styles.inlineLink}>create a list</Link> first if you want.
          </Text>
        ) : (
          <Select value={listId} onChange={(e) => setListId(e.target.value)}>
            <option value="">— Don't add to a list —</option>
            {lists.items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.memberCount.toLocaleString()} {l.memberCount === 1 ? 'contact' : 'contacts'})
              </option>
            ))}
          </Select>
        )}
      </Card>

      {/* Step 3 — Map columns */}
      <Card padding="lg" className={styles.step}>
        <StepHead n={3} title="Map columns" />
        {!preview ? (
          <Text tone="muted" size="sm">Pick a file first.</Text>
        ) : (
          <ColumnMapper
            headers={preview.headers}
            sampleRows={preview.sampleRows}
            value={mapping}
            onChange={setMapping}
          />
        )}
      </Card>

      {/* Step 4 — Consent */}
      <Card padding="lg" className={styles.step}>
        <StepHead n={4} title="Consent" />
        <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} className={styles.consent}>
          {CONSENT_TEXT}
        </Checkbox>

        <Note className={styles.qualityNote}>
          <IconShieldCheck size={15} />
          <span>
            <b>Quality check.</b> On import we reject lists with more than 10% role accounts
            (<code className={styles.code}>info@</code>, <code className={styles.code}>admin@</code>,
            <code className={styles.code}>noreply@</code>, <code className={styles.code}>sales@</code>,
            etc.) and dedupe by email. This protects your sender reputation.
          </span>
        </Note>
      </Card>

      {submitError ? (
        <div className={styles.submitError}>{submitError}</div>
      ) : null}

      <div className={styles.foot}>
        <Button variant="ghost" onClick={() => navigate(`/clients/${clientId}/contacts`)} disabled={submitting}>
          Cancel
        </Button>
        <div className={styles.footRight}>
          {!canSubmit ? (
            <Text tone="soft" size="xs" className={styles.disabledHint}>
              {disabledReason()}
            </Text>
          ) : null}
          <Button
            variant="primary"
            disabled={!canSubmit}
            loading={submitting}
            trailing={canSubmit && !submitting ? <IconArrowRight size={15} /> : undefined}
            onClick={submit}
          >
            {submitting
              ? 'Starting…'
              : preview
                ? `Import ${preview.totalRows.toLocaleString()} ${preview.totalRows === 1 ? 'contact' : 'contacts'}`
                : 'Import contacts'}
          </Button>
        </div>
      </div>

      {progressJob ? (
        <ImportProgressDialog
          jobId={progressJob.id}
          initial={progressJob}
          onClose={() => setProgressJob(null)}
        />
      ) : null}
    </div>
  );
}

function StepHead({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className={styles.stepHead}>
      <span className={styles.stepNum}>{n}</span>
      <Heading level={2} size="md" className={styles.stepTitle}>
        {title}
        {subtitle ? <span className={styles.stepSub}> {subtitle}</span> : null}
      </Heading>
    </div>
  );
}
