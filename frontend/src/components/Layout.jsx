import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, Clock } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'
import CreateReportModal from './CreateReportModal'
import NotificationDropdown from './NotificationDropdown'
import ReportDetailModal from './ReportDetailModal'
import { notificationsAPI, reportsAPI } from '../utils/api'
import logoIcon from '../assets/icons/logo-icon.svg'

function Layout({ user, children, isLoading }) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isNotificationOpen, setIsNotificationOpen] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [selectedReport, setSelectedReport] = useState(null)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    // Fetch notifications (only show unread ones)
    const fetchNotifications = async () => {
        try {
            const response = await notificationsAPI.getNotifications()
            if (response.success) {
                // Only show unread notifications (remove read ones from display)
                const unreadNotifications = (response.notifications || []).filter(n => !n.read)
                setNotifications(unreadNotifications)
                setUnreadCount(response.unreadCount || 0)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        }
    }

    // Fetch notifications on mount and poll every 30 seconds
    useEffect(() => {
        if (user) {
            fetchNotifications()
            const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
            return () => clearInterval(interval)
        }
    }, [user])

    // Check for reportId in URL params (from notification click)
    useEffect(() => {
        const reportId = searchParams.get('reportId')
        if (reportId && user) {
            // Fetch and show report
            reportsAPI.getReportById(reportId)
                .then(response => {
                    if (response.success && response.report) {
                        setSelectedReport(response.report)
                        setIsReportModalOpen(true)
                        // Remove reportId from URL
                        searchParams.delete('reportId')
                        setSearchParams(searchParams, { replace: true })
                    }
                })
                .catch(error => {
                    console.error('Error fetching report:', error)
                })
        }
    }, [searchParams, user])

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

    const openCreateModal = () => setIsCreateModalOpen(true)
    const closeCreateModal = () => setIsCreateModalOpen(false)

    const toggleNotifications = (e) => {
        e.stopPropagation()
        setIsNotificationOpen(!isNotificationOpen)
    }

    const handleNotificationClick = async (notification) => {
        // Mark as read and remove from list (user has seen it)
        try {
            await notificationsAPI.markAsRead(notification.id)
            // Remove notification from list immediately
            setNotifications(notifications.filter(n => n.id !== notification.id))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }

        // If notification has a reportId, show the report
        if (notification.reportId) {
            try {
                const response = await reportsAPI.getReportById(notification.reportId)
                if (response.success && response.report) {
                    setSelectedReport(response.report)
                    setIsReportModalOpen(true)
                }
            } catch (error) {
                console.error('Error fetching report:', error)
                // Fallback to navigation if report fetch fails
                if (notification.link) {
                    navigate(notification.link)
                }
            }
        } else if (notification.link) {
            navigate(notification.link)
        }
        
        setIsNotificationOpen(false)
    }

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsAPI.markAllAsRead()
            setNotifications(notifications.map(n => ({ ...n, read: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Error marking all as read:', error)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600 text-sm">Loading...</p>
                </div>
            </div>
        )
    }

    // Fallback if user is null (shouldn't happen if protected routes work, but safe to check)
    if (!user) return null

    return (
        <div className="flex h-screen bg-gray-50 flex-col lg:flex-row overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar user={user} onLogout={handleLogout} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative">

                {/* Mobile Header (Sticky) */}
                <MobileHeader
                    onNotificationClick={toggleNotifications}
                    unreadCount={unreadCount}
                />

                {/* Desktop Header */}
                <header className="hidden lg:flex w-full px-6 py-3 bg-white border-b border-gray-200 shadow-sm items-center justify-between z-10 relative">
                    <div className="flex items-center gap-3">
                        <img src={logoIcon} alt="CivicAudit Logo" className="w-8 h-8" />
                        <h1 className="text-lg font-bold text-gray-900">CivicAudit</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleNotifications}
                            className={`relative p-2 rounded-lg transition-colors ${isNotificationOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg min-w-[140px] border border-gray-100">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900 tabular-nums">
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Notification Dropdown (Shared for both mobile and desktop) - Outside header so it works on mobile */}
                <NotificationDropdown
                    isOpen={isNotificationOpen}
                    onClose={() => setIsNotificationOpen(false)}
                    notifications={notifications}
                    onNotificationClick={handleNotificationClick}
                    onMarkAllAsRead={handleMarkAllAsRead}
                />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/50 pb-24 lg:pb-0">
                    <Outlet />
                    {children}
                </main>

                {/* Mobile Bottom Navigation */}
                <BottomNav onCreateClick={openCreateModal} />
            </div>

            {/* Create Report Modal (Global) */}
            <CreateReportModal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                userLocation={null} // We might need to pass location here if available from context
            />

            {/* Report Detail Modal (from notifications) */}
            {selectedReport && (
                <ReportDetailModal
                    report={selectedReport}
                    isOpen={isReportModalOpen}
                    onClose={() => {
                        setIsReportModalOpen(false)
                        setSelectedReport(null)
                    }}
                />
            )}
        </div>
    )
}

export default Layout
