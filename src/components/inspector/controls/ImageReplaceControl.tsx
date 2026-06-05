import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { IconUpload, IconPhoto } from '@tabler/icons-react';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  /** Current image src (HTTPS, data URL, or empty). Used to show a thumbnail. */
  currentSrc: string | undefined;
  /** Called with the file's data URL once read. Caller dispatches setAttr. */
  onPicked: (dataUrl: string) => void;
}

const ACCEPT_MIME = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';
const ACCEPT_SET = new Set(ACCEPT_MIME.split(','));
const MAX_BYTES = 5_000_000; // 5 MB — matches the Cloudinary preset limit

/**
 * Inspector control for picking + replacing an `mj-image` source.
 *
 * Behavior:
 * - File picker via hidden `<input type="file">` (button-triggered).
 * - Drag-and-drop onto the preview area for the same effect.
 * - Validates type + size client-side BEFORE encoding to a data URL —
 *   no point reading a 50 MB file just to reject it.
 * - Writes a data URL into the tree via `onPicked`. The Cloudinary upload
 *   happens later at save time (see `uploadPendingImages`).
 *
 * The "pending" indicator surfaces unsaved local images so the user knows
 * what will be uploaded on save.
 */
export default function ImageReplaceControl({ currentSrc, onPicked }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);

    if (!ACCEPT_SET.has(file.type)) {
      setError(`Unsupported type: ${file.type || 'unknown'}. Use JPG, PNG, GIF, WebP, or SVG.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Too large: ${(file.size / 1_000_000).toFixed(1)} MB. Max ${MAX_BYTES / 1_000_000} MB.`);
      return;
    }

    setReading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      onPicked(dataUrl);
    } catch {
      setError('Could not read the file. Try a different one.');
    } finally {
      setReading(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = ''; // allow picking the same file again later
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const isPending = currentSrc?.startsWith('data:') ?? false;
  const hasSrc = Boolean(currentSrc);

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Image file</span>

      <div
        className={`${styles.imageDrop} ${dragOver ? styles.imageDropOver : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {hasSrc ? (
          <img src={currentSrc} alt="" className={styles.imageDropPreview} />
        ) : (
          <div className={styles.imageDropPlaceholder}>
            <IconPhoto size={28} />
            <span>No image</span>
          </div>
        )}

        <button
          type="button"
          className={styles.imageDropButton}
          onClick={() => inputRef.current?.click()}
          disabled={reading}
        >
          <IconUpload size={13} />
          {reading ? 'Reading…' : hasSrc ? 'Replace' : 'Choose file'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_MIME}
        onChange={onChange}
        style={{ display: 'none' }}
      />

      {isPending && (
        <span className={styles.fieldHint}>
          Local file — will upload on Save.
        </span>
      )}

      {error && (
        <span className={styles.fieldHint} style={{ color: '#d11a2a' }}>
          {error}
        </span>
      )}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('FileReader returned non-string result.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}
