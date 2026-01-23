import { useState } from 'react';
import {
    LayoutDashboard,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Search,
    Filter,
    MapPin,
    MoreVertical,
    LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Types
interface Report {
    id: string;
    type: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    status: 'Verified' | 'Pending' | 'Resolved' | 'Started' | 'In Process';
    location: string;
    time: string;
    image: string;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [statusToUpdate, setStatusToUpdate] = useState<string>('');

    // Mock Data - In real app, fetch from API
    const [reports, setReports] = useState<Report[]>([
        {
            id: 'R-1024',
            type: 'Fire Hazard',
            description: 'Open transformer sparking near school zone.',
            priority: 'Critical',
            status: 'Pending',
            location: 'Sector 14, Vashi',
            time: '10 mins ago',
            image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=200'
        },
        {
            id: 'R-1023',
            type: 'Flooding',
            description: 'Main road blocked due to water logging.',
            priority: 'High',
            status: 'Verified',
            location: 'Alkapuri Junction',
            time: '45 mins ago',
            image: 'https://images.unsplash.com/photo-1574169208502-3e219c8305f6?auto=format&fit=crop&q=80&w=200'
        },
        {
            id: 'R-1022',
            type: 'Garbage Dump',
            description: 'Overflowing bins causing bad odor.',
            priority: 'Medium',
            status: 'Pending',
            location: 'Market Yard',
            time: '2 hours ago',
            image: 'https://images.unsplash.com/photo-1530587191325-3db32d829c56?auto=format&fit=crop&q=80&w=200'
        },
        {
            id: 'R-1021',
            type: 'Pothole',
            description: 'Large pothole causing traffic slowdown.',
            priority: 'Low',
            status: 'Resolved',
            location: 'Station Road',
            time: '5 hours ago',
            image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=200'
        }
    ]);

    // Derived Stats
    const stats = {
        total: reports.length,
        critical: reports.filter(r => r.priority === 'Critical').length,
        completed: reports.filter(r => r.status === 'Resolved').length
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    const handleUpdateStatus = () => {
        if (selectedReport && statusToUpdate) {
            setReports(reports.map(r =>
                r.id === selectedReport.id
                    ? { ...r, status: statusToUpdate as any }
                    : r
            ));
            setSelectedReport(null);
            setStatusToUpdate('');
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Verified': return 'bg-green-100 text-green-700 border-green-200';
            case 'Resolved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Started': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'In Process': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
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
                    {/* Table Header / Controls */}
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Live Incident Stream</h2>
                            <p className="text-sm text-gray-500">Real-time incoming reports from citizens</p>
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
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                    <th className="px-6 py-4">Evidence</th>
                                    <th className="px-6 py-4">Incident Details</th>
                                    <th className="px-6 py-4">Location & Time</th>
                                    <th className="px-6 py-4">Priority</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4 w-24">
                                            <div className="h-16 w-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group-hover:shadow-md transition-shadow">
                                                <img src={report.image} alt="Evidence" className="h-full w-full object-cover" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="font-bold text-gray-900">{report.type}</div>
                                            <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{report.description}</p>
                                            <span className="inline-block mt-2 text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                #{report.id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                {report.location}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {report.time}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(report.priority)}`}>
                                                {report.priority.toUpperCase()}
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
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95"
                                >
                                    Submit Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
