import { useCallback, useEffect } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import {
  setLoading, setCampaigns, setError,
  addCampaign, upsertCampaign, removeCampaign, clearCampaigns,
} from '../store/slices/campaignsSlice';
import {
  listCampaigns,
  createCampaign as apiCreate,
  updateCampaign as apiUpdate,
  deleteCampaign as apiDelete,
  type CampaignCreateBody, type CampaignUpdateBody,
} from '../lib/api/campaigns';
import { ApiError } from '../lib/api/client';

/* Hook for campaigns list + CRUD. Mirrors useTemplates exactly:
   bail ONLY on status='loaded' to self-heal stuck fetches; insert/upsert
   patterns identical to templates. */
export function useCampaigns(clientId: string | null) {
  const dispatch = useAppDispatch();
  const store    = useStore<RootState>();
  const state    = useAppSelector((s) => s.campaigns);

  useEffect(() => {
    if (!clientId) return;
    const slice = store.getState().campaigns;
    if (slice.clientId === clientId && slice.status === 'loaded') return;

    let cancelled = false;
    dispatch(setLoading({ clientId }));
    listCampaigns(clientId)
      .then((res) => { if (!cancelled) dispatch(setCampaigns(res.data.items)); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return;
        dispatch(setError(err instanceof Error ? err.message : 'Failed to load campaigns'));
      });
    return () => { cancelled = true; };
  }, [clientId, dispatch, store]);

  const create = useCallback(async (body: CampaignCreateBody) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiCreate(clientId, body);
    dispatch(addCampaign(res.data.campaign));
    return res.data.campaign;
  }, [clientId, dispatch]);

  const update = useCallback(async (campaignId: string, body: CampaignUpdateBody) => {
    if (!clientId) throw new Error('No active client');
    const res = await apiUpdate(clientId, campaignId, body);
    dispatch(upsertCampaign(res.data.campaign));
    return res.data.campaign;
  }, [clientId, dispatch]);

  const remove = useCallback(async (campaignId: string) => {
    if (!clientId) throw new Error('No active client');
    await apiDelete(clientId, campaignId);
    dispatch(removeCampaign(campaignId));
  }, [clientId, dispatch]);

  const drop  = useCallback((campaignId: string) => dispatch(removeCampaign(campaignId)), [dispatch]);
  const clear = useCallback(() => dispatch(clearCampaigns()), [dispatch]);

  return {
    ...state,
    create,
    update,
    remove,
    drop,
    clear,
  };
}
