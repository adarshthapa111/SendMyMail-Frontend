import { useCallback, useEffect, useState } from 'react';
import {
  getOnboarding,
  skipOnboarding as apiSkip,
  completeOnboarding as apiComplete,
  type OnboardingProgress,
} from '../lib/api/onboarding';
import { ApiError } from '../lib/api/client';

/**
 * Onboarding progress hook. Fetches /v1/onboarding on mount, refetches
 * on window focus (so a user who completed a step in another tab sees
 * the rail update when they switch back to /onboarding), and exposes
 * skip + complete actions that mutate the cache locally.
 *
 * Backend derives progress from existing counts (clients / contacts /
 * templates) — no new table, so the response is cheap to compute.
 * Refetch-on-focus is fine; no need for polling.
 */
export function useOnboarding() {
  const [data,    setData]    = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await getOnboarding();
      setData(res.data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;     // global redirect
      setError(err instanceof Error ? err.message : 'Failed to load onboarding');
    } finally {
      setLoading(false);
    }
  }, []);

  /* Initial load. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void refetch();
  }, [refetch]);

  /* Refetch on window focus — a user who created a client in another
     tab should see the step tick when they return to /onboarding. */
  useEffect(() => {
    const onFocus = () => { void refetch(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetch]);

  const skip = useCallback(async () => {
    /* Optimistic — feature-perceived-performance V1. Banner disappears
       immediately; rolls back on error. */
    let prevSetupComplete: boolean | undefined;
    setData((prev) => {
      if (!prev) return prev;
      prevSetupComplete = prev.setupComplete;
      return { ...prev, setupComplete: true };
    });
    try {
      await apiSkip();
    } catch (err) {
      if (prevSetupComplete !== undefined) {
        const prev = prevSetupComplete;
        setData((curr) => curr ? { ...curr, setupComplete: prev } : curr);
      }
      throw err;
    }
  }, []);

  const complete = useCallback(async () => {
    /* Optimistic — feature-perceived-performance V1. */
    let prevSetupComplete: boolean | undefined;
    setData((prev) => {
      if (!prev) return prev;
      prevSetupComplete = prev.setupComplete;
      return { ...prev, setupComplete: true };
    });
    try {
      await apiComplete();
    } catch (err) {
      if (prevSetupComplete !== undefined) {
        const prev = prevSetupComplete;
        setData((curr) => curr ? { ...curr, setupComplete: prev } : curr);
      }
      throw err;
    }
  }, []);

  return { data, loading, error, refetch, skip, complete };
}
