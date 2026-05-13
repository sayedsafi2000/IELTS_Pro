import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export default function Modal({
  open, onClose, title, children, size = 'md'
}) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" />
        <Dialog.Content className={clsx(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'bg-white dark:bg-surface-800 rounded-2xl shadow-modal',
          'z-50 w-full p-6 animate-slide-up',
          sizes[size]
        )}>
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-surface-900 dark:text-white">
              {title}
            </Dialog.Title>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
              <X className="w-4 h-4 text-surface-400" />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}