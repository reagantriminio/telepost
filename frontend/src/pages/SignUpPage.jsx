import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Link, useNavigate } from 'react-router-dom'

function SignUpPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register({ username: form.username, email: form.email, password: form.password })
      setError('')
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      let msg = 'Registration failed'
      if (err.detail) {
        msg = err.detail
      } else if (typeof err === 'object') {
        msg = Object.entries(err)
          .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ')
      } else if (typeof err === 'string') {
        msg = err
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mimic Dicom Router</h1>
          <p className="text-gray-400">Create your account</p>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
            <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
            <input type="password" name="confirm" value={form.confirm} onChange={handleChange} placeholder="Confirm Password" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
            {error && <div className="text-xs text-red-400">{error}</div>}
            {success && <div className="text-xs text-green-400">Account created! Redirecting...</div>}
            <button disabled={loading} className="w-full py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600">{loading ? 'Creating...' : 'Sign Up'}</button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-400">
            Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage 