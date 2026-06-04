import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectNode } from '../store/slices/editorSlice';
import { RenderNode } from '../canvas/renderTree';
import styles from '@styles/components/Canvas.module.css';

/* Editor canvas — pure design surface. Subject + preheader inputs that
   used to live above the canvas (in EmailSettingsBar) moved to Campaign
   (Feature 06) per feature-templates PR 2. The canvas just renders the
   tree being edited. */
export default function Canvas() {
  const dispatch = useAppDispatch();
  const tree = useAppSelector((s) => s.editor.tree);

  return (
    <main className={styles.canvas} onClick={() => dispatch(selectNode(null))}>
      <div className={styles.column} onClick={(e) => e.stopPropagation()}>
        <div className={styles.frame}>
          <RenderNode node={tree} path={[]} />
        </div>
      </div>
    </main>
  );
}
