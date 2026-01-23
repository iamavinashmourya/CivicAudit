import { Bell, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

function NotificationDropdown({ isOpen, onClose, notifications, onNotificationClick }) {
    if (!isOpen) return null

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case 'alert':
                return <AlertTriangle className="w-5 h-5 text-amber-500" />
            case 'info':
            default:
                return <Info className="w-5 h-5 text-blue-500" />
        }
    }

    return (
        <>
            {/* Backdrop for mobile (full screen) and desktop (transparent click-away) */}
            <div
                className="fixed inset-0 z-[1050] lg:bg-transparent"
                onClick={onClose}
            />

            {/* Dropdown Container */}
            <div className="absolute top-16 right-4 lg:right-6 w-[calc(100%-32px)] lg:w-96 max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 z-[1100] overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200 origin-top-right">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-200 text-gray-500 lg:hidden"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button className="text-xs text-blue-600 font-medium hover:text-blue-700 hidden lg:block">
                        Mark all read
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => {
                                        onNotificationClick(notification)
                                        onClose()
                                    }}
                                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex gap-3 ${!notification.read ? 'bg-blue-50/30' : ''
                                        }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1.5">
                                            {notification.time}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-gray-100 bg-gray-50/50 text-center lg:hidden">
                    <button className="text-xs text-blue-600 font-medium w-full py-2">
                        Mark all as read
                    </button>
                </div>
            </div>
        </>
    )
}

export default NotificationDropdown
