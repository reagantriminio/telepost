import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState([])
  const blank = { name: '', ae_title: '', host: '', port: 104 }
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchAll = async () => {
    try {
      const data = await api.getDestinations()
      setDestinations(data)
    } catch (e) {
      console.error('fetch dest', e)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingId) {
        await api.updateDestination(editingId, { ...form, port: Number(form.port) })
      } else {
        await api.createDestination({ ...form, port: Number(form.port) })
      }
      setForm(blank)
      setEditingId(null)
      fetchAll()
    } catch (err) {
      alert('Failed to create destination')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Destinations</h1>
        <Link
          to="/dashboard"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* add form */}
      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4 max-w-lg">
        <div className="flex space-x-4">
          <input className="flex-1 bg-gray-700 rounded px-3 py-2" placeholder="Name" name="name" value={form.name} onChange={handleChange} />
          <input className="flex-1 bg-gray-700 rounded px-3 py-2" placeholder="AE Title" name="ae_title" value={form.ae_title} onChange={handleChange} />
        </div>
        <div className="flex space-x-4">
          <input className="flex-1 bg-gray-700 rounded px-3 py-2" placeholder="Host" name="host" value={form.host} onChange={handleChange} />
          <input type="number" className="w-32 bg-gray-700 rounded px-3 py-2" placeholder="Port" name="port" value={form.port} onChange={handleChange} />
        </div>
        <button disabled={loading} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600">{loading ? 'Saving...' : 'Add'}</button>
      </form>

      {/* list */}
      <table className="w-full text-sm bg-gray-800 border border-gray-700 rounded-lg">
        <thead className="bg-gray-700">
          <tr>
            <th className="py-2 px-3 text-left">Name</th>
            <th className="py-2 px-3 text-left">AE Title</th>
            <th className="py-2 px-3 text-left">Host</th>
            <th className="py-2 px-3 text-left">Port</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {destinations.map(d => (
            <tr key={d.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="py-2 px-3">{d.name}</td>
              <td className="py-2 px-3">{d.ae_title}</td>
              <td className="py-2 px-3">{d.host}</td>
              <td className="py-2 px-3">{d.port}</td>
              <td className="py-2 px-3 space-x-2">
                <button onClick={() => { setEditingId(d.id); setForm({ ...d }) }} className="text-blue-400 hover:underline text-xs">Edit</button>
                <button onClick={async () => { if(confirm('Delete destination?')) { await api.deleteDestination(d.id); fetchAll(); }}} className="text-red-400 hover:underline text-xs">Delete</button>
              </td>
            </tr>
          ))}
          {destinations.length === 0 && (
            <tr><td className="p-4 text-center text-gray-400" colSpan={5}>No destinations</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default AdminDestinationsPage 