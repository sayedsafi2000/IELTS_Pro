import { clsx } from 'clsx';
import Spinner from './Spinner';

export default function Button({
  variant = 'primary', size = 'md', loading,
  children, className, ...props
}) {
  const base = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
  }[variant];

  const sizes = {
    sm: 'text-xs px-3 py-2',
    md: '',
    lg: 'text-base px-6 py-3',
  }[size];

  return (
    <button
      className={clsx(base, sizes, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}