import toast from 'react-hot-toast';
import { createElement, Fragment } from 'react';
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

/* ─── successWithUndo — toast with an Undo action ─────────────────────
   feature-perceived-performance V1. Used by destructive mutations
   (archive, suppress, etc.) so the user has a 6-second window to
   roll back. Standard SaaS pattern (Linear, Gmail, Slack).

   Usage:
     successWithUndo('Archived', () => unarchive(id));

   Behavior:
     - Toast shows the message + an Undo button
     - Default duration 6s; configurable
     - Clicking Undo: dismisses the toast, calls the handler, no
       further confirmation toast (the handler can fire its own)
     - If the toast dismisses without click: nothing happens
     - The handler is fire-and-forget; errors should be caught by
       the caller and surfaced with toast.error() */
interface UndoToastOpts {
  duration?: number;       // ms; default 6000
  undoLabel?: string;      // default 'Undo'
}

export function successWithUndo(
  message: string,
  onUndo: () => void,
  opts: UndoToastOpts = {},
): string {
  const { duration = 6000, undoLabel = 'Undo' } = opts;

  const id = toast.success(
    (t) => createElement(Fragment, null,
      createElement('span', null, message),
      createElement('button', {
        type: 'button',
        onClick: () => {
          toast.dismiss(t.id);
          onUndo();
        },
        style: {
          marginLeft: 14,
          padding: '4px 10px',
          background: 'transparent',
          border: '1px solid var(--color-line)',
          borderRadius: 6,
          color: 'var(--color-primary)',
          font: 'inherit',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
        },
      }, undoLabel),
    ),
    { duration },
  );

  return id;
}

/* Re-export react-hot-toast's `toast` for components that need one-shot toasts. */
export { toast };
