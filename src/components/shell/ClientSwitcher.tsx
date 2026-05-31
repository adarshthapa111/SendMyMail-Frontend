import { IconSelector } from '@tabler/icons-react';
import styles from '@styles/components/shell/ClientSwitcher.module.scss';

/* Mock active client for the shell PR.
   Replaced by `useActiveClient()` hook + clientsApi when the clients feature lands
   (see doc/architecture/state.md §3). */
const MOCK_CLIENT = {
  ini: 'KS',
  name: 'Khukri Spices',
  grad: 'linear-gradient(145deg,#27B98A,#149068)',
};

export function ClientSwitcher() {
  return (
    <button className={styles.switcher} type="button">
      <span className={styles.av} style={{ background: MOCK_CLIENT.grad }}>
        {MOCK_CLIENT.ini}
      </span>
      {MOCK_CLIENT.name}
      <IconSelector size={14} className={styles.chev} />
    </button>
  );
}
