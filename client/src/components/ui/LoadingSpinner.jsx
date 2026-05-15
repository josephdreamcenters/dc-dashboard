export default function LoadingSpinner({ size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'
  return (
    <div className={`animate-spin rounded-full border-4 border-warm-200 border-t-primary-600 ${sizeClass}`} />
  )
}
