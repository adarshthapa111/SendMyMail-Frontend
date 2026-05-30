import styles from '@styles/canvas/DragChip.module.css';

/**
 * Rendered inside <DragOverlay> while a palette item is being dragged.
 * Replaces the browser's default ghost (opacity-50 clone of the source).
 */
export default function DragChip({ label }: { label: string }) {
  return (
    <div className={styles.chip}>
      <span className={styles.dot} />
      <span>Adding {label}…</span>
    </div>
  );
}
