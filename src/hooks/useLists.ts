import { useCallback, useEffect } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import {
  setLoading, setLists, setError,
  addList, upsertList, removeList, bumpMemberCount, clearLists,
} from '../store/slices/listsSlice';
import {
  listLists,
  createList as apiCreate,
  updateList as apiUpdate,
  archiveList as apiArchive,
  addContactsToList as apiAddMembers,
  removeContactFromList as apiRemoveMember,
  type ListCreateBody, type ListUpdateBody,
} from '../lib/api/lists';
import { ApiError } from '../lib/api/client';

/* Hook for lists CRUD + membership. Loads on first use (per client). */
export function useLists(clientId: string | null) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const state = useAppSelector((s) => s.lists);

  // Fetch lists for a clientId when needed. Deps are deliberately minimal —
  // dispatch(setLoading) changes state.status, but we don't depend on
  // state.* here (we read the latest slice via store.getState() instead),
  // so the effect doesn't re-run on its own writes.
  //
  // Bail condition is `=== 'loaded'` only. If we see 'loading' on mount, that
  // means a PREVIOUS mount started a fetch that got cancelled by unmount
  // (the cleanup below sets cancelled=true), so the slice is permanently
  // stuck unless we refetch. Self-healing: any non-loaded status triggers
  // a new fetch on the next mount.
  useEffect(() => {
    if (!clientId) return;
    const slice = store.getState().lists;
    if (slice.clientId === clientId && slice.status === 'loaded') {
      return;     // we already have data — no work to do
    }
    let cancelled = false;
    dispatch(setLoading({ clientId }));
    listLists(clientId)
      .then((res) => { if (!cancelled) dispatch(setLists(res.data.items)); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return;
        dispatch(setError(err instanceof Error ? err.message : 'Failed to load lists'));
      });
    return () => { cancelled = true; };
  }, [clientId, dispatch, store]);

  const create = useCallback(async (body: ListCreateBody) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiCreate(clientId, body);
    dispatch(addList(res.data.list));
    return res.data.list;
  }, [clientId, dispatch]);

  const update = useCallback(async (listId: string, body: ListUpdateBody) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiUpdate(clientId, listId, body);
    dispatch(upsertList(res.data.list));
    return res.data.list;
  }, [clientId, dispatch]);

  const archive = useCallback(async (listId: string) => {
    if (!clientId) throw new Error('No active client');
    await apiArchive(clientId, listId);
    dispatch(removeList(listId));
  }, [clientId, dispatch]);

  const addMembers = useCallback(async (listId: string, contactIds: string[]) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiAddMembers(clientId, listId, contactIds);
    dispatch(bumpMemberCount({ listId, delta: res.data.added }));
    return res.data.added;
  }, [clientId, dispatch]);

  const removeMember = useCallback(async (listId: string, contactId: string) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiRemoveMember(clientId, listId, contactId);
    if (res.data.removed > 0) dispatch(bumpMemberCount({ listId, delta: -res.data.removed }));
    return res.data.removed;
  }, [clientId, dispatch]);

  const clear = useCallback(() => dispatch(clearLists()), [dispatch]);

  return {
    ...state,
    create,
    update,
    archive,
    addMembers,
    removeMember,
    clear,
  };
}
