import { useCallback, useEffect } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import {
  setLoading, setTemplates, setError,
  addTemplate, upsertTemplate, removeTemplate, clearTemplates,
} from '../store/slices/templatesSlice';
import {
  listTemplates,
  createTemplate as apiCreate,
  updateTemplate as apiUpdate,
  archiveTemplate as apiArchive,
  duplicateTemplate as apiDuplicate,
  type TemplateCreateBody, type TemplateUpdateBody,
} from '../lib/api/templates';
import { ApiError } from '../lib/api/client';

/* Hook for templates list + CRUD. Loads on first use per client.
   Mirrors the useLists pattern after the stale-loading bug fix:
   bail ONLY on status='loaded'. Any other status (including 'loading')
   triggers a fresh fetch — self-healing if a previous mount unmounted
   mid-fetch and left the slice frozen. */
export function useTemplates(clientId: string | null) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const state = useAppSelector((s) => s.templates);

  useEffect(() => {
    if (!clientId) return;
    const slice = store.getState().templates;
    if (slice.clientId === clientId && slice.status === 'loaded') {
      return;     // we already have data — no work to do
    }
    let cancelled = false;
    dispatch(setLoading({ clientId }));
    listTemplates(clientId)
      .then((res) => { if (!cancelled) dispatch(setTemplates(res.data.items)); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return;     // global handler will redirect
        dispatch(setError(err instanceof Error ? err.message : 'Failed to load templates'));
      });
    return () => { cancelled = true; };
  }, [clientId, dispatch, store]);

  const create = useCallback(async (body: TemplateCreateBody) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiCreate(clientId, body);
    dispatch(addTemplate(res.data.template));
    return res.data.template;
  }, [clientId, dispatch]);

  const update = useCallback(async (templateId: string, body: TemplateUpdateBody) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiUpdate(clientId, templateId, body);
    dispatch(upsertTemplate(res.data.template));
    return res.data.template;
  }, [clientId, dispatch]);

  const archive = useCallback(async (templateId: string) => {
    if (!clientId) throw new Error('No active client');
    /* Optimistic — feature-perceived-performance V1. Snapshot the
       current row, flip archived to true immediately, fire API, rollback
       on error. The list page filters archived rows out by default so
       the row visually disappears at once. */
    const snapshot = store.getState().templates.items.find((t) => t.id === templateId);
    if (snapshot) {
      dispatch(upsertTemplate({ ...snapshot, archived: true }));
    }
    try {
      const res = await apiArchive(clientId, templateId);
      dispatch(upsertTemplate(res.data.template));
      return res.data.template;
    } catch (err) {
      if (snapshot) dispatch(upsertTemplate(snapshot));     // rollback
      throw err;
    }
  }, [clientId, dispatch, store]);

  /* feature-empty-states-and-undo V1 — Undo handler for archive.
     Flips archived back to false via PATCH. Used by successWithUndo
     toasts on archive flows so users have a 6-second escape hatch. */
  const unarchive = useCallback(async (templateId: string) => {
    if (!clientId) throw new Error('No active client');
    const snapshot = store.getState().templates.items.find((t) => t.id === templateId);
    if (snapshot) {
      dispatch(upsertTemplate({ ...snapshot, archived: false }));
    }
    try {
      const res = await apiUpdate(clientId, templateId, { archived: false });
      dispatch(upsertTemplate(res.data.template));
      return res.data.template;
    } catch (err) {
      if (snapshot) dispatch(upsertTemplate(snapshot));
      throw err;
    }
  }, [clientId, dispatch, store]);

  const duplicate = useCallback(async (templateId: string) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiDuplicate(clientId, templateId);
    dispatch(addTemplate(res.data.template));
    return res.data.template;
  }, [clientId, dispatch]);

  const drop = useCallback((templateId: string) => dispatch(removeTemplate(templateId)), [dispatch]);
  const clear = useCallback(() => dispatch(clearTemplates()), [dispatch]);

  return {
    ...state,
    create,
    update,
    archive,
    unarchive,
    duplicate,
    drop,
    clear,
  };
}
