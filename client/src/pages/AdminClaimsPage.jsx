import { useEffect, useState } from 'react'
import { api } from '../api'
import { STATUS_BADGE } from '../claimStatus'

const FILTERS = ['pending', 'approved', 'rejected', 'all']

export default function AdminClaimsPage() {
  const [filter, setFilter] = useState('pending')
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(status) {
    setLoading(true)
    setError('')
    try {
      const params = { limit: 100 }
      if (status !== 'all') params.status = status
      const res = await api.get('/claims', { params })
      setClaims(res.data.data.items)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load claims')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(filter)
    // eslint side note: intentional — reruns only when the filter itself changes.
  }, [filter])

  async function review(claim, status) {
    const adminNote = window.prompt(`Admin note for this ${status} decision (optional):`, '') || undefined
    try {
      await api.patch(`/claims/${claim.id}`, { status, adminNote })
      load(filter)
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update claim')
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="h3 mb-4">Review claims</h1>

      <div className="btn-group mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p>Loading…</p>}
      {!loading && claims.length === 0 && <p className="text-muted">No claims here.</p>}

      {claims.map((claim) => (
        <div className="card mb-3" key={claim.id}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <h2 className="h6 mb-1">
                {claim.item.title} <span className="text-muted small">({claim.item.category})</span>
              </h2>
              <span className={`badge ${STATUS_BADGE[claim.status]}`}>{claim.status}</span>
            </div>
            <p className="small text-muted mb-2">
              Claimed by {claim.claimant.name} ({claim.claimant.username}) on{' '}
              {new Date(claim.createdAt).toLocaleDateString()}
            </p>
            <p className="mb-2">{claim.ownershipDetails}</p>

            <table className="table table-sm mb-2">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Submitted answer</th>
                  <th>Correct answer</th>
                </tr>
              </thead>
              <tbody>
                {claim.answers.map((a) => {
                  const matches = a.answer.trim().toLowerCase() === a.question.answer.trim().toLowerCase()
                  return (
                    <tr key={a.id}>
                      <td>{a.question.question}</td>
                      <td className={matches ? 'text-success' : 'text-danger'}>{a.answer}</td>
                      <td>{a.question.answer}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {claim.adminNote && (
              <p className="small mb-2">
                <strong>Admin note:</strong> {claim.adminNote}
              </p>
            )}

            {claim.status === 'pending' && (
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-success" onClick={() => review(claim, 'approved')}>
                  Approve
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => review(claim, 'rejected')}>
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
