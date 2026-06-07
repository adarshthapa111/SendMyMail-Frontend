import { useCallback, useEffect, useState } from 'react';
import {
  getClientReport,
  type ClientReportPayload,
  type ReportRange,
} from '../lib/api/clientReport';
import { ApiError } from '../lib/api/client';

/* useClientReport — load + refetch the per-client engagement report.
   Changing the range triggers a refetch (server-side caches 60s per
   (clientId, range), so range changes are fast on repeat visits). */
export function useClientReport(clientId: string | null) {
  const [range,   setRange]   = useState<ReportRange>('30d');
  const [data,    setData]    = useState<ClientReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refetch = useCallback(async (r: ReportRange) => {
    if (!clientId) return;
    try {
      const res = await getClientReport(clientId, r);
      setData(res.data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void refetch(range);
  }, [clientId, range, refetch]);

  return { data, loading, error, range, setRange, refetch };
}
