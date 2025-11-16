import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const pageSize = 20

  const fetchLogs = async (p=1) => {
    setLoading(true)
    try {
      const data = await api.getAuditLogs({ page: p })
      setLogs(data.results || data)
      setPage(p)
    } catch(e) {
      console.error('fetch logs', e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchLogs(1) }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Mimic Dicom Router – Admin</h1>
          <nav className="flex items-center space-x-2 text-sm">
            <Link to="/admin/destinations" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">Destinations</Link>
            <Link to="/admin/logs" className="px-4 py-2 bg-blue-600 rounded-md">Logs</Link>
            <Link to="/admin/users" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">Users</Link>
            <Link to="/dashboard" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 space-y-6">
      {loading ? <p>Loading...</p> : (
        <table className="w-full text-sm bg-gray-800 border border-gray-700 rounded-lg">
          <thead className="bg-gray-700">
            <tr>
              <th className="py-2 px-3 text-left">Timestamp</th>
              <th className="py-2 px-3 text-left">Batch</th>
              <th className="py-2 px-3 text-left">Action</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Destination</th>
              <th className="py-2 px-3 text-left">Patient/Series</th>
              <th className="py-2 px-3 text-left">Files Succeeded</th>
              <th className="py-2 px-3 text-left">Files Failed</th>
              <th className="py-2 px-3 text-left">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t border-gray-700 hover:bg-gray-700/40">
                <td className="py-2 px-3">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="py-2 px-3 text-xs font-mono">
                  {l.batch_id ? l.batch_id.split('_').slice(-1)[0] : '-'}
                </td>
                <td className="py-2 px-3">{l.action}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    l.status === 'success' ? 'bg-green-600/20 text-green-400' :
                    l.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                    l.status === 'sending' ? 'bg-blue-600/20 text-blue-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    {l.status}
                  </span>
                </td>
                <td className="py-2 px-3">{l.destination_name || '-'}</td>
                <td className="py-2 px-3">{l.patient_name || l.series_description || '-'}</td>
                <td className="py-2 px-3 text-center">
                  <span className={l.files_succeeded > 0 ? 'text-green-400 font-semibold' : 'text-gray-500'}>
                    {l.files_succeeded || 0}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={l.files_failed > 0 ? 'text-red-400 font-semibold' : 'text-gray-500'}>
                    {l.files_failed || 0}
                  </span>
                </td>
                <td className="py-2 px-3 text-xs max-w-xs truncate" title={l.error_message}>{l.error_message}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr><td className="p-4 text-center text-gray-400" colSpan={9}>No logs</td></tr>
            )}
          </tbody>
        </table>
      )}
      </main>
    </div>
  )
}

export default AuditLogsPage 