import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setView } from '../../store/slices/appSlice';
import {
  hydrateConnections,
  setFilter,
  setSearch,
  type IntegrationsFilter,
} from '../../store/slices/integrationsSlice';
import { platformRegistry, type PlatformDef } from '../../integrations/registry';
import { loadAllConnections } from '../../integrations/credentials';
import PlatformCard from './PlatformCard';
import ConnectModal from './ConnectModal';
import WebhookModal from './WebhookModal';
import SetupModal from './SetupModal';
import styles from '@styles/components/integrations/IntegrationsScreen.module.css';

const FILTERS: Array<{ id: IntegrationsFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'connected', label: 'Connected' },
  { id: 'available', label: 'Available' },
];

export default function IntegrationsScreen() {
  const dispatch = useAppDispatch();
  const search = useAppSelector((s) => s.integrations.search);
  const filter = useAppSelector((s) => s.integrations.filter);
  const connections = useAppSelector((s) => s.integrations.connections);

  const [openPlatform, setOpenPlatform] = useState<PlatformDef | null>(null);

  // Rehydrate connection metadata from localStorage on mount.
  useEffect(() => {
    dispatch(hydrateConnections(loadAllConnections()));
  }, [dispatch]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.values(platformRegistry)
      .filter((def) => {
        const isConnected = connections[def.id]?.status === 'connected';
        if (filter === 'connected' && !isConnected) return false;
        if (filter === 'available' && isConnected) return false;
        if (q && !def.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        // Connected first, then alphabetical.
        const aCon = connections[a.id]?.status === 'connected' ? 0 : 1;
        const bCon = connections[b.id]?.status === 'connected' ? 0 : 1;
        if (aCon !== bCon) return aCon - bCon;
        return a.name.localeCompare(b.name);
      });
  }, [search, filter, connections]);

  const totalConnected = Object.values(connections).filter((c) => c.status === 'connected').length;

  const renderModal = () => {
    if (!openPlatform) return null;
    const close = () => setOpenPlatform(null);
    if (openPlatform.tier === 1) return <ConnectModal def={openPlatform} onClose={close} />;
    if (openPlatform.tier === 4) return <WebhookModal def={openPlatform} onClose={close} />;
    return <SetupModal def={openPlatform} onClose={close} />;
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => dispatch(setView('editor'))}
        >
          ← Back to editor
        </button>
        <h1 className={styles.title}>Integrations</h1>
        <div className={styles.headerMeta}>
          {totalConnected} connected · {Object.keys(platformRegistry).length} available
        </div>
      </header>

      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search platforms…"
          value={search}
          onChange={(e) => dispatch(setSearch(e.target.value))}
          aria-label="Search integrations"
        />
        <div className={styles.filterChips} role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`${styles.chip} ${filter === f.id ? styles.chipActive : ''}`}
              onClick={() => dispatch(setFilter(f.id))}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <main className={styles.body}>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            No platforms match{search ? ` “${search}”` : ' this filter'}.
          </div>
        ) : (
          <div className={styles.grid}>
            {visible.map((def) => (
              <PlatformCard key={def.id} def={def} onAction={setOpenPlatform} />
            ))}
          </div>
        )}
      </main>

      {renderModal()}
    </div>
  );
}
