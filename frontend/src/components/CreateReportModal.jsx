import { useEffect } from 'react'
import { X, Camera, MapPin } from 'lucide-react'

/**
 * Purely presentational modal for creating a report.
 * NOTE: This component is FRONTEND-ONLY for now.
 * - It does NOT call any backend APIs yet.
 * - Later we will connect it to POST /api/reports using FormData.
 */
function CreateReportModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    // In this phase we only show the UI.
    // Actual submission to backend will be wired later.
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[1110] w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl p-6 border border-[#3B5CE8]/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">New Civic Report</h2>
            <p className="text-sm text-gray-500">Capture an issue around you and send it to your city.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#3B5CE8]/30 rounded-xl py-6 cursor-pointer hover:border-[#3B5CE8] hover:bg-[#3B5CE8]/5 transition">
              <Camera className="w-6 h-6 text-[#3B5CE8]" />
              <span className="text-sm text-gray-600">Tap to upload or capture a photo</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" />
            </label>
            <p className="mt-1 text-xs text-gray-500">Use a clear photo to help the authority verify the issue faster.</p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] outline-none transition"
              defaultValue=""
            >
              <option value="" disabled>
                Select category
              </option>
              <option value="Road">Road</option>
              <option value="Water">Water</option>
              <option value="Garbage">Garbage</option>
              <option value="Electricity">Electricity</option>
            </select>
          </div>

          {/* Title / Description */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5CE8] focus:border-[#3B5CE8] outline-none transition"
              placeholder="Short title, e.g. Broken streetlight"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5CE8] focus:border-[#3B5CE8] outline-none transition resize-none"
              placeholder="Add more details to help identify the issue and location."
            />
          </div>

          {/* Location preview */}
          <div className="flex items-start gap-2 text-sm text-gray-600 bg-[#14B8A6]/5 border border-[#14B8A6]/40 rounded-xl px-4 py-3">
            <MapPin className="w-4 h-4 mt-0.5 text-[#14B8A6]" />
            <div>
              <p className="font-semibold text-gray-800">Location</p>
              <p className="text-xs text-gray-600">
                We will use your current GPS location from the map as the report location. This is a read-only preview for
                now.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#3B5CE8] text-white py-3 rounded-lg font-semibold hover:bg-[#3149ba] transition"
            >
              Submit (UI only)
            </button>
          </div>
        </form>

        <p className="mt-3 text-[11px] text-gray-400">
          Note: This form is currently frontend-only. In the next phase, we will send this data to the backend
          <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-[10px]">POST /api/reports</code> endpoint.
        </p>
      </div>
    </div>
  )
}

export default CreateReportModal

