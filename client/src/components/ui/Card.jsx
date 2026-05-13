import { clsx } from 'clsx';
export default function Card({
  children, className, interactive, elevated, ...props
}) {
  return (
    <div className={clsx(
      'card',
      interactive && 'card-interactive',
      elevated && 'shadow-card',
      className
    )} {...props}>
      {children}
    </div>
  );
}