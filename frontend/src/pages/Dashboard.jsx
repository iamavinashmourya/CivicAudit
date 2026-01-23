import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoIcon from '../assets/icons/logo-icon.svg'
import { profileAPI } from '../utils/api'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
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

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoIcon} alt="CivicAudit Logo" className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CivicAudit</h1>
                <p className="text-gray-600">Dashboard</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Welcome, {user.name || 'User'}!</h2>
          <div className="space-y-2">
            <p className="text-gray-600">
              <span className="font-semibold">Phone:</span> {user.phoneNumber}
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">Role:</span> {user.role}
            </p>
          </div>
        </div>

        {/* Placeholder for future features */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <p className="text-gray-600">Report a civic issue, view your reports, and more features coming soon!</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
