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
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <Link
          to="/dashboard"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <table className="w-full text-sm bg-gray-800 border border-gray-700 rounded-lg">
          <thead className="bg-gray-700">
            <tr>
              <th className="py-2 px-3 text-left">Timestamp</th>
              <th className="py-2 px-3 text-left">Action</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Destination</th>
              <th className="py-2 px-3 text-left">Patient/Series</th>
              <th className="py-2 px-3 text-left">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t border-gray-700 hover:bg-gray-700/40">
                <td className="py-2 px-3">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="py-2 px-3">{l.action}</td>
                <td className="py-2 px-3">{l.status}</td>
                <td className="py-2 px-3">{l.destination_name}</td>
                <td className="py-2 px-3">{l.patient_name || l.series_description}</td>
                <td className="py-2 px-3 text-xs max-w-xs truncate" title={l.error_message}>{l.error_message}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr><td className="p-4 text-center text-gray-400" colSpan={5}>No logs</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AuditLogsPage 