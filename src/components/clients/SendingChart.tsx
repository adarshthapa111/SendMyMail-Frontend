import { useMemo } from 'react';
import styles from '@styles/components/clients/SendingChart.module.scss';

interface Point {
  date_iso: string;
  sent:     number;
  opened:   number;
}

interface Props {
  series: Point[];
  height?: number;
}

/* Tiny SVG dual-line chart. No dependency — drawn from scaled
   coordinates. Two lines (sent + opened), filled area under sent,
   subtle gridlines + endpoint dots. Skips rendering if no data.

   Implementation choice: pure SVG keeps the bundle small. If we add
   chart interactions later (tooltip on hover, zoom), swap to
   recharts/visx then. */

const VIEWBOX_W = 600;
const PADDING   = { top: 12, right: 8, bottom: 22, left: 28 };

export function SendingChart({ series, height = 200 }: Props) {
  const VIEWBOX_H = height;
  const innerW    = VIEWBOX_W - PADDING.left - PADDING.right;
  const innerH    = VIEWBOX_H - PADDING.top  - PADDING.bottom;

  const { sentPath, openedPath, sentArea, maxY, gridLines, xLabels } = useMemo(() => {
    if (series.length === 0) {
      return {
        sentPath: '', openedPath: '', sentArea: '',
        maxY: 0, gridLines: [], xLabels: [],
      };
    }

    /* Y scale: round up to nearest "nice" number so the gridlines have
       readable labels. 0-12 → 0-15; 25 → 30; 280 → 300; etc. */
    const peak = Math.max(1, ...series.map((p) => Math.max(p.sent, p.opened)));
    const max  = niceCeil(peak);

    const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;
    const y = (v: number) => PADDING.top + innerH * (1 - v / max);
    const x = (i: number) => PADDING.left + i * stepX;

    const sentPath   = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.sent).toFixed(1)}`).join(' ');
    const openedPath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.opened).toFixed(1)}`).join(' ');

    /* Area under the sent line. */
    const lastX = x(series.length - 1).toFixed(1);
    const sentArea = `${sentPath} L ${lastX} ${(PADDING.top + innerH).toFixed(1)} L ${PADDING.left.toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} Z`;

    /* 4 horizontal gridlines (0, ⅓, ⅔, 1). */
    const gridLines = [0, 1, 2, 3].map((i) => {
      const v = (max / 3) * i;
      return { y: y(v), label: i === 0 ? '0' : formatAxis(v) };
    });

    /* X-axis: first / middle / last labels only, to avoid clutter. */
    const xLabels: Array<{ x: number; label: string }> = [];
    if (series.length > 0) {
      xLabels.push({ x: x(0),                     label: formatShortDate(series[0].date_iso) });
      if (series.length > 2) {
        const mid = Math.floor(series.length / 2);
        xLabels.push({ x: x(mid), label: formatShortDate(series[mid].date_iso) });
      }
      xLabels.push({ x: x(series.length - 1),     label: formatShortDate(series[series.length - 1].date_iso) });
    }

    return { sentPath, openedPath, sentArea, maxY: max, gridLines, xLabels };
  }, [series, innerH, innerW]);

  if (series.length === 0) {
    return <div className={styles.empty}>No sends in this range.</div>;
  }

  return (
    <div className={styles.chartWrap}>
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className={styles.svg}
        preserveAspectRatio="none"
      >
        {/* Gridlines + Y labels */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={VIEWBOX_W - PADDING.right}
              y1={g.y}
              y2={g.y}
              className={styles.gridLine}
            />
            <text
              x={PADDING.left - 6}
              y={g.y}
              dy="0.35em"
              textAnchor="end"
              className={styles.axisLabel}
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* Sent area */}
        <path d={sentArea}  className={styles.sentArea} />
        {/* Sent line */}
        <path d={sentPath}  className={styles.sentLine} />
        {/* Opened line */}
        <path d={openedPath} className={styles.openedLine} />

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={VIEWBOX_H - 4}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
            className={styles.axisLabel}
          >
            {xl.label}
          </text>
        ))}
      </svg>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendSent}`} />
          <span>Sent</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendOpened}`} />
          <span>Opened</span>
        </div>
        <span className={styles.legendMax}>peak {formatAxis(maxY)}/day</span>
      </div>
    </div>
  );
}

function niceCeil(n: number): number {
  if (n <= 1)    return 1;
  if (n <= 10)   return Math.ceil(n / 2) * 2;
  if (n <= 100)  return Math.ceil(n / 10) * 10;
  if (n <= 1000) return Math.ceil(n / 50) * 50;
  return Math.ceil(n / 100) * 100;
}

function formatAxis(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return Math.round(n).toString();
}

function formatShortDate(iso: string): string {
  /* iso is yyyy-mm-dd. Display as "Mar 5". */
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
