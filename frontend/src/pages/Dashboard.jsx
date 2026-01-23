import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { MapPin, LayoutDashboard, Map, History, LogOut, Clock, CheckCircle2, Bell } from 'lucide-react'
import logoIcon from '../assets/icons/logo-icon.svg'
import { profileAPI } from '../utils/api'
import CreateReportModal from '../components/CreateReportModal'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // Frontend-only state for map and location
  const [userLocation, setUserLocation] = useState(null) // { lat, lng }
  const [isLocating, setIsLocating] = useState(true)
  const [locationError, setLocationError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Mock reports used ONLY on the frontend for now.
  // These simulate what we will later receive from GET /api/reports/nearby.
  const demoReports = [
    {
      id: 'demo-1',
      title: 'Pothole near main road',
      category: 'Road',
      lat: 22.3078,
      lng: 73.1819,
    },
    {
      id: 'demo-2',
      title: 'Overflowing garbage bin',
      category: 'Garbage',
      lat: 22.3065,
      lng: 73.1825,
    },
    {
      id: 'demo-3',
      title: 'Streetlight not working',
      category: 'Electricity',
      lat: 22.3082,
      lng: 73.1803,
    },
  ]
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      // Check if user is logged in
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (!token || !userData) {
        navigate('/login')
        return
      }

      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      // Check onboarding status from API
      try {
        const statusResponse = await profileAPI.getStatus()
        if (statusResponse.success && !statusResponse.onboardingCompleted) {
          // Redirect to onboarding if not completed
          navigate('/onboarding')
          return
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        // If API fails, check localStorage user data
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

  // Detect user's current location for centering the map.
  // NOTE: This is purely frontend and does NOT call any backend APIs.
  useEffect(() => {
    // Default center to Vadodara, India if GPS is unavailable/blocked
    const fallbackLocation = { lat: 22.3072, lng: 73.1812 }

    if (!navigator.geolocation) {
      setUserLocation(fallbackLocation)
      setLocationError('Geolocation is not supported by your browser. Showing default city view.')
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setIsLocating(false)
      },
      (error) => {
        console.error('Dashboard geolocation error:', error)
        setUserLocation(fallbackLocation)
        setLocationError('Unable to access your location. Showing city-level map instead.')
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [])

  // Live clock for the header - updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // update every second for smooth clock
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
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
      {/* Left Sidebar - Minimalistic */}
      <aside className="lg:w-64 bg-white text-gray-900 flex lg:flex-col items-center lg:items-stretch justify-between lg:justify-start py-3 lg:py-5 px-4 border-r border-gray-300 shadow-lg lg:sticky lg:top-0 lg:h-screen">
        {/* Top Section: Profile */}
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


          {/* Navigation Menu */}
          <nav className="flex lg:flex-col items-center lg:items-stretch gap-3 w-full mt-1">
            <button className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200">
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
            <button
              onClick={() => navigate('/report-history')}
              className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm transition-colors"
            >
              <History className="w-4 h-4" />
              <span>Report History</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Logout Button */}
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

      {/* Right Side: Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Compact Top Header Bar */}
        <header className="w-full px-4 lg:px-6 py-3 bg-white border-b border-gray-300 shadow-md">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="CivicAudit Logo" className="w-7 h-7" />
              <div>
                <h1 className="text-base lg:text-lg font-semibold text-gray-900">
                  CivicAudit
                </h1>
              </div>
            </div>

            {/* Right Side: Notifications & Time */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>

              {/* Time Clock Widget */}
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

        {/* Main Content: Full Map */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full w-full">
            {/* Map Loading State */}
            {isLocating || !userLocation ? (
              <div className="h-full flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-gray-900"></div>
                <p className="mt-4 text-sm text-gray-600">Detecting location...</p>
              </div>
            ) : (
              <>
                <MapContainer
                  center={[userLocation.lat, userLocation.lng]}
                  zoom={14}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* User Location Marker */}
                  <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup className="custom-popup">
                      <div className="flex items-center gap-2 p-1">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-semibold text-xs text-gray-900">Your Location</p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Demo Report Markers */}
                  {demoReports.map((report) => (
                    <Marker key={report.id} position={[report.lat, report.lng]}>
                      <Popup className="custom-popup">
                        <div className="p-2 space-y-1.5 min-w-[180px]">
                          <h3 className="font-semibold text-sm text-gray-900">{report.title}</h3>
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                            {report.category}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {/* Location Error Toast */}
                {locationError && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[2000] max-w-md w-[90%]">
                    <div className="bg-white rounded-lg shadow-lg px-4 py-3 border border-red-200">
                      <p className="text-sm text-gray-700">{locationError}</p>
                    </div>
                  </div>
                )}

                {/* Floating Action Button */}
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="absolute bottom-5 right-5 z-[1000] flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-colors"
                  aria-label="Create new report"
                >
                  <span className="text-2xl leading-none font-light">+</span>
                </button>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Create Report Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialLocation={userLocation}
      />
    </div>
  )
}

export default Dashboard
