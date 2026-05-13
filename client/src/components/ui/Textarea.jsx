import { clsx } from 'clsx';
export default function Textarea({
  label, error, helper, className, ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'input resize-none',
          error && 'border-red-400 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {error  && <p className="text-xs text-red-500">{error}</p>}
      {helper && !error && (
        <p className="text-xs text-surface-400">{helper}</p>
      )}
    </div>
  );
}