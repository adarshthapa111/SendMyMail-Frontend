import { Heading } from '../ui';
import type { OverviewPayload } from '../../lib/api/overview';
import styles from '@styles/components/dashboard/SendingChart.module.scss';

interface Props {
  chart: OverviewPayload['sending_chart'];
}

const VB_W = 720;
const VB_H = 240;
const PAD_L = 40;
const PAD_R = 20;
const PAD_T = 24;
const PAD_B = 40;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

function buildPath(values: number[], max: number): string {
  if (values.length < 2 || max <= 0) return '';
  return values.map((v, i) => {
    const x = PAD_L + (PLOT_W * i) / (values.length - 1);
    const y = PAD_T + PLOT_H - (PLOT_H * v) / max;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function buildAreaPath(values: number[], max: number): string {
  if (values.length < 2 || max <= 0) return '';
  const line = values.map((v, i) => {
    const x = PAD_L + (PLOT_W * i) / (values.length - 1);
    const y = PAD_T + PLOT_H - (PLOT_H * v) / max;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const lastX = (PAD_L + PLOT_W).toFixed(1);
  const baselineY = (PAD_T + PLOT_H).toFixed(1);
  return `${line} L ${lastX} ${baselineY} L ${PAD_L} ${baselineY} Z`;
}

/* Sending performance — two-line SVG chart (sent + opened) over 30 days.
   When series is unavailable (no event ingestion yet), shows EmptyMetric
   with a "Send your first campaign" CTA. */
export function SendingChart({ chart }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <Heading size="md" className={styles.title}>Sending performance</Heading>
          <div className={styles.pmeta}>Sent vs opened · last 30 days</div>
        </div>
        <div className={styles.legend}>
          <span><i className={styles.dotIndigo} /> Sent</span>
          <span><i className={styles.dotTerra} /> Opened</span>
        </div>
      </div>

      {chart.available && chart.series && chart.series.length > 1 ? (
        <ChartSvg series={chart.series} />
      ) : (
        <div className={styles.notAdded}>Not added yet</div>
      )}
    </div>
  );
}

function ChartSvg({ series }: { series: NonNullable<OverviewPayload['sending_chart']['series']> }) {
  const sent   = series.map((p) => p.sent);
  const opened = series.map((p) => p.opened);
  const max    = Math.max(...sent, ...opened, 1);

  // Date ticks: first, ~mid, ~3/4, last
  const lastIdx = series.length - 1;
  const ticks = [0, Math.floor(lastIdx / 3), Math.floor(2 * lastIdx / 3), lastIdx];

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" preserveAspectRatio="none" className={styles.svg}>
      <defs>
        <linearGradient id="dash-sent-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#4B43A8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4B43A8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridlines */}
      <g stroke="rgba(43,38,32,0.05)" strokeWidth="1">
        <line x1={PAD_L} y1={PAD_T}                       x2={VB_W - PAD_R} y2={PAD_T} />
        <line x1={PAD_L} y1={PAD_T + PLOT_H * 0.25}       x2={VB_W - PAD_R} y2={PAD_T + PLOT_H * 0.25} />
        <line x1={PAD_L} y1={PAD_T + PLOT_H * 0.5}        x2={VB_W - PAD_R} y2={PAD_T + PLOT_H * 0.5} />
        <line x1={PAD_L} y1={PAD_T + PLOT_H * 0.75}       x2={VB_W - PAD_R} y2={PAD_T + PLOT_H * 0.75} />
        <line x1={PAD_L} y1={PAD_T + PLOT_H}              x2={VB_W - PAD_R} y2={PAD_T + PLOT_H} />
      </g>

      <path d={buildAreaPath(sent, max)} fill="url(#dash-sent-grad)" />
      <path d={buildPath(sent, max)}   fill="none" stroke="#4B43A8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={buildPath(opened, max)} fill="none" stroke="#C56A33" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* end-of-line dots */}
      <circle
        cx={PAD_L + PLOT_W}
        cy={PAD_T + PLOT_H - (PLOT_H * sent[lastIdx]!) / max}
        r="4.5"
        fill="var(--bg)"
        stroke="#4B43A8"
        strokeWidth="2.5"
      />
      <circle
        cx={PAD_L + PLOT_W}
        cy={PAD_T + PLOT_H - (PLOT_H * opened[lastIdx]!) / max}
        r="4.5"
        fill="var(--bg)"
        stroke="#C56A33"
        strokeWidth="2.5"
      />

      {/* x-axis labels */}
      <g fill="var(--soft)" fontSize="11" textAnchor="middle">
        {ticks.map((i) => {
          const x = PAD_L + (PLOT_W * i) / lastIdx;
          const d = new Date(series[i]!.date_iso);
          const label = i === lastIdx ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return <text key={i} x={x} y={VB_H - 14}>{label}</text>;
        })}
      </g>
    </svg>
  );
}
