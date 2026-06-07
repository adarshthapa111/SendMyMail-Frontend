import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IconArrowLeft, IconCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { Heading, Text, Button, Field, Input, Spinner } from '../../components/ui';
import {
  createForm, updateForm, getForm,
  type FormCreateBody, type FormUpdateBody,
} from '../../lib/api/forms';
import { useLists } from '../../hooks/useLists';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import { FormRenderer, type FormRendererConfig } from '../../components/forms/FormRenderer';
import styles from '@styles/components/forms/FormEditor.module.scss';

/* /clients/:cid/forms/new + /clients/:cid/forms/:id/edit
   ────────────────────────────────────────────────────────
   Two-column layout: config on the left, live preview on the right.
   The same FormRenderer component renders both the preview (here)
   and the public hosted form (in HostedForm.tsx) so what you edit is
   exactly what recipients see. */
export function FormEditor() {
  const { clientId = null, formId } = useParams<{ clientId: string; formId?: string }>();
  const navigate = useNavigate();
  const { agency } = useAuth();
  const isEdit = !!formId;
  const lists = useLists(clientId);

  /* Form state */
  const [name,             setName]             = useState('');
  const [listId,           setListId]           = useState('');
  const [slug,             setSlug]             = useState('');
  const [headline,         setHeadline]         = useState('');
  const [subheadline,      setSubheadline]      = useState('');
  const [buttonText,       setButtonText]       = useState('Subscribe');
  const [thankYouMessage,  setThankYouMessage]  = useState("Thanks! We'll be in touch.");
  const [collectFirstName, setCollectFirstName] = useState(false);
  const [collectLastName,  setCollectLastName]  = useState(false);
  const [brandColor,       setBrandColor]       = useState('');
  const [requireConsent,   setRequireConsent]   = useState(false);
  const [consentText,      setConsentText]      = useState('I agree to receive marketing emails.');

  const [loading,    setLoading]    = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  /* Load existing form in edit mode. */
  useEffect(() => {
    if (!isEdit || !clientId || !formId) return;
    let cancelled = false;
    getForm(clientId, formId)
      .then((res) => {
        if (cancelled) return;
        const f = res.data.form;
        setName(f.name);
        setListId(f.listId);
        setSlug(f.slug);
        setHeadline(f.headline ?? '');
        setSubheadline(f.subheadline ?? '');
        setButtonText(f.buttonText);
        setThankYouMessage(f.thankYouMessage);
        setCollectFirstName(f.collectFirstName);
        setCollectLastName(f.collectLastName);
        setBrandColor(f.brandColor ?? '');
        setRequireConsent(f.requireConsent);
        setConsentText(f.consentText ?? 'I agree to receive marketing emails.');
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load form');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isEdit, clientId, formId]);

  /* Live preview config — recomputes on any change. */
  const previewConfig: FormRendererConfig = useMemo(() => ({
    agencyName:       agency?.name ?? 'Your agency',
    name:             name || 'Untitled form',
    headline:         headline || null,
    subheadline:      subheadline || null,
    buttonText:       buttonText || 'Subscribe',
    thankYouMessage:  thankYouMessage || "Thanks! We'll be in touch.",
    collectFirstName,
    collectLastName,
    brandColor:       brandColor || null,
    requireConsent,
    consentText:      consentText || null,
  }), [agency, name, headline, subheadline, buttonText, thankYouMessage,
       collectFirstName, collectLastName, brandColor, requireConsent, consentText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    if (!name.trim()) {
      setError('Form name is required.');
      return;
    }
    if (!listId) {
      setError('Pick a list for submissions to land in.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: FormCreateBody | FormUpdateBody = {
        name:             name.trim(),
        listId,
        ...(slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
        headline:         headline.trim() || null,
        subheadline:      subheadline.trim() || null,
        buttonText:       buttonText.trim() || 'Subscribe',
        thankYouMessage:  thankYouMessage.trim() || "Thanks! We'll be in touch.",
        collectFirstName,
        collectLastName,
        brandColor:       brandColor.trim() || null,
        requireConsent,
        consentText:      requireConsent ? (consentText.trim() || null) : null,
      };

      if (isEdit && formId) {
        await updateForm(clientId, formId, payload as FormUpdateBody);
        toast.success('Form updated');
        navigate(`/clients/${clientId}/forms/${formId}`);
      } else {
        const res = await createForm(clientId, payload as FormCreateBody);
        toast.success('Form created');
        navigate(`/clients/${clientId}/forms/${res.data.form.id}`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Failed to save form';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.center}><Spinner /></div>;
  }

  const activeLists = lists.items.filter((l) => !l.archived);

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link to={`/clients/${clientId}/forms`} className={styles.back}>
          <IconArrowLeft size={14} /> Forms
        </Link>
      </div>

      <header className={styles.header}>
        <div>
          <Heading size="xl">{isEdit ? 'Edit form' : 'Create form'}</Heading>
          <Text tone="muted" className={styles.subtitle}>
            {isEdit ? 'Edits go live immediately on the public URL.' : 'Configure the public signup form.'}
          </Text>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="primary"
            leading={submitting ? undefined : <IconDeviceFloppy size={15} />}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create form'}
          </Button>
        </div>
      </header>

      <div className={styles.split}>
        {/* ── CONFIG (left) ─────────────────────────────────────── */}
        <form className={styles.config} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <Heading size="sm" className={styles.sectionTitle}>Basics</Heading>
            <Field label="Internal name" helper="What you'll see in the forms list. Not shown to subscribers.">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Newsletter signup"
                maxLength={200}
                required
              />
            </Field>
            <Field label="Submissions land in" helper="Subscribers join this list automatically.">
              {activeLists.length === 0 ? (
                <Text tone="muted" size="sm">
                  No active lists. <Link to={`/clients/${clientId}/lists`}>Create a list</Link> first.
                </Text>
              ) : (
                <select
                  className={styles.select}
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  required
                >
                  <option value="">Pick a list…</option>
                  {activeLists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              label="Public URL slug"
              helper={isEdit
                ? 'Changing this breaks links you may have already shared.'
                : 'Leave blank to auto-generate from name. Lowercase letters, digits, hyphens.'}
            >
              <div className={styles.slugRow}>
                <span className={styles.slugPrefix}>/f/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={isEdit ? '' : 'auto-generated'}
                  maxLength={60}
                />
              </div>
            </Field>
          </section>

          <section className={styles.section}>
            <Heading size="sm" className={styles.sectionTitle}>Public copy</Heading>
            <Field label="Headline">
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Subscribe to our newsletter"
                maxLength={200}
              />
            </Field>
            <Field label="Sub-headline">
              <Input
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="Get weekly tips, recipes, and offers."
                maxLength={400}
              />
            </Field>
            <Field label="Button text">
              <Input
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Subscribe"
                maxLength={60}
              />
            </Field>
            <Field label="Thank-you message" helper="Shown after a successful submission.">
              <Input
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                placeholder="Thanks! We'll be in touch."
                maxLength={400}
              />
            </Field>
          </section>

          <section className={styles.section}>
            <Heading size="sm" className={styles.sectionTitle}>Fields</Heading>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={collectFirstName}
                onChange={(e) => setCollectFirstName(e.target.checked)}
              />
              <span>Collect first name</span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={collectLastName}
                onChange={(e) => setCollectLastName(e.target.checked)}
              />
              <span>Collect last name</span>
            </label>
          </section>

          <section className={styles.section}>
            <Heading size="sm" className={styles.sectionTitle}>Compliance</Heading>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={requireConsent}
                onChange={(e) => setRequireConsent(e.target.checked)}
              />
              <span>Require consent checkbox (recommended for GDPR)</span>
            </label>
            {requireConsent && (
              <Field label="Consent text">
                <Input
                  value={consentText}
                  onChange={(e) => setConsentText(e.target.value)}
                  placeholder="I agree to receive marketing emails."
                  maxLength={400}
                />
              </Field>
            )}
          </section>

          <section className={styles.section}>
            <Heading size="sm" className={styles.sectionTitle}>Theming</Heading>
            <Field
              label="Brand color (optional)"
              helper="Hex color for the submit button. Leave blank to use your agency primary."
            >
              <div className={styles.colorRow}>
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#A0522D"
                  maxLength={7}
                />
                {brandColor.match(/^#[0-9a-fA-F]{6}$/) && (
                  <div className={styles.colorSwatch} style={{ background: brandColor }} />
                )}
              </div>
            </Field>
          </section>

          {error && <div className={styles.error}>{error}</div>}
        </form>

        {/* ── PREVIEW (right) ───────────────────────────────────── */}
        <aside className={styles.previewPane}>
          <div className={styles.previewLabel}>
            <IconCheck size={12} />
            <span>Live preview</span>
          </div>
          <div className={styles.previewStage}>
            <FormRenderer config={previewConfig} interactive={false} />
          </div>
          <Text size="xs" tone="muted" className={styles.previewHint}>
            Updates as you type. This is what subscribers will see.
          </Text>
        </aside>
      </div>
    </div>
  );
}
