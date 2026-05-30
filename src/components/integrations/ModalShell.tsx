import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import PlatformIcon from './PlatformIcon';
import type { PlatformDef } from '../../integrations/registry';
import styles from '@styles/components/integrations/Modal.module.css';

interface Props {
  def: PlatformDef;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Shared chrome for all integration modals: portal, backdrop click-to-close,
 * Esc to close, header with platform icon, scrollable body, sticky footer.
 */
export default function ModalShell({ def, subtitle, onClose, children, footer }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${def.name} settings`}
    >
      <div className={styles.modal}>
        <header className={styles.head}>
          <PlatformIcon def={def} />
          <div className={styles.headText}>
            <div className={styles.headTitle}>{def.name}</div>
            <div className={styles.headSubtitle}>{subtitle}</div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            ✕
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        <footer className={styles.foot}>{footer}</footer>
      </div>
    </div>,
    document.body
  );
}
