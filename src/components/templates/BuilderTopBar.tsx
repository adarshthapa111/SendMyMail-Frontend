import { Link } from 'react-router-dom';
import {
  IconArrowLeft, IconDeviceDesktop, IconDeviceMobile, IconCode,
  IconEye,
} from '@tabler/icons-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { togglePreview } from '../../store/slices/editorSlice';
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
  const dirty = useAppSelector((s) => s.editor.dirty);

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
        <span className={`${styles.status} ${dirty ? styles.statusDirty : ''}`}>
          <span className={styles.statusDot} />
          {dirty ? 'Unsaved changes' : 'Saved'}
        </span>
      </div>

      {/* ─── Center cluster — device toggle (V1 decorative) ─── */}
      <div className={styles.center}>
        <div className={styles.deviceToggle} role="tablist" aria-label="Device preview">
          <button type="button" className={`${styles.deviceBtn} ${styles.on}`} role="tab" aria-selected="true" title="Desktop">
            <IconDeviceDesktop size={14} /> Desktop
          </button>
          <button
            type="button"
            className={styles.deviceBtn}
            role="tab"
            aria-selected="false"
            disabled
            title="Mobile preview — coming soon"
          >
            <IconDeviceMobile size={14} /> Mobile
          </button>
          <button
            type="button"
            className={styles.deviceBtn}
            role="tab"
            aria-selected="false"
            disabled
            title="HTML source — coming soon"
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
