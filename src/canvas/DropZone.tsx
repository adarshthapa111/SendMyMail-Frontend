import { useDroppable } from '@dnd-kit/core';
import type { NodePath } from '../tree/types';
import type { BlockCategory } from '../blocks/categories';
import { CONTAINER_ACCEPTS } from '../blocks/categories';
import styles from '@styles/canvas/DropZone.module.css';

export interface DropZoneData {
  target: 'dropZone';
  parentPath: NodePath;
  parentTag: string;
  index: number;
  accepts: BlockCategory[];
}

interface Props {
  parentPath: NodePath;
  parentTag: string;
  index: number;
  /**
   * Use the larger hint-style drop zone (renders the "Drag a block here"
   * placeholder). Pass for the sole drop zone shown when a container is empty.
   */
  large?: boolean;
}

/**
 * Reads category from the active drag's data. Palette drags and canvas drags
 * both encode category directly, so we don't need to know the source.
 */
function readDraggedCategory(active: { data: { current?: unknown } } | null | undefined): BlockCategory | undefined {
  const data = active?.data.current as { category?: BlockCategory } | undefined;
  return data?.category;
}

export default function DropZone({ parentPath, parentTag, index, large = false }: Props) {
  const accepts = CONTAINER_ACCEPTS[parentTag] ?? [];

  const id = `dz-${parentTag}-${parentPath.join('-')}-${index}`;
  const data: DropZoneData = { target: 'dropZone', parentPath, parentTag, index, accepts };

  const { setNodeRef, isOver, active } = useDroppable({ id, data });

  const draggedCategory = readDraggedCategory(active);

  const directlyAccepts = draggedCategory ? accepts.includes(draggedCategory) : false;
  // Auto-wrap exception: a 'content' block dropped into mj-body wraps in a section.
  const autoWrappable = parentTag === 'mj-body' && draggedCategory === 'content';
  // Section bubble-up (feature-section-library V1): a 'section' block
  // dropped inside an existing section inserts AFTER it at body level
  // (see EditorBody.onDragEnd) — so show these zones as valid, not red.
  const sectionBubble = draggedCategory === 'section' && parentPath.length >= 4;
  const canDrop = directlyAccepts || autoWrappable || sectionBubble;

  if (large) {
    let stateClass = '';
    if (active && isOver && canDrop) stateClass = styles.largeOver;
    else if (active && isOver && !canDrop) stateClass = styles.largeRejected;
    else if (active && canDrop) stateClass = styles.largeActive;
    return (
      <div ref={setNodeRef} className={`${styles.large} ${stateClass}`}>
        Drag a block here
      </div>
    );
  }

  let barStateClass = '';
  if (active && isOver && canDrop) barStateClass = styles.barOver;
  else if (active && isOver && !canDrop) barStateClass = styles.barRejected;
  else if (active && canDrop) barStateClass = styles.barActive;

  /* Body-level zones (between sections) collapse to zero visible gap so
     sections touch seamlessly like the compiled email; zones inside
     columns keep a small visible gap so there's a place to aim drops. */
  const levelClass = parentTag === 'mj-body' ? styles.hitAreaSeamless : '';

  return (
    <div ref={setNodeRef} className={`${styles.hitArea} ${levelClass} ${active ? styles.armed : ''}`}>
      <div className={`${styles.bar} ${barStateClass}`} />
    </div>
  );
}
