import { clsx } from 'clsx';
const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  info:    'badge-info',
  neutral: 'badge-neutral',
};
const dots = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-brand-500',
  neutral: 'bg-surface-400',
};
export default function Badge({
  variant = 'neutral', dot = true, children, className
}) {
  return (
    <span className={clsx(variants[variant], className)}>
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', dots[variant])} />
      )}
      {children}
    </span>
  );
}