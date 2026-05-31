import type { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** The label shown above the input. */
  label?: ReactNode;
  /** Optional small text next to the label, e.g. "(optional)" or "— can't be changed". */
  hint?: ReactNode;
  /** Helper text under the input — neutral tone by default. */
  helper?: ReactNode;
  /** Error message — when set, takes precedence over `helper` and goes red. */
  error?: ReactNode;
  /** Render as success — turns the helper green with a check tone. */
  success?: boolean;
  /** The input element (or any child — Field is layout-only). */
  children: ReactNode;
}

/* Label + helper/error wrapper. Wrap any Input/Textarea/Select with this
   to get consistent vertical rhythm and accessibility labelling. */
export function Field({
  label, hint, helper, error, success, className = '', children, ...rest
}: Props) {
  return (
    <div className={`mb-4 ${className}`} {...rest}>
      {label && (
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="block text-xs font-semibold text-ink">
            {label}
          </label>
          {hint && <span className="text-xs text-soft font-medium">{hint}</span>}
        </div>
      )}

      {children}

      {error ? (
        <div className="mt-1.5 text-xs text-red font-medium">{error}</div>
      ) : helper ? (
        <div className={`mt-1.5 text-xs ${success ? 'text-green-tx font-semibold' : 'text-soft'}`}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}
