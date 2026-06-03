import {
  IconUsersGroup,
  IconSend,
  IconMailOpened,
  IconPlant2,
} from '@tabler/icons-react';
import { KPITile } from './KPITile';
import type { OverviewPayload } from '../../lib/api/overview';
import styles from '@styles/components/dashboard/KPIRow.module.scss';

interface Props {
  kpis: OverviewPayload['kpis'];
}

/* Four-up KPI grid — Active clients / Emails sent / Avg open rate / Revenue.
   Active clients is the only metric with a real value in V1; the others
   render <EmptyMetric inline /> until event ingestion (Feature 10) ships. */
export function KPIRow({ kpis }: Props) {
  return (
    <div className={styles.grid}>
      <KPITile
        icon={<IconUsersGroup size={15} />}
        label="Active clients"
        metric={kpis.active_clients}
        format="integer"
      />
      <KPITile
        icon={<IconSend size={15} />}
        label="Emails sent"
        metric={kpis.emails_sent}
        format="integer"
      />
      <KPITile
        icon={<IconMailOpened size={15} />}
        label="Avg open rate"
        metric={kpis.open_rate}
        format="percent"
      />
      <KPITile
        icon={<IconPlant2 size={15} />}
        label="Revenue tracked"
        metric={kpis.revenue}
        format="currency-npr"
        accent
      />
    </div>
  );
}
