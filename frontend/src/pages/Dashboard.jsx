import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, CheckCircle2, Plus, Loader2, AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'
import CreateReportModal from '../components/CreateReportModal'
import CivicMarker from '../components/CivicMarker'
import ReportDetailModal from '../components/ReportDetailModal'
import { reportsAPI, profileAPI } from '../utils/api'

// Calculate distance between two coordinates using Haversine formula (returns distance in meters)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [homeLocation, setHomeLocation] = useState(null) // Home location from onboarding
  const [currentLocation, setCurrentLocation] = useState(null) // Current GPS location
  const [isLocating, setIsLocating] = useState(true)
  const [locationError, setLocationError] = useState('')
  const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState(false)
  const [reports, setReports] = useState([])
  const [isFetchingReports, setIsFetchingReports] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (!token || !userData) {
        navigate('/login')
        return
      }

      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setIsLoading(false)

      if (!parsedUser.onboardingCompleted) {
        navigate('/onboarding')
        return
      }

      // Fetch user's home location from profile
      try {
        const statusResponse = await profileAPI.getStatus()
        if (statusResponse.success && statusResponse.profile?.location?.coordinates) {
          const [lng, lat] = statusResponse.profile.location.coordinates
          setHomeLocation({ lat, lng })
          setIsLocating(false)
        } else {
          // Fallback to default location if no home location set
          setHomeLocation({ lat: 22.3072, lng: 73.1812 })
          setIsLocating(false)
        }
      } catch (error) {
        console.error('Error fetching home location:', error)
        // Fallback to default location
        setHomeLocation({ lat: 22.3072, lng: 73.1812 })
        setIsLocating(false)
      }
    }

    checkAuthAndOnboarding()
  }, [navigate])

  // Get current GPS location (optional, for showing current position marker)
  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (error) => {
        console.error('Geolocation error:', error)
        // Don't set error, just don't show current location marker
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  // Fetch nearby reports when home location is available
  useEffect(() => {
    const fetchNearbyReports = async () => {
      if (!homeLocation) return

      setIsFetchingReports(true)
      setFetchError('')

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
        console.log('[Dashboard] Fetching nearby reports from:', API_URL)
        console.log('[Dashboard] Location:', { lat: homeLocation.lat, lng: homeLocation.lng })
        
        const response = await reportsAPI.getNearbyReports(homeLocation.lat, homeLocation.lng)

        if (response.success && response.reports) {
          // Transform backend data to match CivicMarker format
          const transformedReports = response.reports.map((report) => {
            // Backend returns location as GeoJSON: { type: 'Point', coordinates: [lng, lat] }
            const coordinates = report.location?.coordinates || []
            const lng = coordinates[0]
            const lat = coordinates[1]

            // Build full image URL
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
            const STATIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '') || 'http://localhost:5002'
            const imageUrl = report.imageUrl
              ? report.imageUrl.startsWith('http')
                ? report.imageUrl
                : `${STATIC_BASE_URL}${report.imageUrl}`
              : null

            return {
              id: report._id || report.id,
              _id: report._id,
              title: report.title || 'Untitled Report',
              category: report.category || 'Other',
              description: report.description || '',
              imageUrl,
              location: { lat, lng, coordinates: [lng, lat] },
              status: report.status || 'Pending',
              upvotes: Array.isArray(report.upvotes) ? report.upvotes : [],
              downvotes: Array.isArray(report.downvotes) ? report.downvotes : [],
              score: report.score || 0,
              createdAt: new Date(report.createdAt),
              userId: report.userId || { name: 'Unknown User' },
              aiAnalysis: report.aiAnalysis || { priority: 'LOW', isCritical: false },
            }
          })

          // Filter out Pending reports from map display
          const filteredReports = transformedReports.filter(report => report.status !== 'Pending')
          setReports(filteredReports)
          console.log('[Dashboard] Successfully loaded', filteredReports.length, 'reports')
        } else {
          const errorMsg = response.message || 'Failed to fetch nearby reports'
          console.error('[Dashboard] API returned error:', errorMsg)
          setFetchError(errorMsg)
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching nearby reports:', error)
        console.error('[Dashboard] Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
        })
        
        // Provide more helpful error messages
        let errorMessage = 'Failed to load nearby reports. '
        if (error.response) {
          // Server responded with error
          if (error.response.status === 401) {
            errorMessage += 'Authentication failed. Please login again.'
          } else if (error.response.status === 404) {
            errorMessage += 'API endpoint not found. Check backend configuration.'
          } else if (error.response.data?.message) {
            errorMessage += error.response.data.message
          } else {
            errorMessage += `Server error (${error.response.status})`
          }
        } else if (error.request) {
          // Request was made but no response received
          errorMessage += 'Cannot connect to backend. Check if backend is running and VITE_API_URL is set correctly.'
        } else {
          // Something else happened
          errorMessage += error.message || 'Unknown error occurred.'
        }
        
        setFetchError(errorMessage)
      } finally {
        setIsFetchingReports(false)
      }
    }

    fetchNearbyReports()
  }, [homeLocation])

  const handleReportClick = (report) => {
    setSelectedReport(report)
  }

  return (
    <Layout user={user} isLoading={isLoading}>
      <div className="flex flex-col h-full bg-white lg:bg-transparent">
        {/* Mobile: Scrollable Content Wrapper */}
        <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] lg:gap-6">

          {/* Map Section */}
          <div className="w-full h-[60vh] lg:h-full lg:flex-1 overflow-hidden relative shadow-md lg:shadow-none border-b lg:border-r border-gray-200 bg-white">
            {isLocating || !homeLocation ? (
              <div className="h-full flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-gray-900"></div>
                <p className="mt-4 text-sm text-gray-600">Loading your home area...</p>
              </div>
            ) : (
              <MapContainer
                center={[homeLocation.lat, homeLocation.lng]}
                zoom={16}
                scrollWheelZoom={true}
                className="h-full w-full"
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Home Area Circle (2km radius) */}
                <Circle
                  center={[homeLocation.lat, homeLocation.lng]}
                  radius={2000}
                  pathOptions={{
                    color: '#3B5CE8',
                    fillColor: '#3B5CE8',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                />
                {/* Home Location Marker */}
                <Marker position={[homeLocation.lat, homeLocation.lng]}>
                  <Popup>Your Home Area</Popup>
                </Marker>
                {/* Current Location Marker (only if within 2km of home) */}
                {currentLocation && homeLocation && (() => {
                  const distance = calculateDistance(
                    homeLocation.lat,
                    homeLocation.lng,
                    currentLocation.lat,
                    currentLocation.lng
                  )
                  // Show current location marker only if within 2km (2000 meters)
                  if (distance <= 2000) {
                    // Create custom icon for current location (blue with person icon)
                    const currentLocationIcon = L.divIcon({
                      className: 'current-location-marker',
                      html: `
                        <div style="
                          width: 32px;
                          height: 32px;
                          background: #10B981;
                          border: 3px solid white;
                          border-radius: 50%;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                        ">
                          <div style="
                            width: 12px;
                            height: 12px;
                            background: white;
                            border-radius: 50%;
                          "></div>
                        </div>
                      `,
                      iconSize: [32, 32],
                      iconAnchor: [16, 16],
                      popupAnchor: [0, -16],
                    })
                    return (
                      <Marker 
                        position={[currentLocation.lat, currentLocation.lng]}
                        icon={currentLocationIcon}
                      >
                        <Popup>You are here ({Math.round(distance)}m from home)</Popup>
                      </Marker>
                    )
                  }
                  return null
                })()}

                {/* Smart Markers for Reports */}
                {reports.map((report) => (
                  <CivicMarker 
                    key={report.id || report._id} 
                    report={report}
                    onReportClick={handleReportClick}
                  />
                ))}
              </MapContainer>
            )}

            {/* Desktop Stats Overlay */}
            <div className="hidden lg:block absolute top-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100 z-[400] w-64">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Area Overview</h3>
              {isFetchingReports ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-[#3B5CE8] animate-spin" />
                </div>
              ) : fetchError ? (
                <div className="text-xs text-red-600 py-2">{fetchError}</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Active Reports</span>
                    <span className="font-bold text-gray-900">{reports.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="h-[40vh] lg:flex-1 bg-white lg:bg-transparent px-4 pt-2 pb-24 lg:pb-6 lg:py-0 lg:pl-0 lg:pr-5 lg:w-[400px] lg:flex-none overflow-y-visible lg:overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3 lg:hidden"></div>

            <div className="flex items-center mb-4 mt-1">
              <h2 className="text-xl font-bold text-gray-900">Nearby Reports</h2>
            </div>

            {/* Reports List */}
            {isFetchingReports ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#3B5CE8] animate-spin" />
              </div>
            ) : fetchError ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                <p className="text-gray-700 text-sm font-semibold">Error loading reports</p>
                <p className="text-gray-500 text-xs mt-2">{fetchError}</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 text-sm font-semibold">No reports found</p>
                <p className="text-gray-500 text-xs mt-2">No reports found within 2km of your location.</p>
              </div>
            ) : (
              <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible overflow-y-visible pb-0 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 hide-scrollbar snap-x snap-mandatory">
                {reports.map((report) => (
                  <div 
                    key={report.id || report._id} 
                    onClick={() => handleReportClick(report)}
                    className="min-w-[85vw] lg:min-w-0 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all snap-center group cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        report.category === 'Road' ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100' :
                        report.category === 'Garbage' ? 'bg-red-50 text-red-600 group-hover:bg-red-100' :
                        report.category === 'Electricity' ? 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100' :
                        report.category === 'Water' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' :
                        'bg-gray-50 text-gray-600 group-hover:bg-gray-100'
                      }`}>
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 py-1 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 line-clamp-2 flex-1">{report.title}</h3>
                          {report.status === 'Verified' && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                          {report.category} • {report.aiAnalysis?.priority || 'LOW'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button - Create Report (Hidden on mobile, shown on desktop) */}
        <button
          onClick={() => setIsCreateReportModalOpen(true)}
          className="hidden lg:flex fixed bottom-8 right-8 z-[500] w-16 h-16 bg-gradient-to-r from-[#3B5CE8] to-[#14B8A6] hover:from-[#3149ba] hover:to-[#0d9488] text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 active:scale-95 items-center justify-center group"
          aria-label="Create new report"
        >
          <Plus className="w-7 h-7 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
        </button>

        {/* Create Report Modal */}
        <CreateReportModal
          isOpen={isCreateReportModalOpen}
          onClose={() => setIsCreateReportModalOpen(false)}
          initialLocation={homeLocation || currentLocation}
        />

        {/* Report Detail Modal */}
        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            isOpen={!!selectedReport}
            onClose={() => setSelectedReport(null)}
          />
        )}
      </div>
    </Layout>
  )
}

export default Dashboard
