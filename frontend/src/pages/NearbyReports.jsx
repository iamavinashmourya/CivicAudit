import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'
import { profileAPI, reportsAPI } from '../utils/api'
import ReportCard from '../components/ReportCard'
import ReportDetailModal from '../components/ReportDetailModal'

function NearbyReports() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [isFetchingReports, setIsFetchingReports] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const navigate = useNavigate()
  
  // Get API base URL (without /api for static files)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
  // Static files are served from root, not /api
  // Extract base URL without /api suffix
  const STATIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '') || 'http://localhost:5002'

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

      try {
        const statusResponse = await profileAPI.getStatus()
        if (statusResponse.success && !statusResponse.onboardingCompleted) {
          navigate('/onboarding')
          return
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        if (!parsedUser.onboardingCompleted) {
          navigate('/onboarding')
          return
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndOnboarding()
  }, [navigate])

  // Get user location
  useEffect(() => {
    const fallbackLocation = { lat: 22.3072, lng: 73.1812 }

    if (!navigator.geolocation) {
      setUserLocation(fallbackLocation)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
      },
      () => {
        setUserLocation(fallbackLocation)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [])

  // Fetch nearby reports from API
  useEffect(() => {
    const fetchNearbyReports = async () => {
      if (!userLocation) return

      setIsFetchingReports(true)
      setFetchError('')

      try {
        const response = await reportsAPI.getNearbyReports(userLocation.lat, userLocation.lng)

        if (response.success && response.reports) {
          // Transform backend data to match ReportCard format
          const transformedReports = response.reports.map((report) => {
            // Backend returns location as GeoJSON: { type: 'Point', coordinates: [lng, lat] }
            const coordinates = report.location?.coordinates || []
            const lng = coordinates[0]
            const lat = coordinates[1]

            // Build full image URL (backend returns relative path like /uploads/reports/...)
            // Static files are served from /uploads, not /api/uploads
            const imageUrl = report.imageUrl
              ? report.imageUrl.startsWith('http')
                ? report.imageUrl
                : `${STATIC_BASE_URL}${report.imageUrl}`
              : 'https://via.placeholder.com/400x300?text=No+Image'

            return {
              id: report._id || report.id,
              title: report.title || 'Untitled Report',
              category: report.category || 'Other',
              description: report.description || '',
              imageUrl,
              location: { lat, lng },
              status: report.status || 'Pending',
              // Preserve arrays for vote checking, but also provide counts
              upvotes: Array.isArray(report.upvotes) ? report.upvotes : [],
              downvotes: Array.isArray(report.downvotes) ? report.downvotes : [],
              score: report.score || 0,
              createdAt: new Date(report.createdAt),
              userId: report.userId || { name: 'Unknown User' },
              aiAnalysis: report.aiAnalysis || null,
            }
          })

          // Sort reports by priority: CRITICAL > HIGH > MEDIUM > LOW
          const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 }
          const sortedReports = transformedReports.sort((a, b) => {
            const priorityA = a.aiAnalysis?.priority || 'LOW'
            const priorityB = b.aiAnalysis?.priority || 'LOW'
            const orderA = priorityOrder[priorityA] ?? 3
            const orderB = priorityOrder[priorityB] ?? 3
            
            // If same priority, sort by score (higher score first)
            if (orderA === orderB) {
              return (b.score || 0) - (a.score || 0)
            }
            
            return orderA - orderB
          })
          
          setReports(sortedReports)
        } else {
          setFetchError(response.message || 'Failed to fetch nearby reports')
          setReports([])
        }
      } catch (error) {
        console.error('Error fetching nearby reports:', error)
        setFetchError(
          error.response?.data?.message || 'Failed to fetch nearby reports. Please try again.'
        )
        setReports([])
      } finally {
        setIsFetchingReports(false)
      }
    }

    fetchNearbyReports()
  }, [userLocation, API_BASE_URL])

  const filteredReports = reports

  const handleReportClick = (report) => {
    setSelectedReport(report)
    setIsDetailModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    setSelectedReport(null)
  }

  return (
    <Layout user={user} isLoading={isLoading}>
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 text-center sm:text-left">
          <div className="flex items-start gap-4 justify-center sm:justify-start">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Nearby Reports</h2>
              <p className="text-sm text-gray-600 mt-1">
                Reports within <span className="font-semibold text-gray-900">2km</span> of your location •{' '}
                <span className="font-semibold text-gray-900">{filteredReports.length}</span> found
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isFetchingReports ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-[#3B5CE8] animate-spin mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold">Loading nearby reports...</p>
            <p className="text-gray-500 text-sm mt-2">Finding reports within 2km of your location</p>
          </div>
        ) : fetchError ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold">Error loading reports</p>
            <p className="text-gray-500 text-sm mt-2">{fetchError}</p>
            <button
              onClick={() => {
                setFetchError('')
                if (userLocation) {
                  // Trigger refetch by updating location slightly
                  setUserLocation({ ...userLocation })
                }
              }}
              className="mt-4 px-4 py-2 bg-[#3B5CE8] text-white rounded-lg hover:bg-[#3149ba] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold">No reports found</p>
            <p className="text-gray-500 text-sm mt-2">
              No reports found within 2km of your location. Be the first to create a report in your area!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 pb-20 lg:pb-0">
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} onClick={() => handleReportClick(report)} />
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </Layout>
  )
}

export default NearbyReports
