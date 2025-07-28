import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

function humanSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function TransferVolumeChart({ logs = [] }) {
  // Aggregate per day
  const data = useMemo(() => {
    const map = {}
    logs.forEach(l => {
      if (!l.bytes_transferred || l.bytes_transferred === null) return
      const day = new Date(l.timestamp).toISOString().slice(0, 10) // YYYY-MM-DD
      map[day] = (map[day] || 0) + l.bytes_transferred
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bytes]) => ({ date, bytes }))
  }, [logs])

  if (!data.length) return null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 className="text-white mb-2 font-medium">Data Sent (last 30 days)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBytes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3182ce" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3182ce" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
          <XAxis dataKey="date" tick={{ fill: '#a0aec0', fontSize: 12 }} />
          <YAxis tickFormatter={(v)=>humanSize(v)} tick={{ fill: '#a0aec0', fontSize: 12 }} />
          <Tooltip formatter={(value)=>humanSize(value)} labelStyle={{ color: '#fff' }} contentStyle={{ backgroundColor: '#2d3748', border: 'none' }} />
          <Area type="monotone" dataKey="bytes" stroke="#63b3ed" fillOpacity={1} fill="url(#colorBytes)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
} 