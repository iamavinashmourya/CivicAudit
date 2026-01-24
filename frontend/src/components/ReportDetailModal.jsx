import { useState, useEffect } from 'react'
import { X, MapPin, Clock, ThumbsUp, ThumbsDown, User, Calendar, Loader2, AlertCircle } from 'lucide-react'
import { reportsAPI } from '../utils/api'

function ReportDetailModal({ report, isOpen, onClose }) {
  // Get API base URL (without /api for static files)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
  // Static files are served from root, not /api
  // Extract base URL without /api suffix
  const STATIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '') || 'http://localhost:5002'
  
  // Get current user ID from localStorage
  const getCurrentUserId = () => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        return user._id || user.id || null
      }
    } catch (error) {
      console.error('Error getting user ID:', error)
    }
    return null
  }
  
  // Check if current user is the report owner
  const isOwnReport = (reportToCheck = null) => {
    const userId = getCurrentUserId()
    if (!userId) return false
    
    // Use reportData if available, otherwise use report prop, or passed parameter
    const checkReport = reportToCheck || reportData || report
    if (!checkReport) return false
    
    const reportUserId = checkReport.userId?._id || checkReport.userId?.id || checkReport.userId
    if (!reportUserId) return false
    
    return String(reportUserId) === String(userId)
  }

  // Check if current user has already verified/rejected resolution
  const checkUserResolutionVote = (reportData) => {
    const userId = getCurrentUserId()
    if (!userId || !reportData?.resolutionVerification) {
      return null
    }

    const userIdStr = String(userId)
    
    // Check if user has approved
    const hasApproved = reportData.resolutionVerification.approvals?.some(
      a => String(a.userId) === userIdStr
    )
    
    // Check if user has rejected
    const hasRejected = reportData.resolutionVerification.rejections?.some(
      r => String(r.userId) === userIdStr
    )

    if (hasApproved) return 'approve'
    if (hasRejected) return 'reject'
    return null
  }
  
  // Initialize state from report prop
  const [upvotes, setUpvotes] = useState(report?.upvotes?.length || report?.upvotes || 0)
  const [downvotes, setDownvotes] = useState(report?.downvotes?.length || report?.downvotes || 0)
  const [score, setScore] = useState(report?.score || 0)
  const [status, setStatus] = useState(report?.status || 'Pending')
  const [userVote, setUserVote] = useState(null) // 'up', 'down', or null
  const [isVoting, setIsVoting] = useState(false)
  const [voteError, setVoteError] = useState('')
  const [hasVoted, setHasVoted] = useState(false) // Track if user has already voted
  const [isFetchingReport, setIsFetchingReport] = useState(false)
  const [isVerifyingResolution, setIsVerifyingResolution] = useState(false)
  const [resolutionVerification, setResolutionVerification] = useState(null)
  const [hasVerifiedResolution, setHasVerifiedResolution] = useState(false) // Track if user has already verified/rejected
  const [userResolutionVote, setUserResolutionVote] = useState(null) // 'approve' or 'reject' or null
  const [reportData, setReportData] = useState(report) // Store fetched report data
  const [isOwnReportState, setIsOwnReportState] = useState(false) // Track if this is user's own report
  const [locationName, setLocationName] = useState('Loading location...')
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  
  // Reverse geocoding to get location name from coordinates
  const fetchLocationName = async (lat, lng) => {
    if (!lat || !lng) {
      setLocationName('Location not available')
      return
    }
    
    setIsLoadingLocation(true)
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'CivicAudit/1.0' // Required by Nominatim
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch location')
      }
      
      const data = await response.json()
      
      // Extract location name from response
      if (data.address) {
        // Try to get a meaningful and specific location name
        const address = data.address
        let location = ''
        
        // Priority order for more specific location:
        // 1. Road/Street name (most specific)
        // 2. Locality/Area
        // 3. Suburb/Neighborhood
        // 4. City/Town
        // 5. District
        // 6. State (only as last resort)
        
        if (address.road || address.street) {
          // If we have a road/street, use it with locality or suburb
          location = address.road || address.street
          if (address.locality) {
            location += `, ${address.locality}`
          } else if (address.suburb) {
            location += `, ${address.suburb}`
          } else if (address.neighbourhood) {
            location += `, ${address.neighbourhood}`
          }
          // Add city if available
          if (address.city || address.town) {
            location += `, ${address.city || address.town}`
          }
        } else if (address.locality) {
          // Locality is a specific area name
          location = address.locality
          if (address.city || address.town) {
            location += `, ${address.city || address.town}`
          }
        } else if (address.suburb) {
          location = address.suburb
          if (address.city || address.town) {
            location += `, ${address.city || address.town}`
          }
        } else if (address.neighbourhood) {
          location = address.neighbourhood
          if (address.city || address.town) {
            location += `, ${address.city || address.town}`
          }
        } else if (address.city) {
          location = address.city
          // Add district if available for more specificity
          if (address.county || address.district) {
            location = `${address.city}, ${address.county || address.district}`
          }
        } else if (address.town) {
          location = address.town
          if (address.county || address.district) {
            location = `${address.town}, ${address.county || address.district}`
          }
        } else if (address.village) {
          location = address.village
          if (address.city || address.town) {
            location += `, ${address.city || address.town}`
          }
        } else if (address.county || address.district) {
          // Use district/county instead of just state
          location = address.county || address.district
          if (address.state) {
            location += `, ${address.state}`
          }
        } else if (address.state) {
          // State is the last resort
          location = address.state
        } else if (data.display_name) {
          // Fallback: parse display_name to get more specific parts
          const parts = data.display_name.split(',')
          // Try to get first 2-3 parts which usually contain specific location
          if (parts.length >= 2) {
            location = parts.slice(0, 2).join(', ').trim()
          } else {
            location = parts[0] || 'Unknown location'
          }
        } else {
          location = 'Unknown location'
        }
        
        setLocationName(location)
      } else if (data.display_name) {
        // Fallback: parse display_name intelligently
        const parts = data.display_name.split(',')
        // Get first 2-3 parts for more specific location
        if (parts.length >= 2) {
          setLocationName(parts.slice(0, 2).join(', ').trim())
        } else {
          setLocationName(parts[0] || 'Location not available')
        }
      } else {
        setLocationName('Location not available')
      }
    } catch (error) {
      console.error('Error fetching location name:', error)
      setLocationName('Location not available')
    } finally {
      setIsLoadingLocation(false)
    }
  }
  
  // Check if current user has already voted
  const checkUserVote = (reportData) => {
    const userId = getCurrentUserId()
    if (!userId || !reportData) return null
    
    // Handle both array and number formats
    let upvotesArray = reportData.upvotes
    let downvotesArray = reportData.downvotes
    
    // If it's a number, we can't check individual votes (no array available)
    if (typeof upvotesArray === 'number' || typeof downvotesArray === 'number') {
      // If we only have counts, we can't determine if user voted
      // This happens when data comes from transformed format
      return null
    }
    
    // Ensure they are arrays (handle null/undefined)
    upvotesArray = Array.isArray(upvotesArray) ? upvotesArray : []
    downvotesArray = Array.isArray(downvotesArray) ? downvotesArray : []
    
    // Check if user ID is in upvotes or downvotes arrays
    try {
      const hasUpvoted = upvotesArray.some(id => {
        const idStr = typeof id === 'object' ? id.toString() : String(id)
        return idStr === String(userId)
      })
      
      const hasDownvoted = downvotesArray.some(id => {
        const idStr = typeof id === 'object' ? id.toString() : String(id)
        return idStr === String(userId)
      })
      
      if (hasUpvoted) return 'up'
      if (hasDownvoted) return 'down'
    } catch (error) {
      console.error('Error checking user vote:', error)
      return null
    }
    
    return null
  }
  
  // Reset location name when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLocationName('Loading location...')
    }
  }, [isOpen])
  
  // Fetch latest report data from API when modal opens
  useEffect(() => {
    const fetchReportData = async () => {
      if (!isOpen || !report) return
      
      const reportId = report.id || report._id
      if (!reportId) return
      
      // Check if this is user's own report
      setIsOwnReportState(isOwnReport())
      
      setIsFetchingReport(true)
      try {
        const response = await reportsAPI.getReportById(reportId)
        if (response.success && response.report) {
          setReportData(response.report)
          // Update state with fresh data from API
          setUpvotes(response.report.upvotes?.length || 0)
          setDownvotes(response.report.downvotes?.length || 0)
          setScore(response.report.score || 0)
          setStatus(response.report.status || 'Pending')
          
          // Check if this is user's own report (using fresh data)
          const ownReport = isOwnReport(response.report)
          setIsOwnReportState(ownReport)
          
          // Check if current user has already voted (works for both own and others' reports)
          const vote = checkUserVote(response.report)
          setUserVote(vote)
          setHasVoted(vote !== null)
          
          // Set resolution verification data if available
          if (response.report.resolutionVerification) {
            setResolutionVerification(response.report.resolutionVerification)
            
            // Check if user has already voted
            const vote = checkUserResolutionVote(response.report)
            setUserResolutionVote(vote)
            setHasVerifiedResolution(vote !== null)
          } else {
            setHasVerifiedResolution(false)
            setUserResolutionVote(null)
          }
          
          // Fetch location name from coordinates
          let lat, lng
          if (response.report.location?.lat !== undefined) {
            lat = response.report.location.lat
            lng = response.report.location.lng
          } else if (response.report.location?.coordinates) {
            [lng, lat] = response.report.location.coordinates
          }
          if (lat && lng) {
            fetchLocationName(lat, lng)
          }
        }
      } catch (error) {
        console.error('Error fetching report data:', error)
        // Fallback to prop data if API fails
        setReportData(report)
        setIsOwnReportState(isOwnReport())
        
        // Try to get location from prop
        let lat, lng
        if (report?.location?.lat !== undefined) {
          lat = report.location.lat
          lng = report.location.lng
        } else if (report?.location?.coordinates) {
          [lng, lat] = report.location.coordinates
        }
        if (lat && lng) {
          fetchLocationName(lat, lng)
        }
      } finally {
        setIsFetchingReport(false)
      }
    }
    
    fetchReportData()
  }, [isOpen, report?.id, report?._id])
  
  // Update state when report prop changes (fallback)
  useEffect(() => {
    if (report && !isFetchingReport) {
      setUpvotes(report.upvotes?.length || report.upvotes || 0)
      setDownvotes(report.downvotes?.length || report.downvotes || 0)
      setScore(report.score || 0)
      setStatus(report.status || 'Pending')
      
      // Check if current user has already voted
      const vote = checkUserVote(report)
      setUserVote(vote)
      setHasVoted(vote !== null)
      
      // Fetch location name from coordinates
      let lat, lng
      if (report.location?.lat !== undefined) {
        lat = report.location.lat
        lng = report.location.lng
      } else if (report.location?.coordinates) {
        [lng, lat] = report.location.coordinates
      }
      if (lat && lng) {
        fetchLocationName(lat, lng)
      }
    }
  }, [report])
  
  // Use reportData (from API) or fallback to report prop
  const currentReport = reportData || report
  
  // Build absolute image URL
  const getImageUrl = () => {
    if (!currentReport?.imageUrl) {
      // Use data URI as fallback instead of external placeholder
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBhdmFpbGFibGU8L3RleHQ+PC9zdmc+'
    }
    if (currentReport.imageUrl.startsWith('http')) return currentReport.imageUrl
    // Static files are served from /uploads, not /api/uploads
    return `${STATIC_BASE_URL}${currentReport.imageUrl}`
  }

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
      Rejected: 'bg-red-100 text-red-700 border-red-200',
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

  const handleUpvote = async () => {
    const reportId = report.id || report._id
    if (!reportId) return
    
    setIsVoting(true)
    setVoteError('')
    
    try {
      const response = await reportsAPI.vote(reportId, 'up')
      
      if (response.success) {
        // Backend returns report object with upvotes/downvotes arrays
        if (response.report) {
          setUpvotes(response.report.upvotes?.length || 0)
          setDownvotes(response.report.downvotes?.length || 0)
          setScore(response.report.score || response.score || 0)
          setStatus(response.report.status || response.status || status)
          
          // Update reportData with fresh data
          setReportData(prev => ({ ...prev, ...response.report }))
          
          // Check if user has voted after the update
          const vote = checkUserVote(response.report)
          setUserVote(vote)
          setHasVoted(vote !== null)
        } else {
          // Fallback: use score and status directly
          setScore(response.score || score)
          setStatus(response.status || status)
          // Mark as voted
          setUserVote('up')
          setHasVoted(true)
          setUpvotes(upvotes + 1)
        }
        setVoteError('') // Clear any previous errors
        
        // Fetch fresh report data to ensure status is up-to-date
        const reportId = report.id || report._id
        if (reportId) {
          try {
            const freshResponse = await reportsAPI.getReportById(reportId)
            if (freshResponse.success && freshResponse.report) {
              setReportData(freshResponse.report)
              setStatus(freshResponse.report.status || status)
            }
          } catch (err) {
            console.error('Error fetching fresh report data:', err)
          }
        }
      } else {
        setVoteError(response.message || 'Failed to update vote')
      }
    } catch (error) {
      console.error('Vote error:', error)
      setVoteError(error.response?.data?.message || 'Failed to update vote. Please try again.')
    } finally {
      setIsVoting(false)
    }
  }

  const handleDownvote = async () => {
    const reportId = report.id || report._id
    if (!reportId) return
    
    setIsVoting(true)
    setVoteError('')
    
    try {
      const response = await reportsAPI.vote(reportId, 'down')
      
      if (response.success) {
        // Backend returns report object with upvotes/downvotes arrays
        if (response.report) {
          setUpvotes(response.report.upvotes?.length || 0)
          setDownvotes(response.report.downvotes?.length || 0)
          setScore(response.report.score || response.score || 0)
          setStatus(response.report.status || response.status || status)
          
          // Update reportData with fresh data
          setReportData(prev => ({ ...prev, ...response.report }))
          
          // Check if user has voted after the update
          const vote = checkUserVote(response.report)
          setUserVote(vote)
          setHasVoted(vote !== null)
        } else {
          // Fallback: use score and status directly
          setScore(response.score || score)
          setStatus(response.status || status)
          // Mark as voted
          setUserVote('down')
          setHasVoted(true)
          setDownvotes(downvotes + 1)
        }
        setVoteError('') // Clear any previous errors
        
        // Fetch fresh report data to ensure status is up-to-date
        const reportId = report.id || report._id
        if (reportId) {
          try {
            const freshResponse = await reportsAPI.getReportById(reportId)
            if (freshResponse.success && freshResponse.report) {
              setReportData(freshResponse.report)
              setStatus(freshResponse.report.status || status)
            }
          } catch (err) {
            console.error('Error fetching fresh report data:', err)
          }
        }
      } else {
        setVoteError(response.message || 'Failed to update vote')
      }
    } catch (error) {
      console.error('Vote error:', error)
      setVoteError(error.response?.data?.message || 'Failed to update vote. Please try again.')
    } finally {
      setIsVoting(false)
    }
  }

  if (!isOpen || !report) {
    return null
  }
  
  // Safety check - ensure we have minimum required data
  if (!report.id && !report._id) {
    console.error('ReportDetailModal: Report missing ID', report)
    return null
  }
  
  // Use reportData (from API) or fallback to report prop
  const displayReport = reportData || report

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
          <div className="relative w-full h-56 sm:h-80 rounded-xl overflow-hidden border border-gray-200 mb-6 shadow-sm group bg-gray-100">
            <img 
              src={getImageUrl()} 
              alt={displayReport.title || 'Report image'} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              onError={(e) => {
                // Fallback to data URI if image fails to load
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
              }}
            />
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <span
                className={`px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm border ${getStatusColor(
                  status
                )}`}
              >
                {status}
              </span>
            </div>
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
              <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur-md text-xl sm:text-2xl shadow-md border border-white/50">
                {getCategoryEmoji(displayReport.category || 'Other')}
              </span>
            </div>
          </div>

          {/* Title and Description Container */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
              {displayReport.title || 'Untitled Report'}
            </h1>

            <div className="prose prose-sm sm:prose-base text-gray-600 max-w-none">
              <p className="leading-relaxed whitespace-pre-wrap">
                {displayReport.description || 'No description provided.'}
              </p>
            </div>
            
            {/* AI Analysis Info (if available) */}
            {displayReport.aiAnalysis && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">AI Analysis</p>
                <div className="flex flex-wrap gap-2">
                  {displayReport.aiAnalysis.priority && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">
                      Priority: {displayReport.aiAnalysis.priority}
                    </span>
                  )}
                  {displayReport.aiAnalysis.isCritical && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-semibold">
                      Critical
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="p-2 bg-[#3B5CE8]/10 rounded-lg shrink-0">
                <MapPin className="w-5 h-5 text-[#3B5CE8]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Category</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{displayReport.category}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="p-2 bg-[#14B8A6]/10 rounded-lg shrink-0">
                <Clock className="w-5 h-5 text-[#14B8A6]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reported</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{formatDate(displayReport.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reported By</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {displayReport.userId?.name || 'Anonymous'}
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
                  {isLoadingLocation ? (
                    <span className="text-gray-400">Loading location...</span>
                  ) : (
                    locationName
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Section (Footer) */}
        <div className="flex-shrink-0 p-4 sm:p-6 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Community Feedback</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {upvotes + downvotes} total votes
              </span>
            </div>
          </div>

          {/* Resolution Verification Section - Show for all users (including own reports) */}
          {status === 'Resolution Pending' && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 sm:p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-yellow-900 mb-1">
                    Verify Issue Resolution
                  </h3>
                  <p className="text-sm text-yellow-800">
                    Admin marked this issue as resolved. Please verify if the problem is actually fixed in your area.
                  </p>
                  {resolutionVerification && (
                    <p className="text-xs text-yellow-700 mt-2">
                      {resolutionVerification.approvals?.length || 0}/{resolutionVerification.requiredApprovals || 2} approvals needed to close
                    </p>
                  )}
                </div>
              </div>
              {hasVerifiedResolution ? (
                <div className="text-center py-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold ${
                    userResolutionVote === 'approve' 
                      ? 'bg-green-50 border-2 border-green-500 text-green-700' 
                      : 'bg-red-50 border-2 border-red-500 text-red-700'
                  }`}>
                    {userResolutionVote === 'approve' ? (
                      <>
                        <ThumbsUp className="w-5 h-5 fill-green-700" />
                        <span>You approved this resolution</span>
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-5 h-5 fill-red-700" />
                        <span>You rejected this resolution</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">You can only verify or reject once</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      setIsVerifyingResolution(true)
                      try {
                        const reportId = report.id || report._id
                        const response = await reportsAPI.verifyResolution(reportId, 'approve')
                        if (response.success) {
                          setStatus(response.report.status)
                          setHasVerifiedResolution(true)
                          setUserResolutionVote('approve')
                          if (response.report.status === 'Closed') {
                            alert('Report has been closed after receiving required approvals.')
                          }
                          // Refresh report data
                          const freshResponse = await reportsAPI.getReportById(reportId)
                          if (freshResponse.success && freshResponse.report) {
                            setReportData(freshResponse.report)
                            setStatus(freshResponse.report.status)
                            if (freshResponse.report.resolutionVerification) {
                              setResolutionVerification(freshResponse.report.resolutionVerification)
                              const vote = checkUserResolutionVote(freshResponse.report)
                              setUserResolutionVote(vote)
                              setHasVerifiedResolution(vote !== null)
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Resolution verification error:', error)
                        alert(error.response?.data?.message || 'Failed to verify resolution')
                      } finally {
                        setIsVerifyingResolution(false)
                      }
                    }}
                    disabled={isVerifyingResolution || hasVerifiedResolution}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingResolution ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="w-4 h-4" />
                        <span>Approve Resolution</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={async () => {
                      setIsVerifyingResolution(true)
                      try {
                        const reportId = report.id || report._id
                        const response = await reportsAPI.verifyResolution(reportId, 'reject')
                        if (response.success) {
                          setHasVerifiedResolution(true)
                          setUserResolutionVote('reject')
                          // Refresh report data
                          const freshResponse = await reportsAPI.getReportById(reportId)
                          if (freshResponse.success && freshResponse.report) {
                            setReportData(freshResponse.report)
                            setStatus(freshResponse.report.status)
                            if (freshResponse.report.resolutionVerification) {
                              setResolutionVerification(freshResponse.report.resolutionVerification)
                              const vote = checkUserResolutionVote(freshResponse.report)
                              setUserResolutionVote(vote)
                              setHasVerifiedResolution(vote !== null)
                            }
                          }
                          alert('Resolution rejected. The issue will remain open.')
                        }
                      } catch (error) {
                        console.error('Resolution verification error:', error)
                        alert(error.response?.data?.message || 'Failed to verify resolution')
                      } finally {
                        setIsVerifyingResolution(false)
                      }
                    }}
                    disabled={isVerifyingResolution || hasVerifiedResolution}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingResolution ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Rejecting...</span>
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-4 h-4" />
                        <span>Reject Resolution</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {voteError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-700">{voteError}</p>
            </div>
          )}

          {/* Hide voting buttons if status is Resolution Pending - show only verify/deny buttons above */}
          {status === 'Resolution Pending' ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 italic">Voting is disabled while resolution is pending verification. Use the verify/deny buttons above.</p>
            </div>
          ) : hasVoted ? (
            <div className="text-center py-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold ${
                userVote === 'up' 
                  ? 'bg-green-50 border-2 border-green-500 text-green-700' 
                  : 'bg-red-50 border-2 border-red-500 text-red-700'
              }`}>
                {userVote === 'up' ? (
                  <>
                    <ThumbsUp className="w-5 h-5 fill-green-700" />
                    <span>You upvoted this report</span>
                  </>
                ) : (
                  <>
                    <ThumbsDown className="w-5 h-5 fill-red-700" />
                    <span>You downvoted this report</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Votes cannot be changed once submitted</p>
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleUpvote}
                disabled={isVoting || hasVoted}
                className={`flex-1 max-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold transition-all active:scale-95 border disabled:opacity-50 disabled:cursor-not-allowed ${
                  userVote === 'up'
                    ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                    : 'bg-white border-green-200 text-green-700 hover:bg-green-50'
                }`}
              >
                {isVoting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsUp className={`w-4 h-4 ${userVote === 'up' ? 'fill-green-700' : ''}`} />
                )}
                <span className="text-sm">Upvote</span>
                <span className="ml-0.5 text-sm">{upvotes}</span>
              </button>

            <button
              onClick={handleDownvote}
              disabled={isVoting || hasVoted || isOwnReportState}
              className={`flex-1 max-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold transition-all active:scale-95 border disabled:opacity-50 disabled:cursor-not-allowed ${
                userVote === 'down'
                  ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                  : 'bg-white border-red-200 text-red-700 hover:bg-red-50'
                }`}
              title={isOwnReportState ? "You cannot downvote your own report" : ""}
            >
                {isVoting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsDown className={`w-4 h-4 ${userVote === 'down' ? 'fill-red-700' : ''}`} />
                )}
                <span className="text-sm">Downvote</span>
                <span className="ml-0.5 text-sm">{downvotes}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportDetailModal
