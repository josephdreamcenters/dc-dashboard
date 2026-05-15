import clsx from 'clsx'

export default function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button
      className={clsx(
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        variant === 'accent' && 'btn-accent',
        variant === 'danger' && 'inline-flex items-center justify-center px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'lg' && 'px-6 py-3 text-base',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
