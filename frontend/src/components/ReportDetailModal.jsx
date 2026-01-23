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
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[1210] w-full max-w-3xl max-h-[95vh] bg-white rounded-2xl shadow-2xl my-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#3B5CE8] to-[#14B8A6] px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">Report Details</h2>
            <p className="text-xs sm:text-sm text-white/90 mt-1">View full information about this report</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-white/20 text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {/* Image */}
          <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden border-2 border-gray-200 mb-6">
            <img src={report.imageUrl} alt={report.title} className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4">
              <span
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${getStatusColor(
                  report.status
                )}`}
              >
                {report.status}
              </span>
            </div>
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-2xl">
                {getCategoryEmoji(report.category)}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{report.title}</h1>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{report.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-[#3B5CE8]/10 rounded-lg">
                <MapPin className="w-5 h-5 text-[#3B5CE8]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <p className="text-sm font-semibold text-gray-900">{report.category}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-[#14B8A6]/10 rounded-lg">
                <Clock className="w-5 h-5 text-[#14B8A6]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Reported</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(report.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Reported By</p>
                <p className="text-sm font-semibold text-gray-900">
                  {report.userId?.name || 'Anonymous'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Location</p>
                <p className="text-sm font-semibold text-gray-900">
                  {report.location?.lat?.toFixed(6)}, {report.location?.lng?.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Voting Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Feedback</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={handleUpvote}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  userVote === 'up'
                    ? 'bg-green-500 text-white shadow-lg scale-105'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
                <span>Upvote</span>
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm">{upvotes}</span>
              </button>

              <button
                onClick={handleDownvote}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  userVote === 'down'
                    ? 'bg-red-500 text-white shadow-lg scale-105'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <ThumbsDown className="w-5 h-5" />
                <span>Downvote</span>
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm">{downvotes}</span>
              </button>

              <div className="ml-auto text-sm text-gray-600">
                <span className="font-medium">{upvotes + downvotes}</span> total votes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportDetailModal
