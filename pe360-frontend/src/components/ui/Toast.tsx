import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { cn } from '../../utils/cn';

const typeConfig = {
  success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon_color: 'text-green-500' },
  error: { icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon_color: 'text-red-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon_color: 'text-amber-500' },
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon_color: 'text-blue-500' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 p-3.5 rounded-xl border shadow-lg pointer-events-auto toast-enter',
              config.bg
            )}
          >
            <Icon size={18} className={cn('flex-shrink-0 mt-0.5', config.icon_color)} />
            <p className={cn('flex-1 text-sm font-medium leading-snug', config.text)}>
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className={cn('flex-shrink-0 p-0.5 rounded hover:opacity-70', config.text)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
