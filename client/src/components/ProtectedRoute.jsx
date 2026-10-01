import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Navbar from './Navbar'

// Wrap a route's element: `<ProtectedRoute><Page /></ProtectedRoute>`,
// or `<ProtectedRoute adminOnly><Page /></ProtectedRoute>` for admin-only pages.
// Also renders the shared Navbar + page container, so every logged-in page
// gets them for free without repeating a layout wrapper on each route.
export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) return <p className="text-center mt-5">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <>
      <Navbar />
      <div className="container">{children}</div>
    </>
  )
}
