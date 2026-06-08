import { useRef, useState } from 'react';
import { IconUpload, IconTrash, IconLoader2 } from '@tabler/icons-react';
import { uploadToCloudinary } from '../../lib/cloudinary/upload';
import { toast } from '../../lib/toast';
import styles from '@styles/components/settings/AvatarUploader.module.scss';

interface Props {
  /** Current avatar URL, or null to show the initials fallback. */
  currentUrl: string | null;
  /** Initials shown when no avatar (typically first letter of first + last name). */
  fallbackInitials: string;
  /** Fired with the Cloudinary URL after a successful upload. */
  onUpload: (url: string) => void;
  /** Fired when the user clicks Remove. */
  onRemove: () => void;
  /** Disable interaction (e.g. while parent is saving). */
  disabled?: boolean;
}

/* AvatarUploader — feature-profile-settings V1.
   ─────────────────────────────────────────────
   Three render states:
     - Empty:    initials in a primary-tinted circle + "Upload" button
     - Has avatar: image + hover overlay with "Upload new" + "Remove"
     - Uploading: spinner overlay on the current state

   Constraints (frontend-validated; backend doesn't re-validate the
   uploaded file since Cloudinary is doing the upload):
     - image/png, image/jpeg, image/webp, image/gif accepted
     - 5MB max
     - No square-cropping V1 (CSS clips circular)

   Reuses uploadToCloudinary() from src/lib/cloudinary/upload.ts —
   same path as MJML editor image uploads. */
export function AvatarUploader({
  currentUrl, fallbackInitials, onUpload, onRemove, disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const triggerFilePicker = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    /* Reset input so picking the same file twice in a row still fires. */
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload an image file (PNG, JPEG, WebP, or GIF).');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Image is too large. Max 5 MB.`);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onUpload(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.avatar}
        onClick={triggerFilePicker}
        disabled={disabled || uploading}
        aria-label={currentUrl ? 'Change avatar' : 'Upload avatar'}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt=""
            className={styles.image}
            /* If Cloudinary asset disappears, fall back to initials
               gracefully by clearing the src. CSS bg covers. */
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className={styles.initials}>{fallbackInitials}</span>
        )}

        {uploading && (
          <span className={styles.uploadingOverlay} aria-hidden="true">
            <IconLoader2 size={20} className={styles.spinIcon} />
          </span>
        )}
      </button>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={triggerFilePicker}
          disabled={disabled || uploading}
        >
          <IconUpload size={13} />
          {currentUrl ? 'Replace' : 'Upload'}
        </button>
        {currentUrl && (
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            onClick={onRemove}
            disabled={disabled || uploading}
          >
            <IconTrash size={13} /> Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className={styles.hiddenInput}
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;     // 5 MB
