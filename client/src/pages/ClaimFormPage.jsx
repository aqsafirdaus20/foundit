import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

export default function ClaimFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [answers, setAnswers] = useState({}) // questionId -> answer text
  const [ownershipDetails, setOwnershipDetails] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .get(`/search/${id}`)
      .then((res) => setItem(res.data.data))
      .catch((err) => setLoadError(err.response?.data?.message || 'Could not load item'))
  }, [id])

  function updateAnswer(questionId) {
    return (e) => setAnswers((a) => ({ ...a, [questionId]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/claims', {
        itemId: Number(id),
        ownershipDetails,
        answers: item.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] || '' })),
      })
      navigate('/my-claims')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit claim')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div>
        <Link to="/search">&larr; Back to search</Link>
        <div className="alert alert-danger mt-3">{loadError}</div>
      </div>
    )
  }
  if (!item) return <p>Loading…</p>

  return (
    <div style={{ maxWidth: 560 }}>
      <Link to={`/search/${id}`} className="d-inline-block mb-3">
        &larr; Back to item
      </Link>
      <h1 className="h4 mb-3">Claim: {item.title}</h1>
      <p className="text-muted small">
        Answer every question below and explain why this item is yours. An admin will review your
        answers against the item's records.
      </p>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        {item.questions.map((q) => (
          <div className="mb-3" key={q.id}>
            <label className="form-label">{q.question}</label>
            <input
              className="form-control"
              value={answers[q.id] || ''}
              onChange={updateAnswer(q.id)}
              required
            />
          </div>
        ))}
        <div className="mb-3">
          <label className="form-label">
            Why is this yours? (describe marks, contents, how you lost it...)
          </label>
          <textarea
            className="form-control"
            rows={4}
            value={ownershipDetails}
            onChange={(e) => setOwnershipDetails(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit claim'}
        </button>
      </form>
    </div>
  )
}
