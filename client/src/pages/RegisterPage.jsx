import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { phone, ...rest } = form
      await register(phone ? { ...rest, phone } : rest)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 380, marginTop: '4rem' }}>
      <h1 className="mb-4 h3">FoundIt — Register</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input className="form-control" value={form.name} onChange={update('name')} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Username</label>
          <input className="form-control" value={form.username} onChange={update('username')} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            value={form.password}
            onChange={update('password')}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Phone (optional)</label>
          <input className="form-control" value={form.phone} onChange={update('phone')} />
        </div>
        <button className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>
      </form>
      <p className="mt-3 text-center">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
