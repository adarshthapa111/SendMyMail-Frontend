import { useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IconExternalLink, IconChartLine } from '@tabler/icons-react';
import { Heading, Text, Spinner, Pill } from '../../components/ui';
import { RangePicker } from '../../components/clients/RangePicker';
import { SendingChart } from '../../components/clients/SendingChart';
import { useClientReport } from '../../hooks/useClientReport';
import type { ReportRange } from '../../lib/api/clientReport';
import styles from '@styles/components/clients/ClientReport.module.scss';

/* /clients/:cid/report — per-client engagement report.
   ────────────────────────────────────────────────────
   Range picker drives a server-side aggregation (cached 60s per
   (clientId, range)). Layout: KPIs → sending chart → top campaigns
   → list health. Reuses theme tokens from the dashboard.

   The selected range is mirrored to the URL search param so refreshes
   and shared links preserve the user's view. */
export function ClientReport() {
  const { clientId = null } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlRange = (searchParams.get('range') as ReportRange) || '30d';
  const validRange: ReportRange = ['30d', '90d', 'all'].includes(urlRange) ? urlRange : '30d';

  const { data, loading, error, range, setRange } = useClientReport(clientId);

  /* Sync URL range → hook range on mount. */
  if (range !== validRange) setRange(validRange);

  const handleRangeChange = useCallback((next: ReportRange) => {
    setRange(next);
    setSearchParams({ range: next }, { replace: true });
  }, [setRange, setSearchParams]);

  if (loading && !data) {
    return <div className={styles.center}><Spinner /></div>;
  }
  if (error && !data) {
    return (
      <div className={styles.center}>
        <Text tone="muted">Couldn't load report: {error}</Text>
      </div>
    );
  }
  if (!data) return null;

  const isEmpty = data.kpis.sent_count === 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Heading size="xl">Performance report</Heading>
          <Text tone="muted" className={styles.subtitle}>
            {data.client.name} · {labelFor(range)}
          </Text>
        </div>
        <RangePicker value={range} onChange={handleRangeChange} disabled={loading} />
      </header>

      {/* ── KPI hero ─────────────────────────────────────────────── */}
      <div className={styles.kpiRow}>
        <KpiCard
          label="Sent"
          value={data.kpis.sent_count.toLocaleString()}
          tone="neutral"
        />
        <KpiCard
          label="Opened"
          value={data.kpis.unique_opens.toLocaleString()}
          subtitle={formatRate(data.kpis.open_rate)}
          tone={data.kpis.unique_opens > 0 ? 'engaged' : 'neutral'}
        />
        <KpiCard
          label="Clicked"
          value={data.kpis.unique_clicks.toLocaleString()}
          subtitle={formatRate(data.kpis.click_rate)}
          tone={data.kpis.unique_clicks > 0 ? 'engaged' : 'neutral'}
        />
        <KpiCard
          label="List growth"
          value={data.kpis.list_growth > 0 ? `+${data.kpis.list_growth}` : data.kpis.list_growth.toString()}
          subtitle="added net of unsubs"
          tone={data.kpis.list_growth > 0 ? 'ok' : 'muted'}
        />
      </div>

      {isEmpty ? (
        <EmptyState clientId={clientId} clientName={data.client.name} />
      ) : (
        <>
          {/* ── Sending chart ─────────────────────────────────────── */}
          <section className={styles.section}>
            <Heading size="md" className={styles.sectionTitle}>Sending over time</Heading>
            <SendingChart series={data.sending_chart} />
          </section>

          {/* ── Top campaigns ────────────────────────────────────── */}
          <section className={styles.section}>
            <Heading size="md" className={styles.sectionTitle}>Top campaigns by open rate</Heading>
            {data.top_campaigns.length === 0 ? (
              <Text tone="muted" size="sm" className={styles.sectionEmpty}>
                Need at least 10 sends per campaign to appear here. Keep sending and check back.
              </Text>
            ) : (
              <ol className={styles.topList}>
                {data.top_campaigns.map((c, i) => (
                  <li key={c.id} className={styles.topRow}>
                    <span className={styles.topRank}>{i + 1}</span>
                    <div className={styles.topMain}>
                      <button
                        type="button"
                        className={styles.topName}
                        onClick={() => navigate(`/clients/${clientId}/campaigns/${c.id}`)}
                      >
                        {c.name}
                        <IconExternalLink size={12} />
                      </button>
                      {c.subject && (
                        <span className={styles.topSubject} title={c.subject}>{c.subject}</span>
                      )}
                    </div>
                    <div className={styles.topStats}>
                      <span className={styles.topRate}>{formatRate(c.open_rate)}</span>
                      <span className={styles.topSent}>{c.sent_count.toLocaleString()} sent</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {/* ── List health (always shown) ───────────────────────────── */}
      <section className={styles.section}>
        <Heading size="md" className={styles.sectionTitle}>List health</Heading>
        <div className={styles.healthRow}>
          <HealthCard
            label="Total contacts"
            value={data.list_health.total_contacts}
            tone="neutral"
          />
          <HealthCard
            label="Subscribed"
            value={data.list_health.subscribed_count}
            tone="ok"
          />
          <HealthCard
            label="Unsubscribed"
            value={data.list_health.unsubscribed_count}
            tone="muted"
          />
          <HealthCard
            label="Suppressed"
            value={data.list_health.suppressed_count}
            tone="bad"
          />
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

interface KpiCardProps {
  label:     string;
  value:     string;
  subtitle?: string;
  tone:      'neutral' | 'engaged' | 'ok' | 'muted';
}

function KpiCard({ label, value, subtitle, tone }: KpiCardProps) {
  return (
    <div className={`${styles.kpi} ${styles['kpi_' + tone]}`}>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {subtitle && <div className={styles.kpiSubtitle}>{subtitle}</div>}
    </div>
  );
}

function HealthCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`${styles.healthCard} ${styles['healthCard_' + tone]}`}>
      <div className={styles.healthValue}>{value.toLocaleString()}</div>
      <div className={styles.healthLabel}>{label}</div>
    </div>
  );
}

function EmptyState({ clientId, clientName }: { clientId: string | null; clientName: string }) {
  return (
    <section className={styles.empty}>
      <IconChartLine size={32} className={styles.emptyIcon} />
      <Heading size="md">No data yet for this range</Heading>
      <Text tone="muted" size="sm" className={styles.emptyHint}>
        Launch a campaign to {clientName}'s contacts and engagement metrics
        will appear here.
      </Text>
      <Pill variant="indigo">
        <Link to={`/clients/${clientId}/campaigns/new`} className={styles.emptyCta}>
          Create a campaign
        </Link>
      </Pill>
    </section>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function labelFor(range: ReportRange): string {
  if (range === '30d') return 'Last 30 days';
  if (range === '90d') return 'Last 90 days';
  return 'All time';
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  const pct = Math.min(rate * 100, 100);
  return pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
}
