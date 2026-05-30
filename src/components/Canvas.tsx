import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectNode } from '../store/slices/editorSlice';
import { RenderNode } from '../canvas/renderTree';
import EmailSettingsBar from './EmailSettingsBar';
import styles from '@styles/components/Canvas.module.css';

export default function Canvas() {
  const dispatch = useAppDispatch();
  const tree = useAppSelector((s) => s.editor.tree);

  return (
    <main className={styles.canvas} onClick={() => dispatch(selectNode(null))}>
      <div className={styles.column} onClick={(e) => e.stopPropagation()}>
        <EmailSettingsBar />
        <div className={styles.frame}>
          <RenderNode node={tree} path={[]} />
        </div>
      </div>
    </main>
  );
}
