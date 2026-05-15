import clsx from 'clsx'

const variants = {
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-blue-100 text-blue-800',
  warm:   'bg-warm-100 text-warm-700',
  accent: 'bg-accent-100 text-accent-800',
}

export default function Badge({ variant = 'warm', children, className }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
