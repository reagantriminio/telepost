import { useState, useRef } from 'react'
import { api } from '../api'

function DICOMImport({ onFilesImported }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFiles = async (files) => {
    console.log(`Starting upload of ${files.length} files`)
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    console.log(`Total size: ${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`)

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Build FormData
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      console.log('FormData built, starting upload...')

      // Upload to backend with progress tracking
      const res = await api.importDicom(formData, (progress) => {
        console.log(`Upload progress: ${progress.toFixed(1)}%`)
        setUploadProgress(Math.round(progress))
      })

      console.log('Upload complete, processing response...')

      // Backend returns patients
      const patients = res.patients.map(p => ({
        ...p,
        series: p.series.map(s => ({ ...s, selectedForSend: false, selectedDestination: '', status: 'ready' }))
      }))

      onFilesImported(patients)
    } catch (error) {
      console.error('Error processing files:', error)
      alert(`Upload failed: ${error.message || JSON.stringify(error)}`)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFolderSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 transition-transform hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-600/20">
      <h3 className="text-lg font-medium text-white mb-4">Import DICOM Files</h3>
      
      {/* Drag and Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-blue-400 bg-blue-900/20 ring-4 ring-blue-500/30 scale-105'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="text-blue-400">
              <svg className="mx-auto h-12 w-12 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="text-white">
              <div className="text-sm mb-2">
                {uploadProgress < 100 ? 'Uploading files...' : 'Processing DICOM files...'}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {uploadProgress < 100 ? (
                  <span>{uploadProgress}% uploaded</span>
                ) : (
                  <span>Upload complete, parsing metadata...</span>
                )}
              </div>
              {uploadProgress < 100 && (
                <div className="text-xs text-gray-500 mt-1">
                  Please keep this window open
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-400">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
              </svg>
            </div>
            <div className="text-white">
              <div className="text-lg font-medium mb-2">Drop DICOM files here</div>
              <div className="text-sm text-gray-400 mb-4">
                or click to select files from your computer
              </div>
              <button
                onClick={handleFolderSelect}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                Select Folder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Directory Input (webkitdirectory allows folder upload) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        webkitdirectory="true"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="mt-4 text-xs text-gray-500">
        Supported formats: .dcm, .dicom files
      </div>
    </div>
  )
}

export default DICOMImport 