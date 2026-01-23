import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, LayoutDashboard, Map, History, LogOut, Clock, CheckCircle2, ArrowLeft } from 'lucide-react'
import logoIcon from '../assets/icons/logo-icon.svg'
import { profileAPI } from '../utils/api'
import ReportCard from '../components/ReportCard'
import ReportDetailModal from '../components/ReportDetailModal'

function ReportHistory() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

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



  // Live clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleReportClick = (report) => {
    setSelectedReport(report)
    setIsDetailModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    setSelectedReport(null)
  }

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left Sidebar */}
      <aside className="lg:w-64 bg-white text-gray-900 flex lg:flex-col items-center lg:items-stretch justify-between lg:justify-start py-3 lg:py-5 px-4 border-r border-gray-300 shadow-lg lg:sticky lg:top-0 lg:h-screen">
        <div className="flex lg:flex-col items-center lg:items-center gap-3 lg:gap-4 w-full">
          <div
            onClick={() => navigate('/profile')}
            className="flex lg:flex-col items-center lg:items-center gap-3 w-full cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.name || 'Profile'}
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border border-gray-200 hover:ring-2 hover:ring-blue-500 transition-all"
              />
            ) : (
              <div className="flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gray-100 border border-gray-200 hover:ring-2 hover:ring-blue-500 transition-all">
                <span className="text-lg lg:text-xl font-semibold text-gray-900">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex flex-col items-center lg:items-center">
              <h2 className="text-sm lg:text-base font-medium text-gray-900 truncate max-w-[140px] lg:max-w-[180px]">
                {user.name || 'User'}
              </h2>
              <p className="text-xs text-gray-500 hidden lg:block">Citizen</p>
              {user.onboardingCompleted && (
                <div className="mt-1.5 px-2 py-1 rounded-md bg-green-100/30 border border-green-200/50 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Verified profile</span>
                </div>
              )}
            </div>
          </div>

          <nav className="flex lg:flex-col items-center lg:items-stretch gap-3 w-full mt-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => navigate('/nearby-reports')}
              className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm transition-colors"
            >
              <Map className="w-4 h-4" />
              <span>Nearby Reports</span>
            </button>
            <button className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200">
              <History className="w-4 h-4" />
              <span>Report History</span>
            </button>
          </nav>
        </div>

        <div className="w-full lg:mt-auto">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="w-full px-4 lg:px-6 py-3 bg-white border-b border-gray-300 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="CivicAudit Logo" className="w-7 h-7" />
              <div>
                <h1 className="text-base lg:text-lg font-semibold text-gray-900">CivicAudit</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg min-w-[140px]">
              <Clock className="w-4 h-4 text-gray-600" />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 tabular-nums">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Reports List */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-start gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} onClick={() => handleReportClick(report)} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default ReportHistory
