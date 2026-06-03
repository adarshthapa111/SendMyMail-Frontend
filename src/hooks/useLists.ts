import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
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
  const state = useAppSelector((s) => s.lists);

  // Fetch once per (clientId) — won't re-fetch when items mutate (slice handles that)
  useEffect(() => {
    if (!clientId) return;
    if (state.clientId === clientId && state.status !== 'idle') return;
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
  }, [clientId, state.clientId, state.status, dispatch]);

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
