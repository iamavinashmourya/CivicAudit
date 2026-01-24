import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Search,
    Filter,
    MapPin,
    MoreVertical,
    LogOut,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';

// Types
interface Report {
    id: string;
    reportId?: string;
    type: string;
    category?: string;
    description: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'Critical' | 'High' | 'Medium' | 'Low';
    status: 'Verified' | 'Pending' | 'Resolved' | 'Closed' | 'Resolution Pending' | 'Started' | 'In Process';
    location: string;
    locationName?: string;
    time: string;
    image: string;
    imageUrl?: string;
    createdAt?: string;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [statusToUpdate, setStatusToUpdate] = useState<string>('');
    const [reports, setReports] = useState<Report[]>([]);
    const [resolvedReports, setResolvedReports] = useState<Report[]>([]);
    const [activeTab, setActiveTab] = useState<'verified' | 'resolved'>('verified');
    const [stats, setStats] = useState({ total: 0, critical: 0, completed: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingResolved, setIsLoadingResolved] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');

    // Format time ago
    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
        if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    };

    // Transform report data helper
    const transformReport = (report: any): Report => ({
        id: report.id || report._id,
        reportId: report.reportId || `R-${(report.id || report._id).slice(-4)}`,
        type: report.category || report.title || 'Other',
        category: report.category,
        description: report.description || '',
        priority: report.priority || 'LOW',
        status: report.status || 'Pending',
        location: report.locationName || 'Unknown Location',
        locationName: report.locationName,
        time: formatTimeAgo(report.createdAt),
        image: report.imageUrl || null,
        imageUrl: report.imageUrl || null,
        createdAt: report.createdAt
    });

    // Fetch verified reports
    const fetchVerifiedReports = async () => {
        setIsLoading(true);
        setError('');
        try {
            const reportsResponse = await adminAPI.getReports({ status: 'Verified', limit: 100 });
            if (reportsResponse.success) {
                const transformedReports = reportsResponse.reports.map(transformReport);
                setReports(transformedReports);
            }
        } catch (err: any) {
            console.error('Error fetching verified reports:', err);
            setError(err.response?.data?.message || 'Failed to load reports');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch resolved reports
    const fetchResolvedReports = async () => {
        setIsLoadingResolved(true);
        try {
            const reportsResponse = await adminAPI.getReports({ status: 'Resolved', limit: 100 });
            if (reportsResponse.success) {
                const transformedReports = reportsResponse.reports.map(transformReport);
                setResolvedReports(transformedReports);
            }
        } catch (err: any) {
            console.error('Error fetching resolved reports:', err);
        } finally {
            setIsLoadingResolved(false);
        }
    };

    // Fetch dashboard data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch stats and verified reports in parallel
                const [statsResponse] = await Promise.all([
                    adminAPI.getDashboardStats(),
                    fetchVerifiedReports()
                ]);

                if (statsResponse.success) {
                    setStats({
                        total: statsResponse.stats.total || 0,
                        critical: statsResponse.stats.critical || 0,
                        completed: statsResponse.stats.resolved || 0
                    });
                }
            } catch (err: any) {
                console.error('Error fetching dashboard data:', err);
                setError(err.response?.data?.message || 'Failed to load dashboard data');
            }
        };

        fetchData();
        
        // Refresh data every 30 seconds
        const interval = setInterval(() => {
            fetchVerifiedReports();
            if (activeTab === 'resolved') {
                fetchResolvedReports();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch resolved reports when tab is switched
    useEffect(() => {
        if (activeTab === 'resolved' && resolvedReports.length === 0) {
            fetchResolvedReports();
        }
    }, [activeTab]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/login');
    };

    const handleUpdateStatus = async () => {
        if (selectedReport && statusToUpdate) {
            setIsUpdating(true);
            try {
                await adminAPI.updateReportStatus(selectedReport.id, statusToUpdate);
                
                // If status changed to Resolved/Closed, remove from verified list
                if (statusToUpdate === 'Resolved' || statusToUpdate === 'Closed') {
                    setReports(reports.filter(r => r.id !== selectedReport.id));
                    // Refresh resolved reports if on that tab
                    if (activeTab === 'resolved') {
                        await fetchResolvedReports();
                    }
                } else {
                    // Update local state for other status changes
                    setReports(reports.map(r =>
                        r.id === selectedReport.id
                            ? { ...r, status: statusToUpdate as any }
                            : r
                    ));
                }
                
                // Refresh stats
                const statsResponse = await adminAPI.getDashboardStats();
                if (statsResponse.success) {
                    setStats({
                        total: statsResponse.stats.total || 0,
                        critical: statsResponse.stats.critical || 0,
                        completed: statsResponse.stats.resolved || 0
                    });
                }
                
                // Refresh verified reports
                await fetchVerifiedReports();
                
                setSelectedReport(null);
                setStatusToUpdate('');
            } catch (err: any) {
                console.error('Error updating status:', err);
                alert(err.response?.data?.message || 'Failed to update status');
            } finally {
                setIsUpdating(false);
            }
        }
    };

    const getPriorityColor = (priority: string) => {
        const p = priority.toUpperCase();
        switch (p) {
            case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
            case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Verified': return 'bg-green-100 text-green-700 border-green-200';
            case 'Resolved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Closed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Resolution Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Started': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'In Process': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'Pending': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col relative">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">VMC Command Center</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        System Operational
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <LayoutDashboard className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Reports</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stats.total}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-red-50 rounded-xl animate-pulse">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Critical Alerts</p>
                            <h3 className="text-3xl font-bold text-red-600">{stats.critical}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-green-50 rounded-xl">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Completed Issues</p>
                            <h3 className="text-3xl font-bold text-green-600">{stats.completed}</h3>
                        </div>
                    </div>
                </div>

                {/* Smart Table Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 bg-gray-50/50">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('verified')}
                                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${
                                    activeTab === 'verified'
                                        ? 'border-blue-600 text-blue-600 bg-white'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Live Incident Stream
                            </button>
                            <button
                                onClick={() => setActiveTab('resolved')}
                                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${
                                    activeTab === 'resolved'
                                        ? 'border-blue-600 text-blue-600 bg-white'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Resolved Reports
                            </button>
                        </div>
                    </div>

                    {/* Table Header / Controls */}
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {activeTab === 'verified' ? 'Live Incident Stream' : 'Resolved Reports'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {activeTab === 'verified' 
                                    ? 'Real-time incoming reports from citizens' 
                                    : 'All resolved and closed reports'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search location..."
                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                                <Filter className="w-4 h-4" />
                                Filter
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px]">
                        {(activeTab === 'verified' ? isLoading : isLoadingResolved) ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                <span className="ml-3 text-gray-600">Loading reports...</span>
                            </div>
                        ) : error && activeTab === 'verified' ? (
                            <div className="flex items-center justify-center py-12">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                                <span className="ml-3 text-red-600">{error}</span>
                            </div>
                        ) : (activeTab === 'verified' ? reports : resolvedReports).length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-gray-500">No {activeTab === 'verified' ? 'verified' : 'resolved'} reports found</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-6 py-4">Evidence</th>
                                        <th className="px-6 py-4">Incident Details</th>
                                        <th className="px-6 py-4">Location & Time</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(activeTab === 'verified' ? reports : resolvedReports)
                                        .filter(report => 
                                            !searchTerm || 
                                            report.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            report.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            report.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            report.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            report.description?.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4 w-24">
                                            <div className="h-16 w-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group-hover:shadow-md transition-shadow bg-gray-100">
                                                {report.imageUrl || report.image ? (
                                                    <img 
                                                        src={report.imageUrl || report.image} 
                                                        alt="Evidence" 
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            // Replace image with placeholder div on error
                                                            const img = e.currentTarget;
                                                            const parent = img.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = '<div class="h-full w-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">No Image</div>';
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-full w-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                                        No Image
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="font-bold text-gray-900">{report.type || report.category}</div>
                                            <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{report.description}</p>
                                            <span className="inline-block mt-2 text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                #{report.reportId || report.id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                {report.location || report.locationName || 'Unknown Location'}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {report.time}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                {report.category || report.type || 'Other'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(report.status)}`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    setSelectedReport(report);
                                                    setStatusToUpdate(report.status);
                                                }}
                                                className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Status Update Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Update Report Status</h3>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <span className="text-2xl">×</span>
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">
                                Updating status for report <span className="font-mono font-semibold text-gray-700">#{selectedReport.id}</span>
                            </p>

                            <div className="space-y-3">
                                <label
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${statusToUpdate === 'Started'
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value="Started"
                                        checked={statusToUpdate === 'Started'}
                                        onChange={(e) => setStatusToUpdate(e.target.value)}
                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className={`font-medium ${statusToUpdate === 'Started' ? 'text-purple-700' : 'text-gray-700'}`}>
                                        Started
                                    </span>
                                </label>

                                <label
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${statusToUpdate === 'In Process'
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value="In Process"
                                        checked={statusToUpdate === 'In Process'}
                                        onChange={(e) => setStatusToUpdate(e.target.value)}
                                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className={`font-medium ${statusToUpdate === 'In Process' ? 'text-indigo-700' : 'text-gray-700'}`}>
                                        In Process
                                    </span>
                                </label>

                                <label
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${statusToUpdate === 'Resolved'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-green-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value="Resolved"
                                        checked={statusToUpdate === 'Resolved'}
                                        onChange={(e) => setStatusToUpdate(e.target.value)}
                                        className="w-4 h-4 text-green-600 focus:ring-green-500"
                                    />
                                    <span className={`font-medium ${statusToUpdate === 'Resolved' ? 'text-green-700' : 'text-gray-700'}`}>
                                        Resolved
                                    </span>
                                </label>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={isUpdating}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Submit Update'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
