import { useState } from 'react';
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Heading, Text, Card, Button, Spinner } from '../../components/ui';
import { IconArrowLeft, IconArchive } from '@tabler/icons-react';
import { ClientForm, ArchiveDialog, type ClientFormValues } from '../../components/clients';
import { updateClient, archiveClient } from '../../lib/api/clients';
import { upsertClient } from '../../store/slices/clientsSlice';
import { useAppDispatch } from '../../store/hooks';
import { useClients } from '../../hooks/useClients';
import { withFormToast } from '../../lib/toast';
import s from '@styles/components/clients/ClientPage.module.scss';

export function ClientEdit() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate     = useNavigate();
  const dispatch     = useAppDispatch();
  const { status, items } = useClients();

  const [submitting,   setSubmitting]    = useState(false);
  const [fieldErrors,  setFieldErrors]   = useState<Record<string, string>>({});
  const [archiveOpen,  setArchiveOpen]   = useState(false);
  const [archiving,    setArchiving]     = useState(false);

  // Wait for the slice to load before deciding "not found"
  if (status === 'loading' || status === 'idle') {
    return <div className={s.spinner}><Spinner /></div>;
  }

  const client = items.find((c) => c.id === clientId);
  if (!client) {
    // The ClientScoped guard normally redirects out-of-scope ids; this fires
    // for an id that's *in* scope but doesn't exist anymore (e.g. archived
    // in another tab). Send the user back to the list.
    return <Navigate to="/clients" replace />;
  }

  async function onSave(values: ClientFormValues) {
    if (!client) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await withFormToast(
        updateClient(client.id, {
          name:        values.name        !== client.name        ? values.name        : undefined,
          domain:      (values.domain || null) !== client.domain ? (values.domain || null) : undefined,
          avatarColor: values.avatarColor !== client.avatarColor ? values.avatarColor : undefined,
        }),
        {
          loading: 'Saving changes…',
          success: `Saved ${values.name}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      dispatch(upsertClient(res.data.client));
      navigate('/clients');
    } catch { /* toast / field error shown */ }
    finally { setSubmitting(false); }
  }

  async function onArchiveConfirm() {
    if (!client) return;
    setArchiving(true);
    try {
      const res = await withFormToast(
        archiveClient(client.id),
        {
          loading: 'Archiving client…',
          success: `Archived ${client.name}`,
        },
      );
      // upsertClient (not removeClient) — archived clients stay in the slice
      // so the /clients page's Archived tab can show them. The slice handles
      // active-id fallback automatically when an archived row was active.
      dispatch(upsertClient(res.data.client));
      navigate('/clients');
    } catch { /* toast shown */ }
    finally { setArchiving(false); setArchiveOpen(false); }
  }

  return (
    <div className={s.narrow}>
      <Link to="/clients" className={s.back}>
        <IconArrowLeft size={14} /> Back to clients
      </Link>

      <div className={s.head}>
        <div>
          <Heading size="xl">Edit {client.name}</Heading>
          <Text tone="muted" className={s.sub}>
            Slug <span className={s.slug}>/{client.slug}</span> can't be changed — it'd break shared campaign URLs.
          </Text>
        </div>
      </div>

      <Card padding="lg">
        <ClientForm
          initial={client}
          submitLabel="Save changes"
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onSave}
          onCancel={() => navigate('/clients')}
        />
      </Card>

      {/* Danger zone */}
      <div className={s.danger}>
        <Heading size="md" className={s.dangerTitle}>Archive this client</Heading>
        <Text tone="muted" className={s.dangerBody}>
          Hides {client.name} from your switcher and dashboard. All campaigns, contacts, and sends are preserved.
        </Text>
        <Button
          variant="danger"
          leading={<IconArchive size={15} />}
          onClick={() => setArchiveOpen(true)}
        >
          Archive {client.name}
        </Button>
      </div>

      {archiveOpen ? (
        <ArchiveDialog
          client={client}
          submitting={archiving}
          onConfirm={onArchiveConfirm}
          onCancel={() => setArchiveOpen(false)}
        />
      ) : null}
    </div>
  );
}
