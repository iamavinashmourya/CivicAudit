import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Map, FileText, History, User, PlusCircle } from 'lucide-react'

function BottomNav({ onCreateClick }) {
    const navigate = useNavigate()
    const location = useLocation()

    const navItems = [
        {
            label: 'Home',
            path: '/dashboard',
            icon: LayoutDashboard
        },
        {
            label: 'Nearby',
            path: '/nearby-reports',
            icon: Map
        },
        {
            label: 'Report',
            action: onCreateClick, // Special action for center button
            icon: PlusCircle,
            isSpecial: true
        },
        {
            label: 'History',
            path: '/report-history',
            icon: History
        },
        {
            label: 'Profile',
            path: '/profile',
            icon: User
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 pb-safe-area lg:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-end">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon

                    if (item.isSpecial) {
                        return (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="flex flex-col items-center justify-end -mt-8"
                            >
                                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">
                                    <Icon className="w-7 h-7" />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 mt-1">{item.label}</span>
                            </button>
                        )
                    }

                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center w-16 py-1 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''} transition-all`} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[10px] font-medium mt-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default BottomNav
