import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ArrowLeft } from 'lucide-react'
import Layout from '../components/Layout'
import { profileAPI } from '../utils/api'
import ReportCard from '../components/ReportCard'
import ReportDetailModal from '../components/ReportDetailModal'

function ReportHistory() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

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

  // Fetch user's reports (mock data for now)
  useEffect(() => {
    if (user) {
      // Mock reports created by the user - In production, this will call GET /api/reports/my-reports
      const mockUserReports = [
        {
          id: '1',
          title: 'Pothole on Main Street',
          category: 'Road',
          description: 'Large pothole causing traffic issues. Needs immediate attention.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Pothole+Report',
          location: { lat: 22.3078, lng: 73.1819 },
          status: 'Verified',
          upvotes: 12,
          downvotes: 2,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          userId: { name: user.name || 'You' },
        },
        {
          id: '2',
          title: 'Broken Streetlight',
          category: 'Electricity',
          description: 'Streetlight not working for the past week, making the area unsafe at night.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Streetlight+Report',
          location: { lat: 22.3065, lng: 73.1825 },
          status: 'Pending',
          upvotes: 8,
          downvotes: 1,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          userId: { name: user.name || 'You' },
        },
        {
          id: '3',
          title: 'Water Leakage Issue',
          category: 'Water',
          description: 'Continuous water leakage from the main pipeline near the park.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Water+Leak+Report',
          location: { lat: 22.3082, lng: 73.1803 },
          status: 'Resolved',
          upvotes: 15,
          downvotes: 0,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          userId: { name: user.name || 'You' },
        },
        {
          id: '4',
          title: 'Overflowing Garbage Bin',
          category: 'Garbage',
          description: 'Garbage bin near residential area is overflowing and causing hygiene issues.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Garbage+Report',
          location: { lat: 22.3070, lng: 73.1815 },
          status: 'Pending',
          upvotes: 6,
          downvotes: 1,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          userId: { name: user.name || 'You' },
        },
        {
          id: '5',
          title: 'Damaged Road Sign',
          category: 'Road',
          description: 'Traffic sign is damaged and needs replacement for safety.',
          imageUrl: 'https://via.placeholder.com/400x300?text=Road+Sign+Report',
          location: { lat: 22.3068, lng: 73.1820 },
          status: 'Verified',
          upvotes: 10,
          downvotes: 2,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          userId: { name: user.name || 'You' },
        },
      ]
      setReports(mockUserReports)
    }
  }, [user])

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
              <h2 className="text-2xl font-bold text-gray-900">My Report History</h2>
              <p className="text-sm text-gray-600 mt-1">
                All reports you've submitted •{' '}
                <span className="font-semibold text-gray-900">{reports.length}</span> total
              </p>
            </div>
          </div>
        </div>

        {reports.length === 0 ? (
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
