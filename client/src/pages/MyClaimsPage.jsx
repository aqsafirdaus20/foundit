import { useEffect, useState } from 'react'
import { api } from '../api'
import { STATUS_BADGE } from '../claimStatus'

export default function MyClaimsPage() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/claims/mine', { params: { limit: 100 } })
      .then((res) => setClaims(res.data.data.items))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your claims'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading…</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">My claims</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {!error && claims.length === 0 && (
        <p className="text-muted">You haven't submitted any claims yet.</p>
      )}

      {claims.map((claim) => (
        <div className="card mb-3" key={claim.id}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <h2 className="h6 mb-1">{claim.item.title}</h2>
              <span className={`badge ${STATUS_BADGE[claim.status]}`}>{claim.status}</span>
            </div>
            <p className="small text-muted mb-2">
              Submitted {new Date(claim.createdAt).toLocaleDateString()}
            </p>
            <p className="mb-2">{claim.ownershipDetails}</p>
            <ul className="small mb-2 ps-3">
              {claim.answers.map((a) => (
                <li key={a.id}>
                  {a.question.question} <strong>{a.answer}</strong>
                </li>
              ))}
            </ul>
            {claim.adminNote && (
              <p className="small mb-0">
                <strong>Admin note:</strong> {claim.adminNote}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
