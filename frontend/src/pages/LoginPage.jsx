import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Link } from 'react-router-dom'

function LoginPage() {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    if (error) setError('') // Clear error when user starts typing
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Basic validation
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password')
      setIsLoading(false)
      return
    }

    try {
      // Real login via API
      const data = await login(formData.username, formData.password)
      if (!data) {
        setError('Invalid credentials')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mimic Dicom Router</h1>
          <p className="text-gray-400">v2.1.0</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Sign In</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-700 rounded-md p-3">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account? <Link to="/signup" className="text-blue-400 hover:underline">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage 