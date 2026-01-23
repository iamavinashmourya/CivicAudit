import { useState, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import axios from 'axios'
import logoIcon from '../assets/icons/logo-icon.svg'

function OTPVerification({ mobileNumber, name, onVerified, onBack, type = 'login' }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [timer, setTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  useEffect(() => {
    // Timer countdown
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setCanResend(true)
    }
  }, [timer])

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handlePaste(e)
    }
  }

  const handlePaste = (e) => {
    const pastedData = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      inputRefs.current[5]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const otpValue = otp.join('')

    if (otpValue.length !== 6) {
      alert('Please enter the complete 6-digit OTP')
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        phoneNumber: `+91${mobileNumber}`,
        otp: otpValue,
      }

      if (type === 'signup') {
        payload.name = name
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/verify-otp`,
        payload
      )

      onVerified({
        token: response.data.token,
        user: response.data.user,
        requiresOnboarding: response.data.requiresOnboarding,
      })
    } catch (error) {
      setIsLoading(false)
      console.error('Error verifying OTP:', error)
      alert(error.response?.data?.message || `Invalid OTP: ${error.message}`)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  const handleResendOTP = async () => {
    try {
      setTimer(60)
      setCanResend(false)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      
      // Resend OTP via Firebase
      const phoneNumber = `+91${mobileNumber}`
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/send-otp`, {
        phoneNumber,
        name: type === 'signup' ? name : undefined,
      })
      alert('OTP resent successfully!')
    } catch (error) {
      console.error('Error resending OTP:', error)
      alert(`Error resending OTP: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={onBack}
            className="mb-4 text-gray-600 hover:text-gray-900 transition flex items-center justify-center mx-auto"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex justify-center mb-2">
            <img 
              src={logoIcon} 
              alt="CivicAudit Logo" 
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify OTP</h1>
          <p className="text-gray-600">
            We've sent a 6-digit OTP to
          </p>
          <p className="text-gray-900 font-semibold mt-1">
            +91 {mobileNumber}
          </p>
        </div>

        {/* OTP Input Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                disabled={isLoading}
              />
            ))}
          </div>

          {/* Timer/Resend */}
          <div className="text-center">
            {timer > 0 ? (
              <p className="text-sm text-gray-600">
                Resend OTP in <span className="font-semibold text-[#2563EB]">{timer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendOTP}
                className="text-sm text-[#2563EB] font-semibold hover:text-[#1d4ed8] transition"
              >
                Resend OTP
              </button>
            )}
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full bg-[#16A34A] text-white py-3 rounded-lg font-semibold hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? (
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
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Didn't receive the OTP? Check your mobile number or try resending.
          </p>
        </div>
      </div>
    </div>
  )
}

export default OTPVerification
