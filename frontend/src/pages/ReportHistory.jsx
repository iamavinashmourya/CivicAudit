import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'
import { profileAPI, reportsAPI } from '../utils/api'
import ReportCard from '../components/ReportCard'
import ReportDetailModal from '../components/ReportDetailModal'

function ReportHistory() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isFetchingReports, setIsFetchingReports] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const navigate = useNavigate()
  
  // Get API base URL for image URLs
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
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

  // Fetch user's reports from API
  useEffect(() => {
    const fetchUserReports = async () => {
      if (!user) return

      setIsFetchingReports(true)
      setFetchError('')

      try {
        const response = await reportsAPI.getMyReports()

        if (response.success && response.reports) {
          // Transform backend data to match ReportCard format
          const transformedReports = response.reports.map((report) => {
            // Backend returns location as GeoJSON: { type: 'Point', coordinates: [lng, lat] }
            const coordinates = report.location?.coordinates || []
            const lng = coordinates[0]
            const lat = coordinates[1]

            // Build full image URL (backend returns relative path like /uploads/reports/...)
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
              // Preserve arrays for vote checking
              upvotes: Array.isArray(report.upvotes) ? report.upvotes : [],
              downvotes: Array.isArray(report.downvotes) ? report.downvotes : [],
              score: report.score || 0,
              createdAt: new Date(report.createdAt),
              userId: report.userId || { name: user.name || 'You' },
              aiAnalysis: report.aiAnalysis || null,
            }
          })

          setReports(transformedReports)
        } else {
          setFetchError(response.message || 'Failed to fetch your reports')
          setReports([])
        }
      } catch (error) {
        console.error('Error fetching user reports:', error)
        setFetchError(
          error.response?.data?.message || 'Failed to fetch your reports. Please try again.'
        )
        setReports([])
      } finally {
        setIsFetchingReports(false)
      }
    }

    fetchUserReports()
  }, [user, STATIC_BASE_URL])

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
      <div className="max-w-6xl mx-auto px-4 py-4 pb-24 lg:p-6 lg:pb-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 lg:gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">My Report History</h2>
              <p className="text-sm text-gray-600 mt-1">
                All reports you've submitted •{' '}
                <span className="font-semibold text-gray-900">{reports.length}</span> total
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isFetchingReports ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-[#3B5CE8] animate-spin mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold">Loading your reports...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching reports you've submitted</p>
          </div>
        ) : fetchError ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold">Error loading reports</p>
            <p className="text-gray-500 text-sm mt-2">{fetchError}</p>
            <button
              onClick={() => {
                setFetchError('')
                if (user) {
                  // Trigger refetch
                  const fetchUserReports = async () => {
                    setIsFetchingReports(true)
                    try {
                      const response = await reportsAPI.getMyReports()
                      if (response.success && response.reports) {
                        // Transform data (same as above)
                        const transformedReports = response.reports.map((report) => {
                          const coordinates = report.location?.coordinates || []
                          const lng = coordinates[0]
                          const lat = coordinates[1]
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
                            upvotes: Array.isArray(report.upvotes) ? report.upvotes : [],
                            downvotes: Array.isArray(report.downvotes) ? report.downvotes : [],
                            score: report.score || 0,
                            createdAt: new Date(report.createdAt),
                            userId: report.userId || { name: user.name || 'You' },
                            aiAnalysis: report.aiAnalysis || null,
                          }
                        })
                        setReports(transformedReports)
                      }
                    } catch (error) {
                      setFetchError('Failed to fetch reports. Please try again.')
                    } finally {
                      setIsFetchingReports(false)
                    }
                  }
                  fetchUserReports()
                }
              }}
              className="mt-4 px-4 py-2 bg-[#3B5CE8] text-white rounded-lg hover:bg-[#3149ba] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold">No reports found</p>
            <p className="text-gray-500 text-sm mt-2">
              You haven't created any reports yet. Start by creating your first report!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 pb-20 lg:pb-0">
            {reports.map((report) => (
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

export default ReportHistory
