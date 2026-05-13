import { clsx } from 'clsx';
export default function Input({
  label, error, helper, leftIcon, rightIcon, className, ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            {leftIcon}
          </span>
        )}
        <input
          className={clsx(
            'input',
            leftIcon  && 'pl-9',
            rightIcon && 'pr-9',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
            {rightIcon}
          </span>
        )}
      </div>
      {error  && <p className="text-xs text-red-500">{error}</p>}
      {helper && !error && (
        <p className="text-xs text-surface-400">{helper}</p>
      )}
    </div>
  );
}