import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import { Heading, Text, Spinner } from '../../components/ui';
import {
  CampaignStepRail,
  CampaignFooterNav,
  Step1Name,
  Step2Recipients,
  Step3FromSubject,
  Step4Template,
  Step5Schedule,
  Step6Review,
} from '../../components/campaigns';
import { useCampaigns } from '../../hooks/useCampaigns';
import {
  getCampaign,
  updateCampaign,
  launchCampaign,
  type Campaign,
  type CampaignUpdateBody,
} from '../../lib/api/campaigns';
import { ApiError } from '../../lib/api/client';
import { toast } from '../../lib/toast';
import styles from '@styles/components/campaigns/CampaignWizard.module.scss';

const TOTAL_STEPS = 6;

/* /clients/:cid/campaigns/:campaignId/edit  (and /new which redirects after
   create).
   Wizard shell: loads the campaign, owns the in-flight form state, and
   coordinates step navigation via ?step= query param.

   Each step is a controlled form; the shell PATCHes the campaign on
   every "Continue →" so closing the tab mid-wizard never loses progress
   (server is the source of truth). */
export function CampaignWizard() {
  const { clientId = null, campaignId = null } = useParams<{ clientId: string; campaignId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const camps = useCampaigns(clientId);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [launching, setLaunching] = useState(false);

  /* Local "pending" state — each step mutates this; on Continue → PATCH
     pushes it to the server. Avoids per-keystroke PATCHes. */
  const [pending, setPending] = useState<CampaignUpdateBody>({});

  const step = clampStep(parseInt(params.get('step') ?? '1', 10));

  /* Load the campaign on mount. */
  useEffect(() => {
    if (!clientId || !campaignId) return;
    let cancelled = false;
    // Reset local state for the new campaign fetch — standard initial-load pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadErr(null);
    getCampaign(clientId, campaignId)
      .then((res) => {
        if (cancelled) return;
        setCampaign(res.data.campaign);
        setPending({});
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return;
        setLoadErr(err instanceof ApiError ? err.message : 'Failed to load campaign');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, campaignId]);

  /* Merge `pending` with `campaign` for the step components to read.
     Looks like a normal campaign object; pending overrides take precedence.
     Memoized so identity stays stable across renders that don't touch
     either — otherwise the useCallbacks below would invalidate every render. */
  const draft: Campaign | null = useMemo(
    () => (campaign ? { ...campaign, ...pending } : null),
    [campaign, pending],
  );

  const onChange = useCallback((patch: Partial<CampaignUpdateBody>) => {
    setPending((prev) => ({ ...prev, ...patch }));
  }, []);

  const goToStep = useCallback((n: number) => {
    setParams({ step: String(clampStep(n)) }, { replace: false });
  }, [setParams]);

  /* PATCH the server with whatever's pending. Returns true on success. */
  const savePending = useCallback(async (): Promise<boolean> => {
    if (!clientId || !campaignId || Object.keys(pending).length === 0) return true;
    setSaving(true);
    try {
      const res = await updateCampaign(clientId, campaignId, pending);
      setCampaign(res.data.campaign);
      camps.update(campaignId, pending).catch(() => { /* slice update best-effort */ });
      setPending({});
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Failed to save';
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, [clientId, campaignId, pending, camps]);

  const onContinue = useCallback(async () => {
    const validation = validateStep(step, draft);
    if (validation) {
      toast.error(validation);
      return;
    }
    const ok = await savePending();
    if (!ok) return;
    if (step < TOTAL_STEPS) {
      goToStep(step + 1);
    }
  }, [step, draft, savePending, goToStep]);

  const onBack = useCallback(() => {
    if (step > 1) goToStep(step - 1);
    else if (clientId) navigate(`/clients/${clientId}/campaigns`);
  }, [step, goToStep, clientId, navigate]);

  const onSaveDraft = useCallback(async () => {
    const ok = await savePending();
    if (ok) toast.success('Draft saved');
  }, [savePending]);

  const onLaunch = useCallback(async () => {
    if (!clientId || !campaignId) return;
    setLaunching(true);
    const tid = toast.loading('Preparing to send…');
    try {
      // Save any in-flight changes first (e.g. preheader tweak on Review)
      if (Object.keys(pending).length > 0) {
        await updateCampaign(clientId, campaignId, pending);
        setPending({});
      }
      const res = await launchCampaign(clientId, campaignId);
      camps.update(campaignId, {}).catch(() => { /* best-effort */ });
      toast.success(
        `Sending to ${res.data.campaign.totalRecipients} recipient${res.data.campaign.totalRecipients === 1 ? '' : 's'}…`,
        { id: tid },
      );
      navigate(`/clients/${clientId}/campaigns/${campaignId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Failed to launch';
      toast.error(msg, { id: tid });
    } finally {
      setLaunching(false);
    }
  }, [clientId, campaignId, pending, camps, navigate]);

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner />
      </div>
    );
  }

  if (loadErr || !draft) {
    return (
      <div className={styles.center}>
        <Text tone="muted">Couldn't load campaign: {loadErr ?? 'unknown'}</Text>
      </div>
    );
  }

  if (draft.status !== 'draft' && draft.status !== 'scheduled') {
    // Already sent/sending — redirect to report
    if (clientId && campaignId) {
      navigate(`/clients/${clientId}/campaigns/${campaignId}`, { replace: true });
    }
    return null;
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.crumb}>
        <Link to={`/clients/${clientId}/campaigns`} className={styles.back}>
          <IconArrowLeft size={14} /> Campaigns
        </Link>
      </div>

      <header className={styles.header}>
        <Heading size="xl">{draft.name || 'Untitled campaign'}</Heading>
        <Text tone="muted" className={styles.subtitle}>
          Step {step} of {TOTAL_STEPS} · {STEP_TITLES[step - 1]}
        </Text>
      </header>

      <div className={styles.body}>
        <CampaignStepRail current={step} onJump={goToStep} draft={draft} />

        <main className={styles.main}>
          {step === 1 && <Step1Name draft={draft} onChange={onChange} />}
          {step === 2 && <Step2Recipients draft={draft} onChange={onChange} clientId={clientId!} />}
          {step === 3 && <Step3FromSubject draft={draft} onChange={onChange} />}
          {step === 4 && <Step4Template draft={draft} onChange={onChange} clientId={clientId!} />}
          {step === 5 && <Step5Schedule draft={draft} onChange={onChange} />}
          {step === 6 && <Step6Review draft={draft} clientId={clientId!} onJump={goToStep} />}

          <CampaignFooterNav
            step={step}
            totalSteps={TOTAL_STEPS}
            saving={saving}
            launching={launching}
            onBack={onBack}
            onSaveDraft={onSaveDraft}
            onContinue={onContinue}
            onLaunch={onLaunch}
          />
        </main>
      </div>
    </div>
  );
}

const STEP_TITLES = [
  'Name',
  'Recipients',
  'From & subject',
  'Template',
  'Schedule',
  'Review & send',
];

function clampStep(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > TOTAL_STEPS) return TOTAL_STEPS;
  return n;
}

/**
 * Per-step required-field validation. Returns an error message or null
 * if the step is complete. Server re-validates everything at launch.
 */
function validateStep(step: number, draft: Campaign | null): string | null {
  if (!draft) return 'Campaign not loaded';
  switch (step) {
    case 1:
      if (!draft.name?.trim()) return 'Campaign name is required';
      return null;
    case 2:
      if (!draft.listId) return 'Pick a recipient list';
      return null;
    case 3:
      if (!draft.fromName?.trim())  return 'Sender name is required';
      if (!draft.fromEmail?.trim()) return 'Sender email is required';
      if (!draft.subject?.trim())   return 'Subject is required';
      return null;
    case 4:
      if (!draft.templateId) return 'Pick a template';
      return null;
    case 5:
      // V1: "Send now" only — no validation
      return null;
    case 6:
      // Review: validate everything
      if (!draft.name?.trim())      return 'Campaign name is required';
      if (!draft.listId)            return 'Pick a recipient list';
      if (!draft.fromName?.trim())  return 'Sender name is required';
      if (!draft.fromEmail?.trim()) return 'Sender email is required';
      if (!draft.subject?.trim())   return 'Subject is required';
      if (!draft.templateId)        return 'Pick a template';
      return null;
    default:
      return null;
  }
}
