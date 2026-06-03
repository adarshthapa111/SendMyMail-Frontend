import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setLoading, setPage, setError,
  setSearch as setSearchAction, setListFilter, setTagFilter, gotoPage,
  addContact, upsertContact, removeContact, clearContacts,
} from '../store/slices/contactsSlice';
import {
  listContacts, createContact as apiCreate, updateContact as apiUpdate, deleteContact as apiDelete,
  type ContactCreateBody, type ContactUpdateBody,
} from '../lib/api/contacts';
import { ApiError } from '../lib/api/client';

/* Hook for the contacts page.
   Fetches a page of contacts whenever clientId / filters / page change;
   exposes mutations that update both the server and the slice in one call. */
export function useContacts(clientId: string | null) {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.contacts);

  // Fetch on dep change. We deliberately don't debounce search here — the
  // page component should debounce its setSearch callback if it cares.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    dispatch(setLoading({ clientId }));
    listContacts(clientId, {
      page:     state.page,
      pageSize: state.pageSize,
      search:   state.search || undefined,
      listId:   state.listId ?? undefined,
      tag:      state.tag    ?? undefined,
    })
      .then((res) => {
        if (cancelled) return;
        dispatch(setPage({
          items:    res.data.items,
          total:    res.data.total,
          page:     res.data.page,
          pageSize: res.data.pageSize,
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return;     // global handler will redirect
        dispatch(setError(err instanceof Error ? err.message : 'Failed to load contacts'));
      });
    return () => { cancelled = true; };
  }, [clientId, state.page, state.pageSize, state.search, state.listId, state.tag, dispatch]);

  const setSearch     = useCallback((q: string)        => dispatch(setSearchAction(q)),     [dispatch]);
  const setList       = useCallback((id: string | null) => dispatch(setListFilter(id)),     [dispatch]);
  const setTag        = useCallback((t: string | null) => dispatch(setTagFilter(t)),        [dispatch]);
  const goToPage      = useCallback((n: number)        => dispatch(gotoPage(n)),            [dispatch]);

  const create = useCallback(async (body: ContactCreateBody) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiCreate(clientId, body);
    dispatch(addContact(res.data.contact));
    return res.data.contact;
  }, [clientId, dispatch]);

  const update = useCallback(async (contactId: string, body: ContactUpdateBody) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiUpdate(clientId, contactId, body);
    dispatch(upsertContact(res.data.contact));
    return res.data.contact;
  }, [clientId, dispatch]);

  const remove = useCallback(async (contactId: string) => {
    if (!clientId) throw new Error('No active client');
    await apiDelete(clientId, contactId);
    dispatch(removeContact(contactId));
  }, [clientId, dispatch]);

  const clear = useCallback(() => dispatch(clearContacts()), [dispatch]);

  return {
    ...state,
    setSearch,
    setList,
    setTag,
    goToPage,
    create,
    update,
    remove,
    clear,
  };
}
