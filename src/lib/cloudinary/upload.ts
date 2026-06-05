/**
 * Direct-from-browser Cloudinary upload via the **unsigned** upload API.
 *
 * Why browser-direct (no backend involvement):
 * - Less infra: no upload endpoint, no streaming-through-our-server,
 *   no temporary storage, no IAM credentials in the backend.
 * - Faster for the user: file goes straight to Cloudinary's regional
 *   edge, doesn't bounce off our origin.
 * - Cheaper: no bandwidth through us at upload time.
 *
 * Why this is safe even though the cloud name + preset are exposed in
 * client code:
 * - The preset (configured in the Cloudinary dashboard) is what enforces
 *   the rules: allowed file types, max file size, target folder.
 *   Anyone using the preset name is constrained by the same rules.
 * - The cloud name is the public delivery identifier — it appears in
 *   every delivery URL recipients load anyway.
 * - For abuse-sensitive deployments, gate access at the application
 *   layer (require auth before showing the upload UI) and rotate the
 *   preset if quota is consumed by drive-by abuse.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/** Subset of Cloudinary's upload response — we only need `secure_url`. */
interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: { message?: string };
}

/**
 * Upload a `File` or `Blob` to Cloudinary. Returns the public HTTPS URL.
 *
 * @throws Error if env vars are unset, the network fails, or Cloudinary
 * rejects (the error message includes Cloudinary's reason when available).
 */
export async function uploadToCloudinary(file: File | Blob): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and ' +
      'VITE_CLOUDINARY_UPLOAD_PRESET in .env.local.',
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  let res: Response;
  try {
    res = await fetch(endpoint, { method: 'POST', body: formData });
  } catch (err) {
    throw new Error(
      `Network error uploading to Cloudinary: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  let body: CloudinaryUploadResponse;
  try {
    body = await res.json() as CloudinaryUploadResponse;
  } catch {
    throw new Error(`Cloudinary returned non-JSON response (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const reason = body.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Cloudinary upload failed: ${reason}`);
  }

  if (!body.secure_url) {
    throw new Error('Cloudinary response missing secure_url.');
  }

  return body.secure_url;
}

/**
 * Upload a data URL (e.g. `data:image/jpeg;base64,...`). Converts to a
 * Blob via `fetch()` (browser-native, no manual base64 decoding) and
 * delegates to `uploadToCloudinary`.
 */
export async function uploadDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) {
    throw new Error('uploadDataUrl: expected a data: URL.');
  }
  const blob = await (await fetch(dataUrl)).blob();
  return uploadToCloudinary(blob);
}
