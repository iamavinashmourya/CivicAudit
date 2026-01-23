import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, LayoutDashboard, Map, History, LogOut, Clock, CheckCircle2, Bell, ArrowLeft } from 'lucide-react'
import logoIcon from '../assets/icons/logo-icon.svg'
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
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <aside className="lg:w-64 bg-white text-gray-900 flex lg:flex-col items-center lg:items-stretch justify-between lg:justify-start py-4 lg:py-6 px-4 border-r border-gray-300 shadow-lg">
        <div className="flex lg:flex-col items-center lg:items-center gap-4 lg:gap-6 w-full">
          <div className="flex lg:flex-col items-center lg:items-center gap-3 w-full">
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.name || 'Profile'}
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gray-100 border border-gray-200">
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

          <nav className="flex lg:flex-col items-center lg:items-stretch gap-5 w-full mt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200">
              <Map className="w-4 h-4" />
              <span>Nearby Reports</span>
            </button>
            <button className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm transition-colors">
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
      <div className="flex-1 flex flex-col min-w-0">
        <header className="w-full px-4 lg:px-6 py-3 bg-white border-b border-gray-300 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="CivicAudit Logo" className="w-7 h-7" />
              <div>
                <h1 className="text-base lg:text-lg font-semibold text-gray-900">CivicAudit</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg min-w-[140px]">
                <Clock className="w-4 h-4 text-gray-600" />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Reports List */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Nearby Reports</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Reports within 2km of your location • {reports.length} found
                </p>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No reports found nearby</p>
                <p className="text-gray-500 text-sm mt-2">Be the first to report an issue in your area!</p>
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

export default NearbyReports
