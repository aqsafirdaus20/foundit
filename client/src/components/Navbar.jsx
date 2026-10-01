import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <nav className="navbar navbar-expand bg-light border-bottom mb-4">
      <div className="container">
        <Link className="navbar-brand" to="/">
          FoundIt
        </Link>
        <div className="navbar-nav me-auto">
          <Link className="nav-link" to="/search">
            Search
          </Link>
          {!isAdmin && (
            <Link className="nav-link" to="/my-claims">
              My claims
            </Link>
          )}
          {isAdmin && (
            <>
              <Link className="nav-link" to="/admin/items">
                Report items
              </Link>
              <Link className="nav-link" to="/admin/claims">
                Review claims
              </Link>
            </>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">
            {user?.name} ({user?.role})
          </span>
          <button className="btn btn-sm btn-outline-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </nav>
  )
}
