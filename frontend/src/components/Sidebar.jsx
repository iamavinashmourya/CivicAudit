import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Map, History, LogOut, CheckCircle2, Shield } from 'lucide-react'

function Sidebar({ user, onLogout }) {
    const navigate = useNavigate()
    const location = useLocation()

    if (!user) return null

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Nearby Reports', path: '/nearby-reports', icon: Map },
        { label: 'Report History', path: '/report-history', icon: History },
    ]

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 z-30">
            {/* Branding */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900 tracking-tight">CivicAudit</span>
                </div>
            </div>

            {/* Profile Section */}
            <div className="px-4 py-6">
                <div
                    onClick={() => navigate('/profile')}
                    className="flex flex-col items-center p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 hover:scale-[1.02] transition-all border border-gray-100 group"
                >
                    <div className="relative">
                        {user.profilePhoto ? (
                            <img
                                src={user.profilePhoto.startsWith('http') ? user.profilePhoto : `${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5002'}${user.profilePhoto}`}
                                alt={user.name || 'Profile'}
                                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:border-blue-100 transition-colors"
                                onError={(e) => {
                                    e.target.style.display = 'none'
                                    if (e.target.nextElementSibling) {
                                        e.target.nextElementSibling.style.display = 'flex'
                                    }
                                }}
                            />
                        ) : null}
                        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white border-4 border-gray-100 shadow-sm text-2xl font-bold text-gray-700" style={{ display: user?.profilePhoto ? 'none' : 'flex' }}>
                            {(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        {user.isVerified && (
                            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm">
                                <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-50" />
                            </div>
                        )}
                    </div>

                    <div className="mt-3 text-center">
                        <h3 className="font-semibold text-gray-900 truncate max-w-[180px]">
                            {user.name || 'User'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5 capitalize">{user.role || 'Citizen'} Account</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                            {item.label}
                        </button>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
