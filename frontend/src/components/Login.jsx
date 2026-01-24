import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import axios from 'axios'
import logoIcon from '../assets/icons/logo-icon.svg'
import OTPVerification from './OTPVerification'

function Login() {
  const [mobileNumber, setMobileNumber] = useState('')
  const [showOTP, setShowOTP] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleMobileSubmit = async (e) => {
    e.preventDefault()
    setError('') // Clear previous errors
    
    // Validate mobile number
    if (!mobileNumber || mobileNumber.length !== 10) {
      setError('Enter real number')
      return
    }

    // Check for fake numbers (all same digits, sequential, etc.)
    const digits = mobileNumber.replace(/\D/g, '');
    
    // Check if all digits are the same
    const allSame = digits.split('').every(digit => digit === digits[0]);
    if (allSame) {
      setError('Invalid number')
      return
    }

    // Check for sequential numbers (strict - must be perfectly sequential)
    let isSequential = true;
    let isReverseSequential = true;
    for (let i = 1; i < digits.length; i++) {
      const current = parseInt(digits[i]);
      const previous = parseInt(digits[i - 1]);
      if (current !== previous + 1) isSequential = false;
      if (current !== previous - 1) isReverseSequential = false;
    }
    if (isSequential || isReverseSequential) {
      setError('Invalid number')
      return
    }

    // Check for repeating patterns (only block obvious fake patterns)
    // Check 2-digit pattern - only block if pattern repeats 5+ times (too obvious)
    if (digits.length >= 4) {
      const pattern2 = digits.substring(0, 2);
      const matches = digits.match(new RegExp(pattern2, 'g'));
      if (matches && matches.length >= 5) {
        setError('Invalid number')
        return
      }
    }
    
    // Check 3-digit pattern - only block if pattern repeats 4+ times
    if (digits.length >= 6) {
      const pattern3 = digits.substring(0, 3);
      const matches = digits.match(new RegExp(pattern3, 'g'));
      if (matches && matches.length >= 4) {
        setError('Invalid number')
        return
      }
    }

    // Check if starts with 6-9 (valid Indian mobile)
    if (!/^[6-9]/.test(digits)) {
      setError('Invalid number')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const phoneNumber = `+91${mobileNumber}`

      await axios.post(`${import.meta.env.VITE_API_URL}/auth/send-otp`, {
        phoneNumber,
      })

      setIsLoading(false)
      setShowOTP(true)
    } catch (error) {
      setIsLoading(false)
      console.error('Error sending OTP:', error)
      setError(error.response?.data?.message || `Error: ${error.message}`)
    }
  }

  const handleOTPVerified = async ({ token, user }) => {
    try {
      // Store JWT token in localStorage
      if (token) {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        // Redirect to dashboard or home page
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Error logging in:', error)
      setError(`Login failed: ${error.response?.data?.message || error.message}`)
    }
  }

  if (showOTP) {
    return (
      <OTPVerification
        mobileNumber={mobileNumber}
        onVerified={handleOTPVerified}
        onBack={() => setShowOTP(false)}
        type="login"
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <img 
              src={logoIcon} 
              alt="CivicAudit Logo" 
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CivicAudit</h1>
          <p className="text-gray-600">Login to your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Mobile Number Form */}
        <form onSubmit={handleMobileSubmit} className="space-y-6">
          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="w-5 h-5 text-gray-400" />
              </div>
              <div className="absolute inset-y-0 left-10 pl-2 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">+91</span>
              </div>
              <input
                type="tel"
                id="mobile"
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                  setError('') // Clear error when user types
                }}
                placeholder="Enter your mobile number"
                className="block w-full pl-20 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                maxLength="10"
                required
                disabled={isLoading}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              We'll send you an OTP to verify your number
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || mobileNumber.length !== 10}
            className="w-full bg-[#2563EB] text-white py-3 rounded-lg font-semibold hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending OTP...
              </span>
            ) : (
              'Send OTP'
            )}
          </button>
        </form>

        {/* reCAPTCHA container (invisible) */}
        <div id="recaptcha-container"></div>

        {/* Signup Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#2563EB] font-semibold hover:text-[#1d4ed8] transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
