import Spinner from './Spinner';
export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
      <Spinner size="lg" className="text-brand-500" />
    </div>
  );
}