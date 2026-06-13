import { useEffect, useState } from 'react';
import { useParams, useBlocker } from 'react-router-dom';
import EditorBody from '../../components/EditorBody';
import { BuilderTopBar } from '../../components/templates';
import { Spinner } from '../../components/ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadTemplate } from '../../store/slices/editorSlice';
import { getTemplate, type Template } from '../../lib/api/templates';
import { getClient } from '../../lib/api/clients';
import { setActiveBrandKit } from '../../blocks/library/brandKit';
import { ApiError } from '../../lib/api/client';
import { toast } from '../../lib/toast';
import styles from '@styles/components/templates/Builder.module.scss';

/* /clients/:clientId/templates/:templateId/edit
   Full-screen editor — lives OUTSIDE <AppShell> per router/index.tsx.
   Renders the focused builder chrome (BuilderTopBar) + the editor body
   (Palette + Canvas + Inspector + DnD + Preview), nothing else.

   - Fetch on mount: GET /v1/clients/:cid/templates/:id → dispatch
     loadTemplate({tree}) so editorSlice populates with the saved design.
   - Local state holds the latest name + category so inline rename in the
     top bar updates instantly without a refetch.
   - Dirty-leave guard via React Router's useBlocker — confirms before nav
     away with unsaved changes. */
export function Builder() {
  const { clientId = '', templateId = '' } = useParams<{ clientId: string; templateId: string }>();
  const dispatch = useAppDispatch();
  const dirty = useAppSelector((s) => s.editor.dirty);

  const [template, setTemplate] = useState<Template | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Fetch + load into editor ──────────────────────────────────
  useEffect(() => {
    if (!clientId || !templateId) return;
    let cancelled = false;
    // Reset local state when the URL changes so the user sees the spinner
    // instead of the previous template flashing during the new fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadError(null);
    setTemplate(null);
    getTemplate(clientId, templateId)
      .then((res) => {
        if (cancelled) return;
        setTemplate(res.data.template);
        dispatch(loadTemplate({ tree: res.data.template.mjmlSource }));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return;     // global handler redirects
        const msg = err instanceof ApiError ? err.message : 'Failed to load template';
        setLoadError(msg);
        toast.error(msg);
      });
    return () => { cancelled = true; };
  }, [clientId, templateId, dispatch]);

  // ── Brand kit ─────────────────────────────────────────────────
  // feature-client-brand-kit V1 — load the active client's brand kit so
  // section composites drop on-brand. Reset to neutral defaults when the
  // builder unmounts. clientId is fixed for the session (it's in the URL),
  // so this runs once per builder visit.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    getClient(clientId)
      .then((res) => { if (!cancelled) setActiveBrandKit(res.data.client); })
      .catch(() => { if (!cancelled) setActiveBrandKit(null); });
    return () => {
      cancelled = true;
      setActiveBrandKit(null);
    };
  }, [clientId]);

  // ── Dirty-leave guard ─────────────────────────────────────────
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const ok = window.confirm('You have unsaved changes. Leave anyway?');
      if (ok) blocker.proceed?.();
      else    blocker.reset?.();
    }
  }, [blocker]);

  // beforeunload — catch full-page-reload / tab-close while dirty
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // ── Render ────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className={styles.fallback}>
        <p>{loadError}</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className={styles.fallback}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <BuilderTopBar
        clientId={clientId}
        templateId={templateId}
        templateName={template.name}
        category={template.category}
        onNameChange={(name) => setTemplate((t) => (t ? { ...t, name } : t))}
      />
      <EditorBody />
    </div>
  );
}
