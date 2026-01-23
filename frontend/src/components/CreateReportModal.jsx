import { useEffect, useState, useRef } from 'react'
import { X, Camera, MapPin, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { reportsAPI } from '../utils/api'

/**
 * Enhanced modal for creating a report with camera capture and location fetching.
 * Connected to backend API for real report submission.
 */
function CreateReportModal({ isOpen, onClose, initialLocation = null }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(initialLocation)
  const [placeName, setPlaceName] = useState('')
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [isFetchingPlaceName, setIsFetchingPlaceName] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  
  const fileInputRef = useRef(null)
  const hasFetchedLocationRef = useRef(false)

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

  // Fetch location when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialLocation) {
        setCurrentLocation(initialLocation)
        hasFetchedLocationRef.current = true
        // Fetch place name for initial location
        fetchPlaceName(initialLocation.lat, initialLocation.lng)
      } else if (!currentLocation && !hasFetchedLocationRef.current) {
        fetchUserLocation()
        hasFetchedLocationRef.current = true
      }
    } else {
      // Reset when modal closes
      hasFetchedLocationRef.current = false
    }
  }, [isOpen, initialLocation])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null)
      setImagePreview(null)
      setLocationError('')
      setPlaceName('')
      setTitle('')
      setDescription('')
      setCategory('')
      setSubmitError('')
      setSubmitSuccess(false)
      hasFetchedLocationRef.current = false
    }
  }, [isOpen])

  const fetchPlaceName = async (lat, lng) => {
    setIsFetchingPlaceName(true)
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      
      if (data && data.display_name) {
        // Extract a shorter, more readable address
        const address = data.address || {}
        let name = ''
        
        // Try to build a readable address
        if (address.road || address.street) {
          name = address.road || address.street
          if (address.house_number) {
            name = `${address.house_number}, ${name}`
          }
          if (address.suburb || address.neighbourhood) {
            name += `, ${address.suburb || address.neighbourhood}`
          }
          if (address.city || address.town || address.village) {
            name += `, ${address.city || address.town || address.village}`
          }
        } else if (address.building || address.amenity) {
          name = address.building || address.amenity
          if (address.road) {
            name += `, ${address.road}`
          }
        } else {
          // Fallback to display_name but truncate if too long
          name = data.display_name.split(',')[0] + ', ' + data.display_name.split(',')[1]
        }
        
        setPlaceName(name || data.display_name)
      } else {
        setPlaceName('Location identified')
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      setPlaceName('Location identified')
    } finally {
      setIsFetchingPlaceName(false)
    }
  }

  const fetchUserLocation = () => {
    setIsFetchingLocation(true)
    setLocationError('')
    setPlaceName('')

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      setIsFetchingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setCurrentLocation(location)
        setIsFetchingLocation(false)
        // Fetch place name after getting coordinates
        await fetchPlaceName(location.lat, location.lng)
      },
      (error) => {
        console.error('Location error:', error)
        setLocationError('Unable to fetch your location. Please try again.')
        setIsFetchingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSubmitError('Please select a valid image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('Image size must be less than 5MB')
        return
      }
      
      setSelectedImage(file)
      setSubmitError('')
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Force camera capture only (no gallery)
  const handleCameraClick = async () => {
    // Check if getUserMedia is available (better camera-only experience)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } // Use back camera on mobile
        })
        
        // Create a video element to capture from
        const video = document.createElement('video')
        video.srcObject = stream
        video.autoplay = true
        video.playsInline = true
        
        // Create a canvas to capture the frame
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Create a modal for camera preview
        const cameraModal = document.createElement('div')
        cameraModal.className = 'fixed inset-0 z-[1200] bg-black flex flex-col items-center justify-center'
        cameraModal.innerHTML = `
          <div class="w-full max-w-2xl p-4">
            <video id="camera-preview" class="w-full rounded-lg" autoplay playsinline></video>
            <div class="flex gap-4 mt-4 justify-center">
              <button id="capture-btn" class="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold">
                Capture Photo
              </button>
              <button id="cancel-camera-btn" class="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold">
                Cancel
              </button>
            </div>
          </div>
        `
        document.body.appendChild(cameraModal)
        
        const previewVideo = cameraModal.querySelector('#camera-preview')
        previewVideo.srcObject = stream
        
        // Set canvas size to match video
        previewVideo.addEventListener('loadedmetadata', () => {
          canvas.width = previewVideo.videoWidth
          canvas.height = previewVideo.videoHeight
        })
        
        // Capture button
        cameraModal.querySelector('#capture-btn').addEventListener('click', () => {
          ctx.drawImage(previewVideo, 0, 0)
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
              setSelectedImage(file)
              const reader = new FileReader()
              reader.onloadend = () => {
                setImagePreview(reader.result)
              }
              reader.readAsDataURL(file)
            }
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop())
            document.body.removeChild(cameraModal)
          }, 'image/jpeg', 0.9)
        })
        
        // Cancel button
        cameraModal.querySelector('#cancel-camera-btn').addEventListener('click', () => {
          stream.getTracks().forEach(track => track.stop())
          document.body.removeChild(cameraModal)
        })
        
      } catch (error) {
        console.error('Camera access error:', error)
        // Fallback to file input with capture attribute
        // On mobile, this will still open camera
        fileInputRef.current?.click()
      }
    } else {
      // Fallback: Use file input with capture attribute
      // On mobile devices, this will open camera directly
      fileInputRef.current?.click()
    }
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = (e) => {
    e.stopPropagation()
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)
    
    // Validation
    if (!selectedImage) {
      setSubmitError('Please capture a photo')
      return
    }
    
    if (!title.trim()) {
      setSubmitError('Please enter a title')
      return
    }
    
    if (!category) {
      setSubmitError('Please select a category')
      return
    }
    
    if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
      setSubmitError('Please wait for location to be fetched')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('image', selectedImage)
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('category', category)
      formData.append('lat', currentLocation.lat.toString())
      formData.append('lng', currentLocation.lng.toString())
      
      // Submit to API
      const response = await reportsAPI.createReport(formData)
      
      if (response.success) {
        setSubmitSuccess(true)
        // Reset form
        setSelectedImage(null)
        setImagePreview(null)
        setTitle('')
        setDescription('')
        setCategory('')
        
        // Close modal after 1.5 seconds
        setTimeout(() => {
          onClose()
          // Optionally refresh the page or trigger a callback to refresh reports
          window.location.reload()
        }, 1500)
      } else {
        setSubmitError(response.message || 'Failed to submit report')
      }
    } catch (error) {
      console.error('Report submission error:', error)
      
      // Handle AI gatekeeper rejection
      if (error.response?.status === 400) {
        const errorData = error.response.data
        setSubmitError(
          errorData.message || errorData.reason || 'Report rejected: Image does not match description'
        )
      } else if (error.response?.data?.message) {
        setSubmitError(error.response.data.message)
      } else {
        setSubmitError('Failed to submit report. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[1110] w-full max-w-2xl max-h-[95vh] bg-white rounded-2xl shadow-2xl my-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#3B5CE8] to-[#14B8A6] px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">New Civic Report</h2>
            <p className="text-xs sm:text-sm text-white/90 mt-1">Capture an issue and help improve your city</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-white/20 text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Photo input with preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">Photo *</label>
              {imagePreview ? (
                <div className="relative group">
                  <div className="relative w-full h-48 sm:h-64 md:h-72 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors z-10"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCameraClick}
                      className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center group"
                      aria-label="Change image"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
                        <Camera className="w-6 h-6 text-[#3B5CE8]" />
                      </div>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    Tap the image to change or capture a new photo
                  </p>
                </div>
              ) : (
                <>
                  <label
                    onClick={handleCameraClick}
                    className="flex flex-col items-center justify-center gap-2 sm:gap-3 border-2 border-dashed border-[#3B5CE8]/40 rounded-xl py-8 sm:py-12 md:py-14 cursor-pointer hover:border-[#3B5CE8] hover:bg-[#3B5CE8]/5 transition-all duration-200 bg-gray-50"
                  >
                    <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#3B5CE8]/10">
                      <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-[#3B5CE8]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm sm:text-base font-medium text-gray-700">Tap to open camera</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Camera only - Gallery not allowed</p>
                    </div>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="hidden"
                    // Prevent file selection dialog on desktop (force camera)
                    onClick={(e) => {
                      // On desktop, show a message if they try to browse files
                      if (window.innerWidth > 768) {
                        // Still allow but warn - mobile will use camera
                        console.log('Please use camera to capture photo')
                      }
                    }}
                  />
                </>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Use a clear photo to help authorities verify the issue faster
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-gray-800 mb-2">
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] outline-none transition bg-white text-gray-900 font-medium"
              >
                <option value="" disabled>
                  Select a category
                </option>
                <option value="Road">🛣️ Road</option>
                <option value="Water">💧 Water</option>
                <option value="Garbage">🗑️ Garbage</option>
                <option value="Electricity">⚡ Electricity</option>
                <option value="Other">📋 Other</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-800 mb-2">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5CE8] focus:border-[#3B5CE8] outline-none transition"
                placeholder="e.g., Broken streetlight on Main Street"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-800 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5CE8] focus:border-[#3B5CE8] outline-none transition resize-none"
                placeholder="Add more details to help identify the issue and its exact location..."
              />
            </div>

            {/* Location with refresh */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Location *</label>
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-[#14B8A6]/10 to-[#3B5CE8]/10 border-2 border-[#14B8A6]/30 rounded-xl">
                <MapPin className="w-5 h-5 mt-0.5 text-[#14B8A6] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {isFetchingLocation ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#14B8A6]" />
                      <p className="text-sm text-gray-600">Fetching your location...</p>
                    </div>
                  ) : currentLocation ? (
                    <div>
                      <p className="font-semibold text-gray-900 text-sm mb-1">Current Location</p>
                      {isFetchingPlaceName ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin text-[#14B8A6]" />
                          <p className="text-xs text-gray-500">Identifying place...</p>
                        </div>
                      ) : placeName ? (
                        <p className="text-sm text-gray-800 font-medium">
                          {placeName}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600 font-mono">
                          {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        This location will be used for your report
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-700 mb-2">
                        {locationError || 'Location not available'}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetchUserLocation()
                  }}
                  disabled={isFetchingLocation || isFetchingPlaceName}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#14B8A6] hover:bg-[#0d9488] disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingLocation || isFetchingPlaceName ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 flex-1">{submitError}</p>
              </div>
            )}

            {/* Success Message */}
            {submitSuccess && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800">Report submitted successfully!</p>
                  <p className="text-xs text-green-700 mt-1">Your report is being processed...</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 py-3 sm:py-3.5 rounded-xl font-semibold transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || submitSuccess}
                className="flex-1 bg-gradient-to-r from-[#3B5CE8] to-[#14B8A6] hover:from-[#3149ba] hover:to-[#0d9488] disabled:from-gray-400 disabled:to-gray-400 text-white py-3 sm:py-3.5 rounded-xl font-semibold shadow-lg transition-all transform hover:scale-[1.02] disabled:transform-none text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submitted!</span>
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateReportModal

