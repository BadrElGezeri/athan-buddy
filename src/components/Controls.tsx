import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T | null;
  onChange(value: T): void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "segment active" : "segment"}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange(checked: boolean): void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? "toggle active" : "toggle"}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function PrimaryButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button primary ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button secondary ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
