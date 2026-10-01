import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// The role is already shown persistently in the Navbar, so it isn't repeated here.
export default function HomePage() {
  const { user } = useAuth()

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 className="h3 mb-4">Welcome, {user.name}</h1>

      {user.role === 'admin' ? (
        <div className="d-flex gap-2">
          <Link to="/admin/items" className="btn btn-primary">
            Report items
          </Link>
          <Link to="/admin/claims" className="btn btn-outline-primary">
            Review claims
          </Link>
        </div>
      ) : (
        <Link to="/search" className="btn btn-primary">
          Search lost &amp; found items
        </Link>
      )}
    </div>
  )
}
