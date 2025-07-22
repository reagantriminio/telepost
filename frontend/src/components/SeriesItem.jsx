function SeriesItem({ series, destinations, onUpdate }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'text-gray-400'
      case 'sending': return 'text-blue-400'
      case 'success': return 'text-green-400'
      case 'failed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sending':
        return (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      case 'success':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return null
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'ready': return 'Ready'
      case 'sending': return 'Sending...'
      case 'success': return 'Sent Successfully'
      case 'failed': return 'Transfer Failed'
      default: return 'Ready'
    }
  }

  return (
    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between">
        {/* Series Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={series.selectedForSend}
              onChange={(e) => onUpdate({ selectedForSend: e.target.checked })}
              disabled={series.status === 'sending'}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-700"
            />
            <div className="flex-1">
              <div className="text-white font-medium truncate">
                {series.description || `${series.modality} Series ${series.series_number}`}
              </div>
              <div className="text-sm text-gray-400 space-x-2">
                <span>{series.modality}</span>
                <span>•</span>
                <span>{series.instance_count} images</span>
                <span>•</span>
                <span>Series {series.series_number}</span>
                {series.body_part && (
                  <>
                    <span>•</span>
                    <span>{series.body_part}</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Study: {series.study_description} ({series.study_date})
              </div>
            </div>
          </div>
        </div>

        {/* Destination Selector */}
        <div className="flex items-center space-x-4 ml-4">
          <div className="min-w-0 flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">Destination</label>
            <select
              value={series.selectedDestination}
              onChange={(e) => onUpdate({ selectedDestination: e.target.value })}
              disabled={series.status === 'sending' || series.status === 'success'}
              className="text-sm bg-gray-600 border border-gray-500 text-white rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-700 disabled:text-gray-400"
            >
              <option value="">Select destination...</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="min-w-0 flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <div className={`flex items-center space-x-2 text-sm ${getStatusColor(series.status)}`}>
              {getStatusIcon(series.status)}
              <span>{getStatusText(series.status)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar for Sending Status */}
      {series.status === 'sending' && (
        <div className="mt-3">
          <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-2 animate-[indeterminate_1.2s_linear_infinite]" style={{ width: '40%' }}></div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {series.status === 'failed' && series.errorMessage && (
        <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-700 rounded p-2">
          {series.errorMessage}
        </div>
      )}
    </div>
  )
}

export default SeriesItem 