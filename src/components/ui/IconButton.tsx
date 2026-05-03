import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  active?: boolean;
  danger?: boolean;
}

export function IconButton({
  label,
  icon,
  active = false,
  danger = false,
  className = '',
  ...props
}: IconButtonProps) {
  const stateClass = active ? 'icon-button--active' : '';
  const dangerClass = danger ? 'icon-button--danger' : '';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-button ${stateClass} ${dangerClass} ${className}`.trim()}
      {...props}
    >
      {icon}
    </button>
  );
}
