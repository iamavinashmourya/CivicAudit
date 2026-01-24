import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, User, Phone, Calendar, Edit, CreditCard, Shield, CalendarDays, MapPin } from 'lucide-react'
import Layout from '../components/Layout'
import { profileAPI } from '../utils/api'

function Profile() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editFormData, setEditFormData] = useState({
        name: '',
        gender: '',
        dateOfBirth: ''
    })

    const navigate = useNavigate()

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token')
            const userData = localStorage.getItem('user')

            if (!token || !userData) {
                navigate('/login')
                return
            }

            try {
                // Fetch full profile from API
                const profileResponse = await profileAPI.getProfile()
                if (profileResponse.success && profileResponse.user) {
                    setUser(profileResponse.user)
                    // Update localStorage with fresh data
                    localStorage.setItem('user', JSON.stringify(profileResponse.user))
                } else {
                    // Fallback to localStorage if API fails
                    const parsedUser = JSON.parse(userData)
                    setUser(parsedUser)
                }

                // Check onboarding status
                const statusResponse = await profileAPI.getStatus()
                if (statusResponse.success && !statusResponse.onboardingCompleted) {
                    navigate('/onboarding')
                    return
                }
            } catch (error) {
                console.error('Error fetching profile:', error)
                // Fallback to localStorage on error
                try {
                    const parsedUser = JSON.parse(userData)
                    setUser(parsedUser)
                    
                    if (!parsedUser.onboardingCompleted) {
                        navigate('/onboarding')
                        return
                    }
                } catch (parseError) {
                    console.error('Error parsing user data:', parseError)
                    navigate('/login')
                    return
                }
            } finally {
                setIsLoading(false)
            }
        }

        fetchProfile()
    }, [navigate])

    // Calculate age from date of birth
    const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return null
        const today = new Date()
        const birthDate = new Date(dateOfBirth)
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    // Initialize edit form data when user data is loaded
    useEffect(() => {
        if (user) {
            setEditFormData({
                name: user.name || '',
                gender: user.gender || '',
                dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
            })
        }
    }, [user])

    const handleEditToggle = () => {
        if (isEditMode) {
            // Cancel edit - reset form data
            setEditFormData({
                name: user.name || '',
                gender: user.gender || '',
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
            // Prepare data for API (exclude phoneNumber as it can't be changed)
            const updateData = {
                name: editFormData.name.trim(),
                gender: editFormData.gender,
                dateOfBirth: editFormData.dateOfBirth || null
            }

            // Call API to update profile
            const response = await profileAPI.updateIdentity(updateData)
            
            if (response.success) {
                // Fetch updated profile from API
                const profileResponse = await profileAPI.getProfile()
                if (profileResponse.success && profileResponse.user) {
                    setUser(profileResponse.user)
                    localStorage.setItem('user', JSON.stringify(profileResponse.user))
                }

                setIsEditMode(false)
                // Show success message (you can add a toast notification here)
                alert('Profile updated successfully!')
            } else {
                alert(response.message || 'Failed to update profile')
            }
        } catch (error) {
            console.error('Error saving profile:', error)
            alert(error.response?.data?.message || 'Failed to update profile. Please try again.')
        }
    }

    return (
        <Layout user={user} isLoading={isLoading}>
            <div className="max-w-4xl mx-auto p-4 lg:p-8">
                {/* Page Header */}
                <div className="mb-6 lg:mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
                    <p className="text-sm text-gray-600 mt-1">View and manage your account information</p>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-teal-500 px-6 py-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                {user?.profilePhoto ? (
                                    <img
                                        src={user.profilePhoto.startsWith('http') ? user.profilePhoto : `${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5002'}${user.profilePhoto}`}
                                        alt={user.name || 'Profile'}
                                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                        onError={(e) => {
                                            e.target.style.display = 'none'
                                            if (e.target.nextElementSibling) {
                                                e.target.nextElementSibling.style.display = 'flex'
                                            }
                                        }}
                                    />
                                ) : null}
                                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg shrink-0" style={{ display: user?.profilePhoto ? 'none' : 'flex' }}>
                                    <span className="text-4xl font-semibold text-gray-900">
                                        {(user?.name || 'U').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-center sm:text-left">
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            name="name"
                                            value={editFormData.name}
                                            onChange={handleInputChange}
                                            className="text-2xl font-bold text-gray-900 bg-white/90 px-3 py-1 rounded-lg border-0 focus:ring-2 focus:ring-white/50 w-full sm:w-auto text-center sm:text-left mb-1"
                                            placeholder="Your Name"
                                        />
                                    ) : (
                                        <h3 className="text-2xl font-bold text-white mb-1">{user?.name || 'User'}</h3>
                                    )}
                                    <p className="text-blue-100 capitalize">{user?.role || 'Citizen'} Account</p>
                                    {user?.isVerified && (
                                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                                            <CheckCircle2 className="w-4 h-4 text-white" />
                                            <span className="text-sm text-white font-medium">Verified Profile</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Edit/Save/Cancel Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                                {isEditMode ? (
                                    <>
                                        <button
                                            onClick={handleSaveProfile}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-white/90 text-blue-600 rounded-lg transition-all shadow-lg font-medium"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Save</span>
                                        </button>
                                        <button
                                            onClick={handleEditToggle}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-lg transition-all"
                                        >
                                            <span className="font-medium">Cancel</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleEditToggle}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-lg transition-all hover:bg-white/40"
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
                                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                    <Phone className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 font-medium uppercase">Phone Number</p>
                                    <p className="text-base text-gray-900 font-semibold mt-1 truncate">{user?.phoneNumber || 'Not provided'}</p>
                                    {isEditMode && (
                                        <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed</p>
                                    )}
                                </div>
                            </div>

                            {/* Gender */}
                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                                    <User className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 font-medium uppercase">Gender</p>
                                    {isEditMode ? (
                                        <select
                                            name="gender"
                                            value={editFormData.gender}
                                            onChange={handleInputChange}
                                            className="w-full text-base text-gray-900 font-semibold mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize bg-white"
                                        >
                                            <option value="">Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    ) : (
                                        <p className="text-base text-gray-900 font-semibold mt-1 capitalize">{user?.gender || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>

                            {/* Age - Auto-calculated from DOB */}
                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="p-2 bg-green-100 rounded-lg shrink-0">
                                    <Calendar className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 font-medium uppercase">Age</p>
                                    <p className="text-base text-gray-900 font-semibold mt-1">
                                        {user?.age ? `${user.age} years` : (user?.dateOfBirth ? `${calculateAge(user.dateOfBirth)} years` : 'Not provided')}
                                    </p>
                                    {isEditMode && (
                                        <p className="text-xs text-gray-400 mt-1">Age is automatically calculated from date of birth</p>
                                    )}
                                </div>
                            </div>

                            {/* Date of Birth */}
                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="p-2 bg-pink-100 rounded-lg shrink-0">
                                    <CalendarDays className="w-5 h-5 text-pink-600" />
                                </div>
                                <div className="flex-1 min-w-0">
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
                                            {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-IN', {
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
                                <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                                    <CreditCard className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 font-medium uppercase">Aadhaar Number {isEditMode && <span className="text-xs text-gray-400 block sm:inline">(Cannot change)</span>}</p>
                                    <p className="text-base text-gray-900 font-semibold mt-1 font-mono break-all">
                                        {user?.aadhaarNumber ? `****${String(user.aadhaarNumber).slice(-4)}` : 'Not provided'}
                                    </p>
                                </div>
                            </div>

                            {/* Role */}
                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="p-2 bg-cyan-100 rounded-lg shrink-0">
                                    <Shield className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 font-medium uppercase">Account Role</p>
                                    <p className="text-base text-gray-900 font-semibold mt-1 capitalize">{user?.role || 'Citizen'}</p>
                                </div>
                            </div>

                            {/* Ward Name / Location */}
                            {user?.wardName && (
                                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="p-2 bg-teal-100 rounded-lg shrink-0">
                                        <MapPin className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-500 font-medium uppercase">Ward / Area</p>
                                        <p className="text-base text-gray-900 font-semibold mt-1">{user.wardName}</p>
                                    </div>
                                </div>
                            )}

                            {/* Account Created */}
                            {user?.createdAt && (
                                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                                        <Calendar className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
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
        </Layout>
    )
}

export default Profile
