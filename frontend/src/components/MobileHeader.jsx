import { Bell } from 'lucide-react'
import logoIcon from '../assets/icons/logo-icon.svg'

function MobileHeader({ onNotificationClick, unreadCount = 0 }) {
    return (
        <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 lg:hidden px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src={logoIcon} alt="CivicAudit" className="w-8 h-8" />
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight">CivicAudit</h1>
                </div>

                <button
                    onClick={onNotificationClick}
                    className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <Bell className="w-5 h-5 text-gray-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                </button>
            </div>
        </header>
    )
}

export default MobileHeader
