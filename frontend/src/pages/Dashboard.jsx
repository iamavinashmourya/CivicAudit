import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { MapPin, CheckCircle2 } from 'lucide-react'
import Layout from '../components/Layout'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(true)
  const [locationError, setLocationError] = useState('')

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
                zoom={14}
                scrollWheelZoom={true}
                className="h-full w-full"
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[userLocation.lat, userLocation.lng]}>
                  <Popup>You are here</Popup>
                </Marker>

                {demoReports.map((report) => (
                  <Marker key={report.id} position={[report.lat, report.lng]}>
                    <Popup>
                      <div className="p-1">
                        <p className="font-semibold text-sm">{report.title}</p>
                        <p className="text-xs text-gray-500">{report.category}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}

            {/* Desktop Stats Overlay */}
            <div className="hidden lg:block absolute top-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100 z-[400] w-64">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Area Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Active Reports</span>
                  <span className="font-bold text-gray-900">12</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[60%]"></div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Resolved</span>
                  <span className="font-bold text-gray-900">8</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 bg-white lg:bg-transparent px-4 pt-2 pb-6 lg:py-0 lg:pl-0 lg:pr-5 lg:w-[400px] lg:flex-none overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3 lg:hidden"></div>

            <div className="flex items-center mb-4 mt-1">
              <h2 className="text-xl font-bold text-gray-900">Nearby Reports</h2>
            </div>

            {/* Horizontal Scroll for reports on mobile */}
            <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-8 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 hide-scrollbar snap-x snap-mandatory">
              {demoReports.map((report) => (
                <div key={report.id} className="min-w-[85vw] lg:min-w-0 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all snap-center group">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${report.category === 'Road' ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100' :
                      report.category === 'Garbage' ? 'bg-red-50 text-red-600 group-hover:bg-red-100' :
                        'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                      }`}>
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 py-1">
                      <h3 className="font-bold text-gray-900 line-clamp-1">{report.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 font-medium">{report.category} • 2h ago</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
