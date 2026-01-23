import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Step1Verification from './onboarding/Step1Verification'
import Step2Identity from './onboarding/Step2Identity'
import Step3Location from './onboarding/Step3Location'
import Step4KYC from './onboarding/Step4KYC'
import logoIcon from '../assets/icons/logo-icon.svg'

function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    profilePhoto: null,
    name: '',
    gender: '',
    age: '',
    dateOfBirth: '',
    coordinates: null,
    wardName: '',
    aadhaarNumber: '',
  })
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    // Pre-fill name from localStorage if available
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        if (user.name) {
          setFormData(prev => ({ ...prev, name: user.name }))
        }
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [navigate])

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    // Redirect to dashboard after completion
    navigate('/dashboard')
  }

  const steps = [
    { number: 1, title: 'Verification', subtitle: "First, let's verify it's you." },
    { number: 2, title: 'Identity', subtitle: 'Tell us a bit about yourself.' },
    { number: 3, title: 'Location', subtitle: 'Where is your home base?' },
    { number: 4, title: 'Finish', subtitle: 'You are all set!' },
  ]

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Verification
            profilePhoto={formData.profilePhoto}
            onUpdate={updateFormData}
            onNext={handleNext}
          />
        )
      case 2:
        return (
          <Step2Identity
            name={formData.name}
            gender={formData.gender}
            age={formData.age}
            dateOfBirth={formData.dateOfBirth}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case 3:
        return (
          <Step3Location
            coordinates={formData.coordinates}
            wardName={formData.wardName}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case 4:
        return (
          <Step4KYC
            aadhaarNumber={formData.aadhaarNumber}
            onUpdate={updateFormData}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={logoIcon} 
              alt="CivicAudit Logo" 
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CivicAudit</h1>
          <p className="text-gray-600">Complete your profile</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex-1 text-center ${
                  step.number <= currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-semibold ${
                    step.number < currentStep
                      ? 'bg-green-500 text-white'
                      : step.number === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.number < currentStep ? '✓' : step.number}
                </div>
                <p className="text-xs mt-1 font-medium">{step.title}</p>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Step Content */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {steps[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">{steps[currentStep - 1].subtitle}</p>
          </div>
          {renderStep()}
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
