export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-surface-400" />
        </div>
      )}
      <h3 className="font-medium text-surface-900 dark:text-surface-100 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 dark:text-surface-400 max-w-xs mb-5">{description}</p>
      {action}
    </div>
  );
}