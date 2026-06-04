import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
      <p className="text-slate-600 text-sm max-w-md">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 btn-secondary">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-100">
      <Inbox className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-brand-navy font-medium">{title}</p>
      {hint && <p className="text-sm mt-1 max-w-sm text-center px-4">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'success' | 'warn' | 'neutral' | 'info';
}) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    info: 'bg-teal-50 text-teal-800 border-teal-200',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-md border ${styles[tone]}`}>
      {children}
    </span>
  );
}
