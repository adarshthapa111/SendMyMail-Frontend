import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowLeft, IconDeviceDesktop, IconDeviceMobile, IconCode,
  IconEye,
} from '@tabler/icons-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { togglePreview, setCanvasViewport } from '../../store/slices/editorSlice';
import { BuilderInlineName } from './BuilderInlineName';
import { BuilderMoreMenu } from './BuilderMoreMenu';
import { SaveTemplateButton } from './SaveTemplateButton';
import { TestSendButton } from './TestSendButton';
import styles from '@styles/components/templates/BuilderTopBar.module.scss';

interface Props {
  clientId: string;
  templateId: string;
  templateName: string;
  category: string | null;
  onNameChange: (next: string) => void;
}

/* The focused-editor top bar — replaces the legacy Toolbar for the template
   builder. Three-cluster layout (left / center / right), matches
   doc/mockups/builder.html.

   - Left: ← Templates back link · template name (inline rename) · save status
   - Center: device toggle pill (V1 decorative; functional in a follow-up)
   - Right: Send test · Preview · Save · More menu */
export function BuilderTopBar({ clientId, templateId, templateName, category, onNameChange }: Props) {
  const dispatch = useAppDispatch();
  const dirty       = useAppSelector((s) => s.editor.dirty);
  const lastSavedAt = useAppSelector((s) => s.editor.lastSavedAt);
  const viewport    = useAppSelector((s) => s.editor.canvasViewport);

  /* feature-editor-premium-polish V1 — "Saved 2s ago" relative time.
     Re-renders every 5s while the page is visible. */
  const relativeSaved = useRelativeSaved(lastSavedAt);

  return (
    <header className={styles.bar}>
      {/* ─── Left cluster ─── */}
      <div className={styles.left}>
        <Link to={`/clients/${clientId}/templates`} className={styles.back}>
          <IconArrowLeft size={16} /> Templates
        </Link>
        <span className={styles.sep} aria-hidden="true" />
        <BuilderInlineName
          clientId={clientId}
          templateId={templateId}
          name={templateName}
          category={category}
          onChange={onNameChange}
        />
        <span className={styles.sep} aria-hidden="true" />
        <span
          className={`${styles.status} ${dirty ? styles.statusDirty : ''}`}
          title={dirty ? 'You have unsaved changes' : relativeSaved.tooltip}
        >
          <span className={styles.statusDot} />
          {dirty
            ? 'Unsaved changes'
            : relativeSaved.label /* "Saved · 2s ago" or "Saved" if never saved this session */}
        </span>
      </div>

      {/* ─── Center cluster — device toggle.
            feature-editor-premium-polish V1 wires Desktop + Mobile to
            the real canvasViewport slice. HTML stays as a placeholder
            (PreviewModal handles that mode). ─── */}
      <div className={styles.center}>
        <div className={styles.deviceToggle} role="tablist" aria-label="Device preview">
          <button
            type="button"
            className={`${styles.deviceBtn} ${viewport === 'desktop' ? styles.on : ''}`}
            role="tab"
            aria-selected={viewport === 'desktop'}
            title="Desktop view"
            onClick={() => dispatch(setCanvasViewport('desktop'))}
          >
            <IconDeviceDesktop size={14} /> Desktop
          </button>
          <button
            type="button"
            className={`${styles.deviceBtn} ${viewport === 'mobile' ? styles.on : ''}`}
            role="tab"
            aria-selected={viewport === 'mobile'}
            title="Mobile view (375px wide)"
            onClick={() => dispatch(setCanvasViewport('mobile'))}
          >
            <IconDeviceMobile size={14} /> Mobile
          </button>
          <button
            type="button"
            className={styles.deviceBtn}
            role="tab"
            aria-selected="false"
            onClick={() => dispatch(togglePreview())}
            title="HTML source — opens preview"
          >
            <IconCode size={14} /> HTML
          </button>
        </div>
      </div>

      {/* ─── Right cluster ─── */}
      <div className={styles.right}>
        <TestSendButton
          clientId={clientId}
          templateId={templateId}
          templateName={templateName}
        />
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => dispatch(togglePreview())}
          title="Preview the rendered email"
        >
          <IconEye size={15} /> Preview
        </button>
        <SaveTemplateButton
          clientId={clientId}
          templateId={templateId}
          templateName={templateName}
        />
        <BuilderMoreMenu
          clientId={clientId}
          templateId={templateId}
          templateName={templateName}
        />
      </div>
    </header>
  );
}

/* ─── useRelativeSaved ──────────────────────────────────────────────
   feature-editor-premium-polish V1 — relative-time formatter for the
   topbar save indicator. Holds `now` in state and updates it every 5s
   via setInterval so the rendered label moves
   ("Saved · just now" → "5s ago" → "1m ago"). The render path stays
   pure — Date.now() only fires inside the effect. Pauses when tab is
   hidden (saves battery + avoids stale React state). */
function useRelativeSaved(timestamp: number | null): { label: string; tooltip: string } {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!timestamp) return;
    const tick = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [timestamp]);

  if (!timestamp) {
    return { label: 'Saved', tooltip: 'No changes saved this session yet' };
  }

  const diffMs = Math.max(0, now - timestamp);
  const secs   = Math.floor(diffMs / 1000);

  let rel: string;
  if (secs < 5)       rel = 'just now';
  else if (secs < 60) rel = `${secs}s ago`;
  else {
    const mins = Math.floor(secs / 60);
    if (mins < 60) rel = `${mins}m ago`;
    else {
      const hrs = Math.floor(mins / 60);
      rel = `${hrs}h ago`;
    }
  }

  const tooltip = new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  });

  return { label: `Saved · ${rel}`, tooltip: `Last saved at ${tooltip}` };
}
