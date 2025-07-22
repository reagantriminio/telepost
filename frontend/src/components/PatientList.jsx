import { useState } from 'react'
import SeriesItem from './SeriesItem'

function PatientList({ patients, destinations, onSeriesUpdate, onSendSelected }) {
  const [expandedPatients, setExpandedPatients] = useState(new Set())

  const togglePatient = (patientId) => {
    const newExpanded = new Set(expandedPatients)
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId)
    } else {
      newExpanded.add(patientId)
    }
    setExpandedPatients(newExpanded)
  }

  const toggleAllSeries = (patientId, selected) => {
    const patient = patients.find(p => p.id === patientId)
    if (patient) {
      patient.series.forEach(series => {
        onSeriesUpdate(patientId, series.id, { selectedForSend: selected })
      })
    }
  }

  const getSelectedSeriesCount = () => {
    return patients.reduce((count, patient) => {
      return count + patient.series.filter(series => series.selectedForSend).length
    }, 0)
  }

  if (patients.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Patient Data</h3>
        <div className="text-center py-8 text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5l3-3m0 0l3 3m-3-3v12" />
          </svg>
          <p>No DICOM files imported yet</p>
          <p className="text-sm mt-1">Import files to see patient data here</p>
        </div>
      </div>
    )
  }

  const selectedCount = getSelectedSeriesCount()

  return (
    <div className="space-y-4">
      {/* Send Controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={patients.every(p => p.series.every(s => s.selectedForSend)) && patients.length > 0}
                onChange={(e) => {
                  const checked = e.target.checked
                  // propagate selection to all series
                  patients.forEach(p => p.series.forEach(s => onSeriesUpdate(p.id, s.id, { selectedForSend: checked })))
                }}
                className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <label className="text-sm text-gray-400 select-none">Select All</label>
            </div>

            {/* Global Destination Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400 select-none">Destination:</label>
              <select
                onChange={(e) => {
                  const dest = e.target.value
                  patients.forEach(p => p.series.forEach(s => {
                    if (s.selectedForSend || dest === '') {
                      onSeriesUpdate(p.id, s.id, { selectedDestination: dest })
                    }
                  }))
                }}
                className="text-sm bg-gray-600 border border-gray-500 text-white rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue=""
              >
                <option value="">-- All Selected --</option>
                {destinations.map(dest => (
                  <option key={dest.id} value={dest.id}>{dest.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={onSendSelected}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Send Selected ({selectedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Patient Data</h3>
        </div>
        
        <div className="divide-y divide-gray-700">
          {patients.map((patient) => (
            <div key={patient.id} className="p-4">
              {/* Patient Header */}
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-700/50 rounded p-2 -m-2"
                onClick={() => togglePatient(patient.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-gray-400">
                    <svg 
                      className={`h-5 w-5 transition-transform ${
                        expandedPatients.has(patient.id) ? 'rotate-90' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-medium">{patient.name}</div>
                    <div className="text-sm text-gray-400">
                      ID: {patient.patient_id} • DOB: {patient.birth_date} • {patient.sex}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-400">
                    {patient.series.length} series
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-400">Select All:</label>
                    <input
                      type="checkbox"
                      checked={patient.series.every(s => s.selectedForSend)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleAllSeries(patient.id, e.target.checked)
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Series List */}
              {expandedPatients.has(patient.id) && (
                <div className="mt-4 space-y-2">
                  {patient.series.map((series) => (
                    <SeriesItem
                      key={series.id}
                      series={series}
                      destinations={destinations}
                      onUpdate={(updates) => onSeriesUpdate(patient.id, series.id, updates)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PatientList 