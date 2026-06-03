import { useEffect, useState } from 'react';
import { Spinner } from '../components/ui';
import {
  Hero, KPIRow, SendingChart, DeliverabilityGauge, PlanUsage, ClientsHealthList,
} from '../components/dashboard';
import { getOverview, type OverviewPayload } from '../lib/api/overview';
import { ApiError } from '../lib/api/client';
import { toast } from '../lib/toast';
import styles from '@styles/components/dashboard/Dashboard.module.scss';

/* /dashboard — the agency-wide overview. Single GET /v1/agencies/overview
   on mount; server caches 60s. Layout follows agency_dashboard.html:
   Hero → KPIRow → (Chart + Gauge) → Clients health list. */
export function Dashboard() {
  const [data, setData]       = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOverview()
      .then((res) => { if (!cancelled) { setData(res.data); setLoading(false); } })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        if (err instanceof ApiError && err.status === 401) return;     // global handler redirects
        toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className={styles.spinner}><Spinner /></div>;
  if (!data)   return null;

  return (
    <>
      <Hero
        greeting={data.greeting}
        activeClients={data.kpis.active_clients.value ?? 0}
        sendMetricsAvailable={data.kpis.emails_sent.available}
      />

      <KPIRow kpis={data.kpis} />

      <div className={styles.split}>
        <SendingChart chart={data.sending_chart} />
        <div className={styles.rightCol}>
          <DeliverabilityGauge deliverability={data.deliverability} />
          <PlanUsage plan={data.plan_usage} />
        </div>
      </div>

      <ClientsHealthList
        clients={data.top_clients}
        totalActive={data.kpis.active_clients.value ?? 0}
      />
    </>
  );
}
