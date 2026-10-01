import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { CATEGORIES } from '../categories'

const emptyQuestion = () => ({ question: '', answer: '' })

function QuestionRows({ questions, onChange }) {
  function update(index, field, value) {
    onChange(questions.map((q, i) => (i === index ? { ...q, [field]: value } : q)))
  }
  function remove(index) {
    onChange(questions.filter((_, i) => i !== index))
  }
  function add() {
    onChange([...questions, emptyQuestion()])
  }

  return (
    <>
      {questions.map((q, i) => (
        <div className="row g-2 mb-2" key={i}>
          <div className="col-sm-5">
            <input
              className="form-control"
              placeholder="Question"
              value={q.question}
              onChange={(e) => update(i, 'question', e.target.value)}
              required
            />
          </div>
          <div className="col-sm-5">
            <input
              className="form-control"
              placeholder="Answer"
              value={q.answer}
              onChange={(e) => update(i, 'answer', e.target.value)}
              required
            />
          </div>
          <div className="col-sm-2">
            <button
              type="button"
              className="btn btn-outline-danger w-100"
              onClick={() => remove(i)}
              disabled={questions.length <= 1}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-outline-secondary btn-sm mb-3" onClick={add}>
        + Add question
      </button>
    </>
  )
}

export default function AdminItemFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [details, setDetails] = useState({
    title: '',
    category: CATEGORIES[0],
    description: '',
    locationFound: '',
    dateFound: '',
  })
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [item, setItem] = useState(null) // edit mode: the loaded item (for status/imagePath)
  const [loading, setLoading] = useState(isEdit)
  const [detailsMsg, setDetailsMsg] = useState({ type: '', text: '' })
  const [questionsMsg, setQuestionsMsg] = useState({ type: '', text: '' })
  const [imageMsg, setImageMsg] = useState({ type: '', text: '' })
  const [createError, setCreateError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    api
      .get(`/items/${id}`)
      .then((res) => {
        const loaded = res.data.data
        setItem(loaded)
        setDetails({
          title: loaded.title,
          category: loaded.category,
          description: loaded.description,
          locationFound: loaded.locationFound,
          dateFound: loaded.dateFound.slice(0, 10),
        })
        setQuestions(loaded.questions.map((q) => ({ question: q.question, answer: q.answer })))
      })
      .catch((err) => setDetailsMsg({ type: 'danger', text: err.response?.data?.message || 'Could not load item' }))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  function updateDetail(field) {
    return (e) => setDetails((d) => ({ ...d, [field]: e.target.value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError('')
    setSubmitting(true)
    try {
      const res = await api.post('/items', { ...details, questions })
      navigate(`/admin/items/${res.data.data.id}`)
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Could not create item')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveDetails(e) {
    e.preventDefault()
    setDetailsMsg({ type: '', text: '' })
    try {
      await api.patch(`/items/${id}`, details)
      setDetailsMsg({ type: 'success', text: 'Saved.' })
    } catch (err) {
      setDetailsMsg({ type: 'danger', text: err.response?.data?.message || 'Could not save' })
    }
  }

  async function handleSaveQuestions(e) {
    e.preventDefault()
    setQuestionsMsg({ type: '', text: '' })
    try {
      await api.patch(`/items/${id}`, { questions })
      setQuestionsMsg({ type: 'success', text: 'Saved.' })
    } catch (err) {
      setQuestionsMsg({ type: 'danger', text: err.response?.data?.message || 'Could not save' })
    }
  }

  async function handleUploadImage(e) {
    e.preventDefault()
    if (!imageFile) return
    setImageMsg({ type: '', text: '' })
    const form = new FormData()
    form.append('image', imageFile)
    try {
      const res = await api.post(`/items/${id}/image`, form)
      setItem(res.data.data)
      setImageFile(null)
      setImageMsg({ type: 'success', text: 'Image uploaded.' })
    } catch (err) {
      setImageMsg({ type: 'danger', text: err.response?.data?.message || 'Could not upload image' })
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${details.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/items/${id}`)
      navigate('/admin/items')
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete item')
    }
  }

  if (loading) return <p>Loading…</p>

  const detailsForm = (
    <>
      <div className="mb-3">
        <label className="form-label">Title</label>
        <input className="form-control" value={details.title} onChange={updateDetail('title')} required />
      </div>
      <div className="row g-3 mb-3">
        <div className="col-sm-6">
          <label className="form-label">Category</label>
          <select className="form-select" value={details.category} onChange={updateDetail('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-6">
          <label className="form-label">Location found</label>
          <input
            className="form-control"
            value={details.locationFound}
            onChange={updateDetail('locationFound')}
            required
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Date found</label>
        <input
          type="date"
          className="form-control"
          value={details.dateFound}
          onChange={updateDetail('dateFound')}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea
          className="form-control"
          rows={3}
          value={details.description}
          onChange={updateDetail('description')}
          required
        />
      </div>
    </>
  )

  if (!isEdit) {
    return (
      <div style={{ maxWidth: 640 }}>
        <h1 className="h3 mb-4">Add item</h1>
        {createError && <div className="alert alert-danger">{createError}</div>}
        <form onSubmit={handleCreate}>
          {detailsForm}
          <h2 className="h6 mt-4">Secret questions</h2>
          <p className="text-muted small">Only the real owner should be able to answer these.</p>
          <QuestionRows questions={questions} onChange={setQuestions} />
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create item'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        Edit item <span className="text-muted">— {item.status}</span>
      </h1>

      <form onSubmit={handleSaveDetails} className="mb-5">
        {detailsMsg.text && <div className={`alert alert-${detailsMsg.type}`}>{detailsMsg.text}</div>}
        {detailsForm}
        <button className="btn btn-primary">Save details</button>
      </form>

      <h2 className="h5">Secret questions</h2>
      <form onSubmit={handleSaveQuestions} className="mb-5">
        {questionsMsg.text && <div className={`alert alert-${questionsMsg.type}`}>{questionsMsg.text}</div>}
        <QuestionRows questions={questions} onChange={setQuestions} />
        <button className="btn btn-primary">Save questions</button>
      </form>

      <h2 className="h5">Image</h2>
      <div className="mb-5">
        {imageMsg.text && <div className={`alert alert-${imageMsg.type}`}>{imageMsg.text}</div>}
        {item.imagePath && (
          <img src={`/${item.imagePath}`} alt={item.title} className="mb-3 d-block" style={{ maxWidth: 240 }} />
        )}
        <form onSubmit={handleUploadImage} className="d-flex gap-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="form-control"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
          <button className="btn btn-outline-primary" disabled={!imageFile}>
            Upload
          </button>
        </form>
      </div>

      <button className="btn btn-outline-danger" onClick={handleDelete}>
        Delete item
      </button>
    </div>
  )
}
