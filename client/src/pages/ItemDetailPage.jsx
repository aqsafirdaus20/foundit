import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'

export default function ItemDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setItem(null)
    setError('')
    api
      .get(`/search/${id}`)
      .then((res) => setItem(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load item'))
  }, [id])

  if (error) {
    return (
      <div>
        <Link to="/search">&larr; Back to search</Link>
        <div className="alert alert-danger mt-3">{error}</div>
      </div>
    )
  }
  if (!item) return <p>Loading…</p>

  return (
    <div>
      <Link to="/search" className="d-inline-block mb-3">
        &larr; Back to search
      </Link>
      <h1 className="h4">{item.title}</h1>
      {item.imagePath && (
        <img src={`/${item.imagePath}`} alt={item.title} className="mb-3 d-block" style={{ maxWidth: 320 }} />
      )}
      <dl className="row">
        <dt className="col-sm-3">Category</dt>
        <dd className="col-sm-9">{item.category}</dd>
        <dt className="col-sm-3">Location found</dt>
        <dd className="col-sm-9">{item.locationFound}</dd>
        <dt className="col-sm-3">Date found</dt>
        <dd className="col-sm-9">{new Date(item.dateFound).toLocaleDateString()}</dd>
        <dt className="col-sm-3">Description</dt>
        <dd className="col-sm-9">{item.description}</dd>
      </dl>

      <h2 className="h6 mt-4">Verification questions</h2>
      <p className="text-muted small">To claim this item you will need to answer these:</p>
      <ul>
        {item.questions.map((question) => (
          <li key={question.id}>{question.question}</li>
        ))}
      </ul>

      <Link to={`/claim/${item.id}`} className="btn btn-primary">
        Claim this item
      </Link>
    </div>
  )
}
