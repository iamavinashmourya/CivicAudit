import { MapPin, Clock, ThumbsUp, ThumbsDown } from 'lucide-react'

function ReportCard({ report, onClick }) {
  const getCategoryEmoji = (category) => {
    const emojis = {
      Road: '🛣️',
      Water: '💧',
      Garbage: '🗑️',
      Electricity: '⚡',
    }
    return emojis[category] || '📍'
  }

  const getStatusColor = (status) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      Verified: 'bg-blue-100 text-blue-700 border-blue-200',
      Resolved: 'bg-green-100 text-green-700 border-green-200',
    }
    return colors[status] || colors.Pending
  }

  const formatTimeAgo = (date) => {
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden border border-gray-200 group"
    >
      {/* Image */}
      <div className="relative w-full h-48 overflow-hidden bg-gray-100">
        <img
          src={report.imageUrl}
          alt={report.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3">
          <span
            className={`px-2 py-1 rounded-md text-xs font-semibold border ${getStatusColor(
              report.status
            )}`}
          >
            {report.status}
          </span>
        </div>
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 rounded-md bg-white/90 backdrop-blur-sm text-lg">
            {getCategoryEmoji(report.category)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">{report.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{report.description}</p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimeAgo(report.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{report.category}</span>
          </div>
        </div>

        {/* Votes */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-green-600">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm font-medium">{report.upvotes}</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-600">
            <ThumbsDown className="w-4 h-4" />
            <span className="text-sm font-medium">{report.downvotes}</span>
          </div>
          <div className="ml-auto text-xs text-gray-500">
            by {report.userId?.name || 'Anonymous'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportCard
