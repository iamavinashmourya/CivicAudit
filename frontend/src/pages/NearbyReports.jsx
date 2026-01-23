import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ArrowLeft } from 'lucide-react'
import Layout from '../components/Layout'
import { profileAPI } from '../utils/api'
import ReportCard from '../components/ReportCard'
import ReportDetailModal from '../components/ReportDetailModal'

function NearbyReports() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [userLocation, setUserLocation] = useState(null)

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

  // Fetch nearby reports (mock data for now)
  useEffect(() => {
    if (userLocation) {
      // Mock reports within 2km - In production, this will call GET /api/reports/nearby
      const mockReports = [
        {
          id: '1',
          title: 'Pothole on Main Street',
          category: 'Road',
          description: 'Large pothole causing traffic issues. Needs immediate attention.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Report+1',
          location: { lat: 22.3078, lng: 73.1819 },
          status: 'Pending',
          upvotes: 12,
          downvotes: 2,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          userId: { name: 'John Doe' },
        },
        {
          id: '2',
          title: 'Overflowing Garbage Bin',
          category: 'Garbage',
          description: 'Garbage bin near the park is overflowing and spreading waste.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Report+2',
          location: { lat: 22.3065, lng: 73.1825 },
          status: 'Verified',
          upvotes: 8,
          downvotes: 1,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          userId: { name: 'Jane Smith' },
        },
        {
          id: '3',
          title: 'Streetlight Not Working',
          category: 'Electricity',
          description: 'Streetlight at the corner of Main and First Street has been out for 3 days.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Report+3',
          location: { lat: 22.3082, lng: 73.1803 },
          status: 'Pending',
          upvotes: 15,
          downvotes: 0,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          userId: { name: 'Mike Johnson' },
        },
        {
          id: '4',
          title: 'Water Leakage on Sidewalk',
          category: 'Water',
          description: 'Continuous water leakage from underground pipe creating puddles.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Report+4',
          location: { lat: 22.3070, lng: 73.1815 },
          status: 'Pending',
          upvotes: 6,
          downvotes: 1,
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          userId: { name: 'Sarah Williams' },
        },
        {
          id: '5',
          title: 'Broken Traffic Sign',
          category: 'Road',
          description: 'Stop sign is bent and partially obscured by tree branches.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Report+5',
          location: { lat: 22.3068, lng: 73.1820 },
          status: 'Verified',
          upvotes: 10,
          downvotes: 2,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          userId: { name: 'David Brown' },
        },
      ]
      setReports(mockReports)
    }
  }, [userLocation])

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

        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold">No reports found</p>
            <p className="text-gray-500 text-sm mt-2">
              Try changing the filter, or create the first report in your area.
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
