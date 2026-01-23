import { useState } from 'react'
import { Shield, CheckCircle, X } from 'lucide-react'
import { profileAPI } from '../../utils/api'

function Step4KYC({ aadhaarNumber, onUpdate, onComplete, onBack }) {
  const [aadhaar, setAadhaar] = useState(aadhaarNumber || '')
  const [showOTPPopup, setShowOTPPopup] = useState(false)
  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState('')

  const formatAadhaar = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '').slice(0, 12)
    
    // Format as XXXX XXXX XXXX
    if (digits.length <= 4) {
      return digits
    } else if (digits.length <= 8) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`
    } else {
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`
    }
  }

  const handleAadhaarChange = (e) => {
    const formatted = formatAadhaar(e.target.value)
    setAadhaar(formatted)
    setError('')
  }

  const handleVerifyClick = () => {
    const cleaned = aadhaar.replace(/\s/g, '')
    if (cleaned.length !== 12) {
      setError('Aadhaar number must be exactly 12 digits')
      return
    }

    // Show mock OTP popup
    setShowOTPPopup(true)
    setError('')
  }

  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    
    if (otp.length !== 6) {
      setError('OTP must be 6 digits')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const cleanedAadhaar = aadhaar.replace(/\s/g, '')
      const response = await profileAPI.verifyKYC({
        aadhaarNumber: cleanedAadhaar,
        otp: otp,
      })

      if (response.success) {
        setIsVerified(true)
        onUpdate({ aadhaarNumber: cleanedAadhaar })
        
        // Wait a moment to show success animation, then complete
        setTimeout(() => {
          onComplete()
        }, 2000)
      } else {
        setError(response.message || 'Verification failed')
      }
    } catch (err) {
      console.error('KYC verification error:', err)
      setError(err.response?.data?.message || 'Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  if (isVerified) {
    return (
      <div className="text-center py-8">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Verification Successful!</h3>
        <p className="text-gray-600 mb-4">You are now a verified citizen</p>
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg font-semibold">
          <Shield className="w-5 h-5" />
          <span>Verified Citizen</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Official Header */}
      <div className="text-center border-b pb-4">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Verify Citizenship</h3>
        <p className="text-sm text-gray-600">Enter your Aadhaar number for verification</p>
      </div>

      {/* Aadhaar Input */}
      <div>
        <label htmlFor="aadhaar" className="block text-sm font-medium text-gray-700 mb-2">
          Aadhaar Number
        </label>
        <input
          type="text"
          id="aadhaar"
          value={aadhaar}
          onChange={handleAadhaarChange}
          placeholder="1234 5678 9012"
          maxLength={14} // 12 digits + 2 spaces
          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg tracking-wider"
          disabled={showOTPPopup || isVerifying}
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter your 12-digit Aadhaar number
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Verify Button */}
      {!showOTPPopup && (
        <button
          onClick={handleVerifyClick}
          disabled={aadhaar.replace(/\s/g, '').length !== 12}
          className="w-full bg-[#2563EB] text-white py-3 rounded-lg font-semibold hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Verify
        </button>
      )}

      {/* Mock OTP Popup */}
      {showOTPPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Enter OTP</h3>
              <button
                onClick={() => {
                  setShowOTPPopup(false)
                  setOtp('')
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              OTP sent to Aadhaar-linked mobile number
            </p>
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(value)
                    setError('')
                  }}
                  placeholder="123456"
                  maxLength={6}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-center text-2xl tracking-widest"
                  autoFocus
                  disabled={isVerifying}
                />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  For demo: Enter any 6-digit code (e.g., 123456)
                </p>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOTPPopup(false)
                    setOtp('')
                    setError('')
                  }}
                  disabled={isVerifying}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  className="flex-1 bg-[#16A34A] text-white py-3 rounded-lg font-semibold hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Back Button */}
      {!showOTPPopup && (
        <button
          type="button"
          onClick={onBack}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
        >
          Back
        </button>
      )}
    </div>
  )
}

export default Step4KYC
