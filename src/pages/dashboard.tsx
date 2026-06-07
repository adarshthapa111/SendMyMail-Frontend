import { useEffect, useState } from 'react';
import {
  Hero, KPIRow, SendingChart, DeliverabilityGauge, PlanUsage, ClientsHealthList,
} from '../components/dashboard';
import { OnboardingBanner } from '../components/onboarding/OnboardingBanner';
import { KpiCardSkeleton, ChartSkeleton, RowSkeleton, Skeleton } from '../components/skeletons';
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

  if (loading) {
    /* Skeleton mirrors the real dashboard: hero + 4 KPIs + chart +
       clients-health rows. Zero-shift when data lands. */
    return (
      <div aria-busy="true">
        <Skeleton w={280} h={32} style={{ marginBottom: 8 }} />
        <Skeleton w={420} h={14} style={{ marginBottom: 28 }} />
        <div className={styles.kpiRow}>
          <KpiCardSkeleton />
          <KpiCardSkeleton withSubtitle />
          <KpiCardSkeleton withSubtitle />
          <KpiCardSkeleton />
        </div>
        <div className={styles.split} style={{ marginTop: 28 }}>
          <div><ChartSkeleton /></div>
          <div className={styles.rightCol}>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>
        </div>
        <div style={{ marginTop: 28 }}>
          <RowSkeleton count={5} withAvatar />
        </div>
      </div>
    );
  }
  if (!data)   return null;

  return (
    <>
      <OnboardingBanner />

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
