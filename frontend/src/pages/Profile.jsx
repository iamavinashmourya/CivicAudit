import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, LayoutDashboard, Map, History, LogOut, Clock, CheckCircle2, ArrowLeft, User, Phone, Calendar, MapPinned, Edit, CreditCard, Shield, CalendarDays } from 'lucide-react'
import logoIcon from '../assets/icons/logo-icon.svg'
import { profileAPI } from '../utils/api'

function Profile() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isEditMode, setIsEditMode] = useState(false)
    const [editFormData, setEditFormData] = useState({
        name: '',
        phoneNumber: '',
        gender: '',
        age: '',
        dateOfBirth: ''
    })

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

    // Live clock
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    // Initialize edit form data when user data is loaded
    useEffect(() => {
        if (user) {
            setEditFormData({
                name: user.name || '',
                phoneNumber: user.phoneNumber || '',
                gender: user.gender || '',
                age: user.age || '',
                dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
            })
        }
    }, [user])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
    }

    const handleEditToggle = () => {
        if (isEditMode) {
            // Cancel edit - reset form data
            setEditFormData({
                name: user.name || '',
                phoneNumber: user.phoneNumber || '',
                gender: user.gender || '',
                age: user.age || '',
                dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
            })
        }
        setIsEditMode(!isEditMode)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSaveProfile = async () => {
        try {
            // TODO: Call API to update profile
            console.log('Saving profile:', editFormData)

            // Update local user state
            const updatedUser = {
                ...user,
                ...editFormData,
                age: editFormData.age ? parseInt(editFormData.age) : user.age
            }
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))

            setIsEditMode(false)
            // TODO: Show success message
        } catch (error) {
            console.error('Error saving profile:', error)
            // TODO: Show error message
        }
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
                        className="flex lg:flex-col items-center lg:items-center gap-3 w-full cursor-pointer"
                    >
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
                        <button
                            onClick={() => navigate('/report-history')}
                            className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm transition-colors"
                        >
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

                {/* Profile Content */}
                <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-4 lg:p-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Page Header */}
                        <div className="flex items-center gap-4 mb-6">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition"
                                aria-label="Back to dashboard"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-700" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
                                <p className="text-sm text-gray-600 mt-1">View and manage your account information</p>
                            </div>
                        </div>

                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Profile Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-teal-500 px-6 py-8">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        {user.profileImageUrl ? (
                                            <img
                                                src={user.profileImageUrl}
                                                alt={user.name || 'Profile'}
                                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg">
                                                <span className="text-4xl font-semibold text-gray-900">
                                                    {(user.name || 'U').charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-center sm:text-left">
                                            <h3 className="text-2xl font-bold text-white">{user.name || 'User'}</h3>
                                            <p className="text-blue-100 mt-1">Citizen Account</p>
                                            {user.onboardingCompleted && (
                                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                                    <span className="text-sm text-white font-medium">Verified Profile</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Edit/Save/Cancel Buttons */}
                                    <div className="flex items-center gap-2">
                                        {isEditMode ? (
                                            <>
                                                <button
                                                    onClick={handleSaveProfile}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-white/90 border border-white/30 text-blue-600 rounded-lg transition-all hover:scale-105 font-medium"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span>Save</span>
                                                </button>
                                                <button
                                                    onClick={handleEditToggle}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-lg transition-all hover:scale-105"
                                                >
                                                    <span className="font-medium">Cancel</span>
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={handleEditToggle}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-lg transition-all hover:scale-105"
                                            >
                                                <Edit className="w-4 h-4" />
                                                <span className="font-medium">Edit Profile</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Profile Details */}
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Phone Number */}
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Phone className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 font-medium uppercase">Phone Number</p>
                                            {isEditMode ? (
                                                <input
                                                    type="tel"
                                                    name="phoneNumber"
                                                    value={editFormData.phoneNumber}
                                                    onChange={handleInputChange}
                                                    className="w-full text-base text-gray-900 font-semibold mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter phone number"
                                                />
                                            ) : (
                                                <p className="text-base text-gray-900 font-semibold mt-1">{user.phoneNumber || 'Not provided'}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Gender */}
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <User className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 font-medium uppercase">Gender</p>
                                            {isEditMode ? (
                                                <select
                                                    name="gender"
                                                    value={editFormData.gender}
                                                    onChange={handleInputChange}
                                                    className="w-full text-base text-gray-900 font-semibold mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                                                >
                                                    <option value="">Select gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            ) : (
                                                <p className="text-base text-gray-900 font-semibold mt-1 capitalize">{user.gender || 'Not provided'}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Age */}
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <Calendar className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 font-medium uppercase">Age</p>
                                            {isEditMode ? (
                                                <input
                                                    type="number"
                                                    name="age"
                                                    value={editFormData.age}
                                                    onChange={handleInputChange}
                                                    className="w-full text-base text-gray-900 font-semibold mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter age"
                                                    min="1"
                                                    max="150"
                                                />
                                            ) : (
                                                <p className="text-base text-gray-900 font-semibold mt-1">{user.age ? `${user.age} years` : 'Not provided'}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Date of Birth */}
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                        <div className="p-2 bg-pink-100 rounded-lg">
                                            <CalendarDays className="w-5 h-5 text-pink-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 font-medium uppercase">Date of Birth</p>
                                            {isEditMode ? (
                                                <input
                                                    type="date"
                                                    name="dateOfBirth"
                                                    value={editFormData.dateOfBirth}
                                                    onChange={handleInputChange}
                                                    className="w-full text-base text-gray-900 font-semibold mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <p className="text-base text-gray-900 font-semibold mt-1">
                                                    {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    }) : 'Not provided'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Aadhaar Number - Read Only */}
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                            <CreditCard className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 font-medium uppercase">Aadhaar Number {isEditMode && <span className="text-xs text-gray-400">(Cannot be changed)</span>}</p>
                                            <p className="text-base text-gray-900 font-semibold mt-1 font-mono">{user.aadhaarNumber || 'Not provided'}</p>
                                        </div>
                                    </div>

                                    {/* Role */}
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                        <div className="p-2 bg-cyan-100 rounded-lg">
                                            <Shield className="w-5 h-5 text-cyan-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 font-medium uppercase">Account Role</p>
                                            <p className="text-base text-gray-900 font-semibold mt-1 capitalize">{user.role || 'Citizen'}</p>
                                        </div>
                                    </div>

                                    {/* Account Created */}
                                    {user.createdAt && (
                                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                            <div className="p-2 bg-gray-100 rounded-lg">
                                                <Calendar className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 font-medium uppercase">Member Since</p>
                                                <p className="text-base text-gray-900 font-semibold mt-1">
                                                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default Profile
