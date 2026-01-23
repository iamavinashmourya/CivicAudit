import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { MapPin, CheckCircle2, Plus, Loader2, AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'
import CreateReportModal from '../components/CreateReportModal'
import CivicMarker from '../components/CivicMarker'
import ReportDetailModal from '../components/ReportDetailModal'
import { reportsAPI } from '../utils/api'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
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
      }
    }

    checkAuthAndOnboarding()
  }, [navigate])

  useEffect(() => {
    const fallbackLocation = { lat: 22.3072, lng: 73.1812 }

    if (!navigator.geolocation) {
      setUserLocation(fallbackLocation)
      setLocationError('Geolocation is not supported. Showing default view.')
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setIsLocating(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setUserLocation(fallbackLocation)
        setLocationError('Unable to access location.')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  // Fetch nearby reports when user location is available
  useEffect(() => {
    const fetchNearbyReports = async () => {
      if (!userLocation) return

      setIsFetchingReports(true)
      setFetchError('')

      try {
        const response = await reportsAPI.getNearbyReports(userLocation.lat, userLocation.lng)

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
        } else {
          setFetchError(response.message || 'Failed to fetch nearby reports')
        }
      } catch (error) {
        console.error('Error fetching nearby reports:', error)
        setFetchError('Failed to load nearby reports. Please try again.')
      } finally {
        setIsFetchingReports(false)
      }
    }

    fetchNearbyReports()
  }, [userLocation])

  const handleReportClick = (report) => {
    setSelectedReport(report)
  }

  return (
    <Layout user={user} isLoading={isLoading}>
      <div className="flex flex-col h-full bg-white lg:bg-transparent">
        {/* Mobile: Scrollable Content Wrapper */}
        <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] lg:gap-6">

          {/* Map Section */}
          <div className="w-full h-[45vh] lg:h-full lg:flex-1 overflow-hidden relative shadow-md lg:shadow-none border-b lg:border-r border-gray-200 bg-white">
            {isLocating || !userLocation ? (
              <div className="h-full flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-gray-900"></div>
                <p className="mt-4 text-sm text-gray-600">Detecting location...</p>
              </div>
            ) : (
              <MapContainer
                center={[userLocation.lat, userLocation.lng]}
                zoom={16}
                scrollWheelZoom={true}
                className="h-full w-full"
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* User Location Marker */}
                <Marker position={[userLocation.lat, userLocation.lng]}>
                  <Popup>You are here</Popup>
                </Marker>

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
                  {reports.length > 0 && (
                    <>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all" 
                          style={{ 
                            width: `${(reports.filter(r => r.status === 'Resolved').length / reports.length) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Resolved</span>
                        <span className="font-bold text-gray-900">
                          {reports.filter(r => r.status === 'Resolved').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Verified</span>
                        <span className="font-bold text-green-600">
                          {reports.filter(r => r.status === 'Verified').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Critical</span>
                        <span className="font-bold text-red-600">
                          {reports.filter(r => r.aiAnalysis?.priority === 'CRITICAL' || r.aiAnalysis?.isCritical).length}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 bg-white lg:bg-transparent px-4 pt-2 pb-6 lg:py-0 lg:pl-0 lg:pr-5 lg:w-[400px] lg:flex-none overflow-y-auto">
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
              <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-8 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 hide-scrollbar snap-x snap-mandatory">
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

        {/* Floating Action Button - Create Report */}
        <button
          onClick={() => setIsCreateReportModalOpen(true)}
          className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-[500] w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-[#3B5CE8] to-[#14B8A6] hover:from-[#3149ba] hover:to-[#0d9488] text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center group"
          aria-label="Create new report"
        >
          <Plus className="w-6 h-6 lg:w-7 lg:h-7 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
        </button>

        {/* Create Report Modal */}
        <CreateReportModal
          isOpen={isCreateReportModalOpen}
          onClose={() => setIsCreateReportModalOpen(false)}
          initialLocation={userLocation}
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
