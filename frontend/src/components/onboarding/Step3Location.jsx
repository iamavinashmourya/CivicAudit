import { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import L from 'leaflet'
import { profileAPI } from '../../utils/api'

// Fix for missing default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

function Step3Location({ coordinates, wardName, onUpdate, onNext, onBack }) {
  const [location, setLocation] = useState(coordinates || null)
  const [ward, setWard] = useState(wardName || '')
  const [isDetecting, setIsDetecting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  // Default center to Vadodara, India
  const defaultCenter = [22.3072, 73.1812]

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (coordinates) {
      setLocation(coordinates)
    }
  }, [coordinates])

  // Initialize map
  useEffect(() => {
    if (!isMounted || !mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      center: location ? [location[1], location[0]] : defaultCenter,
      zoom: location ? 15 : 13,
      scrollWheelZoom: true,
    })

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    mapInstanceRef.current = map

    // Add marker if location exists
    if (location) {
      const marker = L.marker([location[1], location[0]], { draggable: true }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng()
        setLocation([lng, lat])
      })
    }

    // Handle map clicks
    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      setLocation([lng, lat])

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
        markerRef.current = marker

        marker.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng()
          setLocation([lng, lat])
        })
      }
    })

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [isMounted, defaultCenter])

  // Update map when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !location) return

    const [lng, lat] = location
    mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom())

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current)
      markerRef.current = marker

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng()
        setLocation([lng, lat])
      })
    }
  }, [location])

  const handleDetectLocation = () => {
    setIsDetecting(true)
    setError('')

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setIsDetecting(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const coords = [longitude, latitude] // [lng, lat] for backend
        setLocation(coords)
        setIsDetecting(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError('Unable to detect your location. Please allow location access or click on the map to set your location.')
        setIsDetecting(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!location) {
      setError('Please detect your location or click on the map to set your location')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        coordinates: location,
        wardName: ward.trim() || undefined,
      }

      const response = await profileAPI.updateLocation(payload)
      if (response.success) {
        onUpdate({
          coordinates: location,
          wardName: ward.trim(),
        })
        onNext()
      } else {
        setError(response.message || 'Failed to update location')
      }
    } catch (err) {
      console.error('Update location error:', err)
      setError(err.response?.data?.message || 'Failed to update location. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* GPS Detection Button */}
      <button
        type="button"
        onClick={handleDetectLocation}
        disabled={isDetecting || isSubmitting}
        className="w-full flex items-center justify-center gap-3 bg-[#2563EB] text-white py-4 px-6 rounded-lg font-semibold hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isDetecting ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Detecting Location...</span>
          </>
        ) : (
          <>
            <Navigation className="w-6 h-6" />
            <span>Detect My Home Location</span>
          </>
        )}
      </button>

      {/* Map */}
      <div className="w-full h-64 rounded-lg overflow-hidden border-2 border-gray-300">
        {isMounted ? (
          <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
            Loading map...
          </div>
        )}
      </div>

      {/* Location Info */}
      {location && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>
            Location: {location[1].toFixed(6)}, {location[0].toFixed(6)}
          </span>
        </div>
      )}

      {/* Ward Name Input */}
      <div>
        <label htmlFor="wardName" className="block text-sm font-medium text-gray-700 mb-2">
          Area / Ward Name <span className="text-gray-500">(Optional)</span>
        </label>
        <input
          type="text"
          id="wardName"
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          placeholder="e.g., Alkapuri, Ward 7"
          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500">
          GPS gives coordinates, but knowing your ward helps route complaints faster.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !location}
          className="flex-1 bg-[#2563EB] text-white py-3 rounded-lg font-semibold hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            'Next'
          )}
        </button>
      </div>
    </form>
  )
}

export default Step3Location
