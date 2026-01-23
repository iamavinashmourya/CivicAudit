import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { CheckCircle2 } from 'lucide-react'

// Get category emoji/icon
const getCategoryEmoji = (category) => {
  const categoryMap = {
    'Road': '🛣️',
    'Water': '💧',
    'Garbage': '🗑️',
    'Electricity': '⚡',
    'Fire': '🔥',
    'Disaster': '🔥',
    'Other': '📍',
  }
  return categoryMap[category] || '📍'
}

// Get priority color
const getPriorityColor = (priority) => {
  const priorityMap = {
    'CRITICAL': '#dc2626', // red-600 (brighter, more prominent red)
    'HIGH': '#f97316',     // orange-500
    'MEDIUM': '#3b82f6',  // blue-500
    'LOW': '#9ca3af',      // gray-400
  }
  return priorityMap[priority] || '#9ca3af'
}

// Create custom icon based on priority and category
const createCustomIcon = (priority, category, status, isCriticalFlag) => {
  const color = getPriorityColor(priority)
  const emoji = getCategoryEmoji(category)
  const isVerified = status === 'Verified'
  const isCritical = priority === 'CRITICAL' || isCriticalFlag
  const shouldPulse = isCritical
  
  // CRITICAL reports get larger markers
  const markerSize = isCritical ? 40 : 32
  const borderWidth = isCritical ? 4 : 3
  const fontSize = isCritical ? 20 : 16

  // Build HTML for the marker
  const html = `
    <div class="custom-marker-wrapper" style="position: relative;">
      <div 
        class="custom-marker-pin ${shouldPulse ? 'marker-pulse' : ''}" 
        style="
          background-color: ${color}; 
          width: ${markerSize}px; 
          height: ${markerSize}px; 
          border-radius: 50%; 
          border: ${borderWidth}px solid white; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: ${isCritical ? '0 6px 12px rgba(220, 38, 38, 0.5)' : '0 4px 8px rgba(0,0,0,0.3)'};
          position: relative;
          z-index: 1;
        ">
        <span style="color: white; font-size: ${fontSize}px; line-height: 1; font-weight: ${isCritical ? 'bold' : 'normal'};">
          ${emoji}
        </span>
      </div>
      ${isVerified ? `
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          background-color: #10b981;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 2;
        ">
          <svg width="10" height="10" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="white"/>
          </svg>
        </div>
      ` : ''}
    </div>
  `

  // CRITICAL reports need larger icon size
  const iconSize = isCritical ? 40 : 32
  const iconAnchor = isCritical ? 20 : 16
  
  return L.divIcon({
    className: 'custom-div-icon',
    html,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconAnchor, iconSize],
    popupAnchor: [0, -iconSize],
  })
}

const CivicMarker = ({ report, onReportClick }) => {
  // Handle both location formats: { lat, lng } and GeoJSON { coordinates: [lng, lat] }
  let lat, lng
  if (report.location?.lat !== undefined) {
    lat = report.location.lat
    lng = report.location.lng
  } else if (report.location?.coordinates) {
    // MongoDB GeoJSON format: [lng, lat] -> Leaflet needs [lat, lng]
    [lng, lat] = report.location.coordinates
  } else {
    return null // No valid location
  }

  const position = [lat, lng]
  const priority = report.aiAnalysis?.priority || 'LOW'
  const category = report.category || 'Other'
  const status = report.status || 'Pending'
  const isCritical = report.aiAnalysis?.isCritical || false

  // Build image URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
  const STATIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '') || 'http://localhost:5002'
  const imageUrl = report.imageUrl
    ? report.imageUrl.startsWith('http')
      ? report.imageUrl
      : `${STATIC_BASE_URL}${report.imageUrl}`
    : null

  const icon = createCustomIcon(priority, category, status, isCritical)

  return (
    <Marker position={position} icon={icon}>
      <Popup className="civic-popup" maxWidth={300}>
        <div className="p-3 w-64">
          {/* Evidence Image */}
          {imageUrl && (
            <img 
              src={imageUrl}
              className="w-full h-32 object-cover rounded-lg mb-3 border border-gray-200" 
              alt={report.title || 'Report evidence'}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          )}
          
          {/* Title & Badge */}
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="font-bold text-sm leading-tight flex-1">{report.title || 'Untitled Report'}</h3>
            {status === 'Verified' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 whitespace-nowrap flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
            <span className="font-medium">{category}</span>
            <span>•</span>
            <span className={`font-semibold ${
              priority === 'CRITICAL' ? 'text-red-600' :
              priority === 'HIGH' ? 'text-orange-600' :
              priority === 'MEDIUM' ? 'text-blue-600' :
              'text-gray-600'
            }`}>
              {priority}
            </span>
          </div>

          {/* Description (if available) */}
          {report.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{report.description}</p>
          )}

          {/* Action Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation()
              if (onReportClick) {
                onReportClick(report)
              }
            }}
            className="w-full bg-gradient-to-r from-[#3B5CE8] to-[#14B8A6] text-white text-xs font-semibold py-2 rounded-lg hover:from-[#3149ba] hover:to-[#0d9488] transition-all shadow-sm hover:shadow-md"
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

export default CivicMarker
