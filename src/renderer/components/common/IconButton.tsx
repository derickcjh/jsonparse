import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  active?: boolean
}

export function IconButton({ icon, label, active, className = '', ...props }: IconButtonProps): JSX.Element {
  return (
    <button
      title={label}
      aria-label={label}
      className={`
        relative p-2 rounded-lg transition-all duration-200 ease-out
        ${active
          ? 'bg-accent/15 text-accent shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-200'
        }
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
        active:scale-95
        ${className}
      `}
      {...props}
    >
      {icon}
      {active && (
        <span className="absolute inset-0 rounded-lg ring-1 ring-accent/30" />
      )}
    </button>
  )
}
