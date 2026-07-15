import { type ReactNode, useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';

/** Поле ввода пароля с кнопкой «показать/скрыть» */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete = 'off',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className="input pr-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 transition-colors hover:text-navy-700"
        aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700" />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-200 bg-white/60 py-12 text-center text-sm text-navy-400">
      {text}
    </div>
  );
}

/** Ошибка загрузки с кнопкой повтора (вместо бесконечного спиннера). */
export function ErrorState({
  text = 'Не удалось загрузить данные. Проверьте интернет.',
  onRetry,
}: {
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="max-w-xs text-sm text-navy-500">{text}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Повторить
        </button>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className={`card my-auto w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
