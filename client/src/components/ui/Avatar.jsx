import { clsx } from 'clsx';
const gradients = [
  'from-brand-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-teal-500 to-cyan-500',
  'from-green-500 to-emerald-500',
];
export default function Avatar({ name = '', size = 'md', className }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const gradient = gradients[name.charCodeAt(0) % gradients.length];
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };
  return (
    <div className={clsx(
      'rounded-full bg-gradient-to-br flex items-center justify-center font-semibold text-white shrink-0',
      gradient, sizes[size], className
    )}>
      {initials}
    </div>
  );
}