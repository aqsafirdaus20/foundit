import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const LIMIT = 20

export default function AdminItemsPage() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(targetPage) {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/items', { params: { page: targetPage, limit: LIMIT } })
      setItems(res.data.data.items)
      setTotal(res.data.data.total)
      setPage(targetPage)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    try {
      await api.delete(`/items/${item.id}`)
      load(page)
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete item')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Report items</h1>
        <Link to="/admin/items/new" className="btn btn-primary">
          Add item
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p>Loading…</p>}

      {!loading && (
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Questions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.category}</td>
                <td>
                  <span className={`badge ${item.status === 'claimed' ? 'bg-success' : 'bg-secondary'}`}>
                    {item.status}
                  </span>
                </td>
                <td>{item.questionCount}</td>
                <td className="text-end">
                  <Link to={`/admin/items/${item.id}`} className="btn btn-sm btn-outline-secondary me-2">
                    Edit
                  </Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => load(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
