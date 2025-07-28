import { useEffect, useState } from 'react'
import { api } from '../api'

function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      try {
        const list = await api.getUsers()
        setUsers(Array.isArray(list) ? list : [])
      } catch (e) {
        console.error('fetch users', e)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      <h1 className="text-2xl font-bold">Registered Users</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full text-sm bg-gray-800 border border-gray-700 rounded-lg">
          <thead className="bg-gray-700">
            <tr>
              <th className="py-2 px-3 text-left">Username</th>
              <th className="py-2 px-3 text-left">Email</th>
              <th className="py-2 px-3 text-left">Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-gray-700 hover:bg-gray-700/40">
                <td className="py-2 px-3">{u.username}</td>
                <td className="py-2 px-3">{u.email}</td>
                <td className="py-2 px-3 space-x-2">
                  <button
                    onClick={async () => {
                      if (window.confirm('Delete this user?')) {
                        try {
                          await api.deleteUser(u.id)
                          setUsers(prev => prev.filter(x => x.id !== u.id))
                        } catch (e) {
                          alert('Failed to delete user')
                        }
                      }
                    }}
                    className="text-red-400 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td className="p-4 text-center text-gray-400" colSpan={3}>No users</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminUsersPage 