import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heading, Text, Card } from '../../components/ui';
import { IconArrowLeft } from '@tabler/icons-react';
import { ClientForm, type ClientFormValues } from '../../components/clients';
import { createClient } from '../../lib/api/clients';
import { addClient } from '../../store/slices/clientsSlice';
import { useAppDispatch } from '../../store/hooks';
import { useClients } from '../../hooks/useClients';
import { withFormToast } from '../../lib/toast';
import s from '@styles/components/clients/ClientPage.module.scss';

export function ClientCreate() {
  const navigate  = useNavigate();
  const dispatch  = useAppDispatch();
  const { setActive } = useClients();
  const [submitting,   setSubmitting]  = useState(false);
  const [fieldErrors,  setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(values: ClientFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await withFormToast(
        createClient({
          name:        values.name,
          domain:      values.domain || null,
          avatarColor: values.avatarColor,
        }),
        {
          loading: 'Creating client…',
          success: `Created ${values.name}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      dispatch(addClient(res.data.client));
      setActive(res.data.client.id);   // make the new client the active one in the topbar switcher
      navigate('/clients');
    } catch { /* toast / field error already shown */ }
    finally { setSubmitting(false); }
  }

  return (
    <div className={s.narrow}>
      <Link to="/clients" className={s.back}>
        <IconArrowLeft size={14} /> Back to clients
      </Link>

      <div className={s.head}>
        <div>
          <Heading size="xl">Add a new client</Heading>
          <Text tone="muted" className={s.sub}>
            Each client has its own contacts, campaigns, and sending domain.
          </Text>
        </div>
      </div>

      <Card padding="lg">
        <ClientForm
          submitLabel="Create client"
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onSubmit}
          onCancel={() => navigate('/clients')}
        />
      </Card>
    </div>
  );
}
