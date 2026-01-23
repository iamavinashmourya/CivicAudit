import { useState } from 'react'
import { X, MapPin, Clock, ThumbsUp, ThumbsDown, User, Calendar } from 'lucide-react'

function ReportDetailModal({ report, isOpen, onClose }) {
  const [upvotes, setUpvotes] = useState(report.upvotes || 0)
  const [downvotes, setDownvotes] = useState(report.downvotes || 0)
  const [userVote, setUserVote] = useState(null) // 'up', 'down', or null

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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleUpvote = () => {
    if (userVote === 'up') {
      // Remove upvote
      setUpvotes(upvotes - 1)
      setUserVote(null)
    } else {
      // Add upvote, remove downvote if exists
      setUpvotes(upvotes + 1)
      if (userVote === 'down') {
        setDownvotes(downvotes - 1)
      }
      setUserVote('up')
    }
    // TODO: Call backend API to update vote
  }

  const handleDownvote = () => {
    if (userVote === 'down') {
      // Remove downvote
      setDownvotes(downvotes - 1)
      setUserVote(null)
    } else {
      // Add downvote, remove upvote if exists
      setDownvotes(downvotes + 1)
      if (userVote === 'up') {
        setUpvotes(upvotes - 1)
      }
      setUserVote('down')
    }
    // TODO: Call backend API to update vote
  }

  if (!isOpen || !report) return null

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 overflow-hidden">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[1210] w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-3xl bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#3B5CE8] to-[#14B8A6] px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Report Details</h2>
            <p className="text-xs sm:text-sm text-white/90 mt-0.5 sm:mt-1">View full information about this report</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0 backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-gray-50/50">
          {/* Image */}
          <div className="relative w-full h-56 sm:h-80 rounded-xl overflow-hidden border border-gray-200 mb-6 shadow-sm group">
            <img src={report.imageUrl} alt={report.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <span
                className={`px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm border ${getStatusColor(
                  report.status
                )}`}
              >
                {report.status}
              </span>
            </div>
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
              <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur-md text-xl sm:text-2xl shadow-md border border-white/50">
                {getCategoryEmoji(report.category)}
              </span>
            </div>
          </div>

          {/* Title and Description Container */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">{report.title}</h1>

            <div className="prose prose-sm sm:prose-base text-gray-600 max-w-none">
              <p className="leading-relaxed">{report.description}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="p-2 bg-[#3B5CE8]/10 rounded-lg shrink-0">
                <MapPin className="w-5 h-5 text-[#3B5CE8]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Category</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{report.category}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="p-2 bg-[#14B8A6]/10 rounded-lg shrink-0">
                <Clock className="w-5 h-5 text-[#14B8A6]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reported</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{formatDate(report.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reported By</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {report.userId?.name || 'Anonymous'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Location</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {report.location?.lat?.toFixed(6)}, {report.location?.lng?.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Section (Footer) */}
        <div className="flex-shrink-0 p-4 sm:p-6 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Community Feedback</h3>
            <span className="text-xs sm:text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {upvotes + downvotes} total votes
            </span>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleUpvote}
              className={`flex-1 max-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold transition-all active:scale-95 border ${userVote === 'up'
                ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                : 'bg-white border-green-200 text-green-700 hover:bg-green-50'
                }`}
            >
              <ThumbsUp className={`w-4 h-4 ${userVote === 'up' ? 'fill-green-700' : ''}`} />
              <span className="text-sm">Upvote</span>
              <span className="ml-0.5 text-sm">{upvotes}</span>
            </button>

            <button
              onClick={handleDownvote}
              className={`flex-1 max-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold transition-all active:scale-95 border ${userVote === 'down'
                ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                : 'bg-white border-red-200 text-red-700 hover:bg-red-50'
                }`}
            >
              <ThumbsDown className={`w-4 h-4 ${userVote === 'down' ? 'fill-red-700' : ''}`} />
              <span className="text-sm">Downvote</span>
              <span className="ml-0.5 text-sm">{downvotes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportDetailModal
