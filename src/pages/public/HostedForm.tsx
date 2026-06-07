import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '../../components/ui';
import { FormRenderer, type FormRendererConfig } from '../../components/forms/FormRenderer';
import { getFormConfig, submitForm, type PublicFormConfig } from '../../lib/api/publicForms';
import styles from '@styles/components/public/HostedForm.module.scss';

/* /f/:slug — PUBLIC hosted signup form.
   ──────────────────────────────────────
   Outside AppShell, no auth. Recipients click the URL (from a social
   bio, QR code, email signature, ad campaign), this page fetches the
   form config from /f/:slug/config and renders it via the shared
   FormRenderer component.

   Submission goes to /f/:slug/submit. Backend handles dedup, suppression,
   rate-limiting silently. */
export function HostedForm() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'loaded';      config: PublicFormConfig }
    | { status: 'notFound' }
    | { status: 'paused';      config: PublicFormConfig }
  >({ status: 'loading' });

  useEffect(() => {
    if (!slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'notFound' });
      return;
    }
    let cancelled = false;
    getFormConfig(slug)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: 'notFound' });
          return;
        }
        if (res.config.status === 'paused') {
          setState({ status: 'paused', config: res.config });
          return;
        }
        setState({ status: 'loaded', config: res.config });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'notFound' });
      });
    return () => { cancelled = true; };
  }, [slug]);

  const handleSubmit = async (values: {
    email: string;
    first_name?: string;
    last_name?: string;
    consent?: boolean;
    honeypot?: string;
  }) => {
    const res = await submitForm(slug, values);
    return { ok: res.ok, message: res.message };
  };

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        {state.status === 'loading' && (
          <div className={styles.loadingCard}>
            <Spinner />
          </div>
        )}

        {state.status === 'notFound' && (
          <FormRenderer
            config={fallbackConfig}
            interactive={false}
            unavailable={{
              title: 'This form is no longer available',
              body:  'The form you were looking for has been archived or never existed.',
            }}
          />
        )}

        {state.status === 'paused' && (
          <FormRenderer
            config={toRendererConfig(state.config)}
            interactive={false}
            unavailable={{
              title: 'No longer accepting submissions',
              body:  `${state.config.agencyName} has paused this form for now. Check back later.`,
            }}
          />
        )}

        {state.status === 'loaded' && (
          <FormRenderer
            config={toRendererConfig(state.config)}
            interactive={true}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}

function toRendererConfig(config: PublicFormConfig): FormRendererConfig {
  return {
    agencyName:       config.agencyName,
    name:             config.name,
    headline:         config.headline,
    subheadline:      config.subheadline,
    buttonText:       config.buttonText,
    thankYouMessage:  config.thankYouMessage,
    collectFirstName: config.collectFirstName,
    collectLastName:  config.collectLastName,
    brandColor:       config.brandColor,
    requireConsent:   config.requireConsent,
    consentText:      config.consentText,
  };
}

const fallbackConfig: FormRendererConfig = {
  agencyName:       'SendMyMail',
  name:             'Form unavailable',
  headline:         null,
  subheadline:      null,
  buttonText:       'Submit',
  thankYouMessage:  '',
  collectFirstName: false,
  collectLastName:  false,
  brandColor:       null,
  requireConsent:   false,
  consentText:      null,
};
