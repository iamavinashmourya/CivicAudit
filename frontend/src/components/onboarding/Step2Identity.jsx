import { useState } from 'react'
import { User } from 'lucide-react'
import { profileAPI } from '../../utils/api'

function Step2Identity({ name, gender, age, dateOfBirth, onUpdate, onNext, onBack }) {
  const [formData, setFormData] = useState({
    name: name || '',
    gender: gender || '',
    dateOfBirth: dateOfBirth || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    if (!formData.gender) {
      setError('Please select your gender')
      return
    }

    if (!formData.dateOfBirth) {
      setError('Please enter your date of birth')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
      }

      const response = await profileAPI.updateIdentity(payload)
      if (response.success) {
        onUpdate({
          name: formData.name.trim(),
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
        })
        onNext()
      } else {
        setError(response.message || 'Failed to update identity')
      }
    } catch (err) {
      console.error('Update identity error:', err)
      setError(err.response?.data?.message || 'Failed to update identity. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Full Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter your full name"
            className="block w-full pl-12 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Gender */}
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
          Gender
        </label>
        <select
          id="gender"
          value={formData.gender}
          onChange={(e) => handleChange('gender', e.target.value)}
          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          required
          disabled={isSubmitting}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Date of Birth */}
      <div>
        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
          Date of Birth
        </label>
        <input
          type="date"
          id="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#2563EB] text-white py-3 rounded-lg font-semibold hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            'Next'
          )}
        </button>
      </div>
    </form>
  )
}

export default Step2Identity
