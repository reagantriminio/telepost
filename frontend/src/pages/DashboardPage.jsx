import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import DICOMImport from '../components/DICOMImport'
import PatientList from '../components/PatientList'
import { api } from '../api'

function DashboardPage({ user, onLogout }) {
  const [patients, setPatients] = useState([])
  const [destinations, setDestinations] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch destinations from backend
  useEffect(() => {
    let isMounted = true
    async function fetchDest() {
      try {
        const list = await api.getDestinations()
        if (isMounted) {
          setDestinations(Array.isArray(list) ? list : [])
        }
      } catch (e) {
        console.error('Failed to fetch destinations', e)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchDest()
    return () => {
      isMounted = false
    }
  }, [])

  const handleFilesImported = (importedPatients) => {
    setPatients(importedPatients)
  }

  // polling ref
  const pollRef = useRef(null)

  const handleSeriesUpdate = (patientId, seriesId, updates) => {
    setPatients(prevPatients => 
      prevPatients.map(patient => 
        patient.id === patientId 
          ? {
              ...patient,
              series: patient.series.map(series =>
                series.id === seriesId ? { ...series, ...updates } : series
              )
            }
          : patient
      )
    )
  }

  const handleSendSelected = async () => {
    // Build payload for backend
    const selectedSeries = []
    patients.forEach(p => p.series.forEach(s => {
      if (s.selectedForSend && s.selectedDestination) {
        selectedSeries.push({ seriesId: s.id, destination: s.selectedDestination })
      }
    }))

    if (!selectedSeries.length) {
      alert('Select at least one series and destination')
      return
    }

    try {
      // mark UI
      selectedSeries.forEach(({ seriesId }) => {
        const [patientId] = seriesId.split('_') // first part of id before session maybe differs, skip, we have mapping function but this keeps same update method
        // naive find
        patients.forEach(pt => pt.series.forEach(se => {
          if (se.id === seriesId) handleSeriesUpdate(pt.id, seriesId, { status: 'sending' })
        }))
      })

      await api.sendSeries({ seriesToSend: selectedSeries })

      // start polling
      if (!pollRef.current) {
        pollRef.current = setInterval(async () => {
          // gather series still sending
          const pending = []
          patients.forEach(pt => pt.series.forEach(se => {
            if (['sending','pending','ready'].includes(se.status)) {
              pending.push(se.id)
            }
          }))
          if (!pending.length) {
            clearInterval(pollRef.current)
            pollRef.current = null
            return
          }
          try {
            const data = await api.getTransferStatus({ series_ids: pending.join(',') })
            data.series.forEach(st => {
              const { id, status, message } = st
              patients.forEach(pt => pt.series.forEach(se => {
                if (se.id === id) handleSeriesUpdate(pt.id, id, { status: status, errorMessage: message })
              }))
            })
          } catch (e) {
            console.error('Status poll failed', e)
          }
        }, 3000)
      }
    } catch (e) {
      console.error('Send failed', e)
      alert('Failed to start transfer')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">DICOM Transfer</h1>
            <span className="text-sm text-gray-400">v2.1.0</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-400">Welcome, </span>
              <span className="text-white font-medium">{user?.username}</span>
              {user?.is_admin && (
                <span className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded">admin</span>
              )}
            </div>
            {/* Admin navigation buttons */}
            {user?.is_admin && (
              <>
                <Link
                  to="/admin/destinations"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                >
                  Destinations
                </Link>
                <Link
                  to="/admin/logs"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                >
                  Logs
                </Link>
              </>
            )}
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Import Section */}
          <DICOMImport onFilesImported={handleFilesImported} />

          {/* Patient Data Section */}
          {isLoading ? (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <svg className="mx-auto h-8 w-8 animate-spin text-blue-400 mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-400">Loading destinations...</p>
                </div>
              </div>
            </div>
          ) : (
            <PatientList 
              patients={patients}
              destinations={destinations}
              onSeriesUpdate={handleSeriesUpdate}
              onSendSelected={handleSendSelected}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default DashboardPage 