import { clsx } from 'clsx';
export default function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} />;
}
export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}