import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { CATEGORIES } from '../categories'

const LIMIT = 20

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runSearch(targetPage) {
    setLoading(true)
    setError('')
    try {
      const params = { page: targetPage, limit: LIMIT }
      if (q) params.q = q
      if (category) params.category = category
      if (date) params.date = date
      const res = await api.get('/search', { params })
      setItems(res.data.data.items)
      setTotal(res.data.data.total)
      setPage(targetPage)
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  // Intentionally runs once on mount only; re-searches happen via handleSubmit/pager, not on q/category/date change.
  useEffect(() => {
    runSearch(1)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    runSearch(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div>
      <h1 className="h3 mb-4">Search lost &amp; found items</h1>

      <form className="row g-2 mb-4" onSubmit={handleSubmit}>
        <div className="col-sm-4">
          <input
            className="form-control"
            placeholder="Search title or description"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="col-sm-3">
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-3">
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            title="The date you lost your item"
          />
        </div>
        <div className="col-sm-2">
          <button className="btn btn-primary w-100">Search</button>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p>Loading…</p>}
      {!loading && items.length === 0 && <p className="text-muted">No items found.</p>}

      <div className="row g-3">
        {items.map((item) => (
          <div className="col-sm-6 col-md-4" key={item.id}>
            <Link to={`/search/${item.id}`} className="card h-100 text-decoration-none text-dark">
              {item.imagePath && (
                <img
                  src={`/${item.imagePath}`}
                  className="card-img-top"
                  alt={item.title}
                  style={{ height: 160, objectFit: 'cover' }}
                />
              )}
              <div className="card-body">
                <h2 className="h6">{item.title}</h2>
                <p className="small text-muted mb-1">
                  {item.category} · {item.locationFound}
                </p>
                <p className="small text-muted mb-0">
                  Found on {new Date(item.dateFound).toLocaleDateString()}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-4">
          <button
            className="btn btn-outline-secondary"
            disabled={page <= 1}
            onClick={() => runSearch(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={() => runSearch(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
