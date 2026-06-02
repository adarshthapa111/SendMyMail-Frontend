import toast from 'react-hot-toast';
import { ApiError } from './api/client';

interface FormToastOptions {
  /** Toast shown while the promise is in flight. */
  loading: string;
  /** Toast shown on resolve. */
  success: string;
  /** If the error has a `field` (server-side validation), call this — no error toast. */
  onFieldError?: (err: ApiError) => void;
  /** Override message for non-field errors (defaults to err.message). */
  errorFallback?: string;
}

/* Wraps a promise with a loading → success / error toast lifecycle.
   If the server returns a field-level error and `onFieldError` is provided,
   we dismiss the loading toast and let the caller render the field error inline
   (no toast — would be redundant).
   Throws the original error so the caller can also do recovery (clear state etc.). */
export async function withFormToast<T>(promise: Promise<T>, opts: FormToastOptions): Promise<T> {
  const id = toast.loading(opts.loading);
  try {
    const result = await promise;
    toast.success(opts.success, { id });
    return result;
  } catch (err) {
    if (err instanceof ApiError && err.field && opts.onFieldError) {
      toast.dismiss(id);
      opts.onFieldError(err);
      throw err;
    }
    const message = err instanceof ApiError
      ? err.message
      : opts.errorFallback ?? 'Something went wrong. Please try again.';
    toast.error(message, { id });
    throw err;
  }
}

/* Re-export react-hot-toast's `toast` for components that need one-shot toasts. */
export { toast };
