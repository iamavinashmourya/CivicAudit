import { useState, useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { profileAPI } from '../../utils/api'

function Step1Verification({ profilePhoto, onUpdate, onNext }) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [showCamera, setShowCamera] = useState(false)


  const validateAndSetFile = (selectedFile) => {
    setError('')
    
    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
      setFile(selectedFile)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleCameraClick = () => {
    setShowCamera(true)
    // Request camera access
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch((err) => {
        console.error('Camera access error:', err)
        setError('Unable to access camera. Please allow camera permissions and try again.')
        setShowCamera(false)
      })
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
          validateAndSetFile(file)
          setShowCamera(false)
          
          // Stop camera stream
          if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop())
          }
        }
      }, 'image/jpeg', 0.9)
    }
  }

  const removePhoto = () => {
    setPreview(null)
    setFile(null)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select or capture a photo')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const response = await profileAPI.uploadPhoto(file)
      if (response.success) {
        onUpdate({ profilePhoto: response.profilePhoto })
        onNext()
      } else {
        setError(response.message || 'Failed to upload photo')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.response?.data?.message || 'Failed to upload photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          To verify you are a real citizen, please upload a profile photo (selfie).
        </p>
      </div>

      {/* Camera Preview - Circular */}
      {showCamera && (
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} // Mirror the video for selfie
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-2 w-full max-w-md">
            <button
              onClick={capturePhoto}
              className="flex-1 bg-[#2563EB] text-white py-3 px-4 rounded-lg hover:bg-[#1d4ed8] transition font-semibold"
            >
              Capture Photo
            </button>
            <button
              onClick={() => {
                setShowCamera(false)
                if (videoRef.current && videoRef.current.srcObject) {
                  videoRef.current.srcObject.getTracks().forEach(track => track.stop())
                }
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image Preview - Circular */}
      {preview && !showCamera && (
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={preview}
              alt="Selfie Preview"
              className="w-48 h-48 rounded-full object-cover border-4 border-blue-200 shadow-lg"
            />
            <button
              onClick={removePhoto}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Take Selfie Button */}
      {!preview && !showCamera && (
        <div className="flex justify-center">
          <button
            onClick={handleCameraClick}
            className="flex items-center justify-center gap-3 py-4 px-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition w-full max-w-md"
          >
            <Camera className="w-6 h-6 text-gray-600" />
            <span className="font-semibold text-gray-700">Take a Selfie</span>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Verify Button */}
      {preview && !showCamera && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full bg-[#16A34A] text-white py-3 rounded-lg font-semibold hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isUploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          ) : (
            'Verify Liveness'
          )}
        </button>
      )}
    </div>
  )
}

export default Step1Verification
