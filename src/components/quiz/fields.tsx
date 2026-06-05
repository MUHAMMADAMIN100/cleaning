import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

/** Подпись над полем */
export function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-medium text-white/80">
      {children}
      {required && <span className="ml-0.5 text-accent-light">*</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white ' +
  'placeholder:text-white/30 transition-colors focus:border-accent/60 focus:bg-white/[0.07] ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/20';

export function TextInput({
  invalid,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={`${inputBase} ${invalid ? '!border-red-400/60 !ring-red-400/20' : ''} ${className}`}
    />
  );
}

export function TextArea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-none ${className}`} />;
}

/** Универсальная карточка-переключатель (radio-подобная) */
export function OptionCard({
  active,
  onClick,
  title,
  subtitle,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
        active
          ? 'border-accent/70 bg-accent/15 shadow-glow'
          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/[0.07]'
      }`}
    >
      {icon && (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
            active ? 'bg-accent/25 text-accent-light' : 'bg-white/5 text-white/60'
          }`}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-semibold text-white">{title}</span>
        {subtitle && (
          <span className="block text-sm text-white/50">{subtitle}</span>
        )}
      </span>
      <span
        className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
          active ? 'border-accent bg-accent' : 'border-white/30'
        }`}
      >
        {active && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
    </button>
  );
}
