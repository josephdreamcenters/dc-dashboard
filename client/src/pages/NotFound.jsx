import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center">
      <h2 className="text-3xl font-bold text-warm-700 mb-2">404</h2>
      <p className="text-warm-500 mb-4">Page not found</p>
      <Link to="/" className="btn-primary">Go to Dashboard</Link>
    </div>
  )
}
