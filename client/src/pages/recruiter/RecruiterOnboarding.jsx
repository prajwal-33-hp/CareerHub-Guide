import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Briefcase,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  User,
  Globe,
  MapPin,
  FileCheck,
  Send,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function RecruiterOnboarding() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [appData, setAppData] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)

  // Form State - Step 1: Recruiter Profile
  const [fullName, setFullName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')

  // Form State - Step 2: Company Details
  const [legalName, setLegalName] = useState('')
  const [website, setWebsite] = useState('')
  const [companyType, setCompanyType] = useState('Private Limited')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('11-50')
  const [country, setCountry] = useState('India')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [cin, setCin] = useState('')
  const [llpin, setLlpin] = useState('')
  const [gstin, setGstin] = useState('')
  const [registrationDocUrl, setRegistrationDocUrl] = useState('')
  const [idBadgeUrl, setIdBadgeUrl] = useState('')
  const [declarationAgreed, setDeclarationAgreed] = useState(false)

  // OTP Verification State - Step 3
  const [emailOtp, setEmailOtp] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [emailTimer, setEmailTimer] = useState(0)
  const [phoneTimer, setPhoneTimer] = useState(0)
  const [emailSending, setEmailSending] = useState(false)
  const [phoneSending, setPhoneSending] = useState(false)
  const [emailVerifying, setEmailVerifying] = useState(false)
  const [phoneVerifying, setPhoneVerifying] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)

  // Uploading state
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadingBadge, setUploadingBadge] = useState(false)

  // Fetch current application status
  const fetchStatus = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data } = await api.get('/recruiter-verification/status')
      setAppData(data.application)

      if (data.application) {
        const app = data.application
        setFullName(app.applicantDetails?.fullName || user.name || '')
        setWorkEmail(app.applicantDetails?.workEmail || user.workEmail || user.email || '')
        setMobileNumber(app.applicantDetails?.mobileNumber || user.workPhone || '')
        setDesignation(app.applicantDetails?.designation || user.designation || '')
        setDepartment(app.applicantDetails?.department || user.department || '')
        setLinkedinUrl(app.applicantDetails?.linkedinUrl || '')
        setIdBadgeUrl(app.applicantDetails?.idBadgeUrl || '')

        setLegalName(app.companyDetails?.legalName || '')
        setWebsite(app.companyDetails?.website || '')
        setCompanyType(app.companyDetails?.companyType || 'Private Limited')
        setIndustry(app.companyDetails?.industry || '')
        setCompanySize(app.companyDetails?.companySize || '11-50')
        setCountry(app.companyDetails?.country || 'India')
        setState(app.companyDetails?.state || '')
        setCity(app.companyDetails?.city || '')
        setBusinessAddress(app.companyDetails?.businessAddress || '')
        setDescription(app.companyDetails?.description || '')
        setLogoUrl(app.companyDetails?.logoUrl || '')
        setCin(app.companyDetails?.cin || '')
        setLlpin(app.companyDetails?.llpin || '')
        setGstin(app.companyDetails?.gstin || '')
        setRegistrationDocUrl(app.companyDetails?.registrationDocUrl || '')

        setEmailVerified(Boolean(app.verification?.emailVerified))
        setPhoneVerified(Boolean(app.verification?.phoneVerified))

        if (['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVOKED'].includes(app.status)) {
          setCurrentStep(5) // Show status tracker
        }
      } else {
        // Pre-fill user details if fresh applicant
        setFullName(user.name || '')
        setWorkEmail(user.email || '')
      }
    } catch (err) {
      console.error('Failed to load application status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [user])

  // Countdown timers for OTP resend
  useEffect(() => {
    let timer1
    if (emailTimer > 0) {
      timer1 = setInterval(() => setEmailTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(timer1)
  }, [emailTimer])

  useEffect(() => {
    let timer2
    if (phoneTimer > 0) {
      timer2 = setInterval(() => setPhoneTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(timer2)
  }, [phoneTimer])

  // Domain Match Check
  const domainAnalysis = useMemo(() => {
    if (!workEmail || !website) return { matched: false, emailDomain: '', webDomain: '' }
    try {
      const emailDomain = workEmail.split('@')[1]?.toLowerCase().trim() || ''
      let webDomain = website.toLowerCase().trim()
      webDomain = webDomain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0]
      const matched = Boolean(
        emailDomain &&
          webDomain &&
          (emailDomain === webDomain || webDomain.endsWith(`.${emailDomain}`) || emailDomain.endsWith(`.${webDomain}`))
      )
      return { matched, emailDomain, webDomain }
    } catch {
      return { matched: false, emailDomain: '', webDomain: '' }
    }
  }, [workEmail, website])

  // Handlers for OTP
  async function handleSendEmailOtp() {
    if (!workEmail) {
      showToast('Please enter your work email first', 'error')
      return
    }
    setEmailSending(true)
    try {
      const { data } = await api.post('/recruiter-verification/send-otp', {
        type: 'email',
        target: workEmail.trim().toLowerCase(),
      })
      setEmailOtpSent(true)
      setEmailTimer(45)
      showToast(data.message || 'Verification code sent to work email', 'info')
    } catch (err) {
      showToast(err.message || 'Failed to send email verification code', 'error')
    } finally {
      setEmailSending(false)
    }
  }

  async function handleVerifyEmailOtp() {
    if (!emailOtp.trim()) {
      showToast('Please enter the 6-digit email code', 'error')
      return
    }
    setEmailVerifying(true)
    try {
      const { data } = await api.post('/recruiter-verification/verify-otp', {
        type: 'email',
        target: workEmail.trim().toLowerCase(),
        otp: emailOtp.trim(),
      })
      setEmailVerified(true)
      showToast(data.message || 'Email verified successfully!', 'success')
    } catch (err) {
      showToast(err.message || 'Invalid verification code', 'error')
    } finally {
      setEmailVerifying(false)
    }
  }

  async function handleSendPhoneOtp() {
    if (!mobileNumber) {
      showToast('Please enter your mobile phone number first', 'error')
      return
    }
    setPhoneSending(true)
    try {
      const { data } = await api.post('/recruiter-verification/send-otp', {
        type: 'phone',
        target: mobileNumber.trim(),
      })
      setPhoneOtpSent(true)
      setPhoneTimer(45)
      showToast(data.message || 'SMS verification code sent to phone', 'info')
    } catch (err) {
      showToast(err.message || 'Failed to send phone verification code', 'error')
    } finally {
      setPhoneSending(false)
    }
  }

  async function handleVerifyPhoneOtp() {
    if (!phoneOtp.trim()) {
      showToast('Please enter the 6-digit phone code', 'error')
      return
    }
    setPhoneVerifying(true)
    try {
      const { data } = await api.post('/recruiter-verification/verify-otp', {
        type: 'phone',
        target: mobileNumber.trim(),
        otp: phoneOtp.trim(),
      })
      setPhoneVerified(true)
      showToast(data.message || 'Phone verified successfully!', 'success')
    } catch (err) {
      showToast(err.message || 'Invalid verification code', 'error')
    } finally {
      setPhoneVerifying(false)
    }
  }

  // Document upload handler
  async function handleFileUpload(e, type) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('document', file)

    if (type === 'registration') setUploadingDoc(true)
    if (type === 'idBadge') setUploadingBadge(true)

    try {
      const { data } = await api.post('/recruiter-verification/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (type === 'registration') {
        setRegistrationDocUrl(data.url)
        showToast('Company registration document uploaded!', 'success')
      } else {
        setIdBadgeUrl(data.url)
        showToast('Corporate ID / Authorization document uploaded!', 'success')
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload document', 'error')
    } finally {
      if (type === 'registration') setUploadingDoc(false)
      if (type === 'idBadge') setUploadingBadge(false)
    }
  }

  // Final Application Submission
  async function handleSubmitApplication(e) {
    if (e) e.preventDefault()

    if (!emailVerified || !phoneVerified) {
      showToast('Please verify both work email and mobile phone before submitting', 'error')
      setCurrentStep(3)
      return
    }

    if (!declarationAgreed) {
      showToast('Please agree to the Recruiter Authorization Declaration', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        applicantDetails: {
          fullName,
          workEmail,
          mobileNumber,
          designation,
          department,
          linkedinUrl,
          idBadgeUrl,
        },
        companyDetails: {
          legalName,
          website,
          companyType,
          industry,
          companySize,
          country,
          state,
          city,
          businessAddress,
          description,
          logoUrl,
          cin,
          llpin,
          gstin,
          registrationDocUrl,
        },
      }

      const { data } = await api.post('/recruiter-verification/apply', payload)
      setAppData(data.application)
      showToast('Recruiter verification application submitted for admin review!', 'success')
      if (refreshUser) await refreshUser()
      setCurrentStep(5)
    } catch (err) {
      showToast(err.message || 'Submission failed. Please check your inputs.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-signal" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Helmet>
          <title>Recruiter Access | CareerHub</title>
        </Helmet>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal text-ink shadow-sm">
          <Briefcase size={26} />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Hire Top Talent on CareerHub</h1>
        <p className="mt-2 text-xs text-ink-soft leading-relaxed">
          To maintain portal integrity and protect candidates, all recruiters must be verified through our official company onboarding workflow.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/login" className="btn-primary justify-center text-xs">
            Log In to Apply
          </Link>
          <Link to="/register" className="btn-secondary justify-center text-xs">
            Create Candidate Account First
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>Recruiter Onboarding & Verification | CareerHub</title>
      </Helmet>

      {/* Header Banner */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-ink/10 bg-gradient-to-r from-ink via-ink/95 to-ink-soft p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-signal/20 px-3 py-1 text-[11px] font-bold text-signal backdrop-blur">
              <ShieldCheck size={14} /> Official Recruiter Verification Pipeline
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Recruiter & Company Onboarding
            </h1>
            <p className="mt-1.5 max-w-xl text-xs text-paper/80 leading-relaxed">
              Complete your recruiter details, verify company domain and legal credentials, and unlock full candidate search, job posting, and interview tools upon admin approval.
            </p>
          </div>
          <div className="shrink-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
              <p className="text-[10px] uppercase font-bold text-paper/60 tracking-wider">Current Account</p>
              <p className="mt-0.5 font-display text-sm font-bold text-signal">{user.name}</p>
              <span className="mt-1 inline-block rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                Status: {appData?.status || user.recruiterStatus || 'NONE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator (when not viewing existing submitted application) */}
      {currentStep !== 5 && (
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            {[
              { num: 1, title: 'Recruiter Profile', icon: User },
              { num: 2, title: 'Company Details', icon: Building2 },
              { num: 3, title: 'OTP Verification', icon: ShieldCheck },
              { num: 4, title: 'Relationship & Review', icon: FileCheck },
            ].map(({ num, title, icon: Icon }) => {
              const isActive = currentStep === num
              const isPast = currentStep > num
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCurrentStep(num)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition ${
                    isActive
                      ? 'border-signal bg-signal/15 text-ink shadow-2xs font-bold'
                      : isPast
                        ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800'
                        : 'border-ink/10 bg-white text-ink-soft hover:bg-paper'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                      isActive
                        ? 'bg-signal text-ink'
                        : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-paper text-ink-soft'
                    }`}
                  >
                    {isPast ? <CheckCircle2 size={15} /> : <Icon size={14} />}
                  </div>
                  <span className="text-[11px] truncate max-w-full">{title}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 1: Recruiter Profile */}
      {currentStep === 1 && (
        <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-ink/10 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Step 1: Recruiter Profile</h2>
              <p className="text-xs text-ink-soft">Enter your official professional identification details</p>
            </div>
            <span className="badge bg-signal/20 text-ink font-bold">Step 1 of 4</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Full Legal Name *</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Official Work Email *</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
              <p className="mt-1 text-[10px] text-ink-soft">Must be your corporate company email domain</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Mobile Phone Number *</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Your Designation *</label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Technical Recruiter / HR Lead"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Department *</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Talent Acquisition / Human Resources"
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">LinkedIn Profile (Optional)</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="input-field text-xs"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (!fullName || !workEmail || !mobileNumber || !designation || !department) {
                  showToast('Please fill all required recruiter fields', 'error')
                  return
                }
                setCurrentStep(2)
              }}
              className="btn-primary text-xs gap-2"
            >
              Continue to Company Details <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Company Details */}
      {currentStep === 2 && (
        <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-ink/10 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Step 2: Company & Legal Registration</h2>
              <p className="text-xs text-ink-soft">Enter registered legal business entity information</p>
            </div>
            <span className="badge bg-signal/20 text-ink font-bold">Step 2 of 4</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-ink">Legal Company Name *</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Razorpay Software Private Limited"
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Official Company Website *</label>
              <div className="relative">
                <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://razorpay.com"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Company Entity Type *</label>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className="input-field text-xs"
              >
                <option value="Private Limited">Private Limited (Pvt Ltd)</option>
                <option value="Public Limited">Public Limited (Ltd)</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Partnership">Partnership Firm</option>
                <option value="Startup">Startup / Early Stage</option>
                <option value="Non-Profit">Non-Profit / NGO</option>
                <option value="Enterprise">Global Enterprise</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Industry *</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Fintech / SaaS / Cloud Infrastructure"
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Company Size *</label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="input-field text-xs"
              >
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Country *</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">State / Province *</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Karnataka / Maharashtra"
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru / Pune / Mumbai"
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Business Address *</label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Registered corporate office address"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-ink">Company Description *</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of company products, services, and mission..."
                className="input-field text-xs"
                required
              />
            </div>

            {/* Legal Identification Numbers */}
            <div className="sm:col-span-2 pt-2 border-t border-ink/10">
              <h3 className="font-display text-xs font-bold text-ink mb-3 uppercase tracking-wider text-ink-soft">
                Statutory Business Identifiers (Any applicable)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ink">CIN (Corporate ID)</label>
                  <input
                    type="text"
                    value={cin}
                    onChange={(e) => setCin(e.target.value.toUpperCase())}
                    placeholder="U72900KA2020PTC123456"
                    className="input-field text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ink">GSTIN (GST Number)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="29AAAAA0000A1Z5"
                    className="input-field text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ink">LLPIN (If LLP entity)</label>
                  <input
                    type="text"
                    value={llpin}
                    onChange={(e) => setLlpin(e.target.value.toUpperCase())}
                    placeholder="AAA-1234"
                    className="input-field text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Company Logo & Registration Document Upload */}
            <div className="sm:col-span-2 pt-2 border-t border-ink/10">
              <label className="mb-1 block text-xs font-semibold text-ink">
                Certificate of Incorporation / GST Proof / Business Proof (PDF or Image)
              </label>
              <div className="flex items-center gap-3">
                <label className="btn-secondary text-xs cursor-pointer gap-2 shrink-0">
                  <Upload size={14} />
                  {uploadingDoc ? 'Uploading…' : 'Choose Document'}
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'registration')}
                  />
                </label>
                {registrationDocUrl && (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Document attached
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn-secondary text-xs gap-2"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  !legalName ||
                  !website ||
                  !industry ||
                  !country ||
                  !state ||
                  !city ||
                  !businessAddress ||
                  !description
                ) {
                  showToast('Please fill all required company details', 'error')
                  return
                }
                setCurrentStep(3)
              }}
              className="btn-primary text-xs gap-2"
            >
              Continue to OTP Verification <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Dual OTP Verification & Domain Match */}
      {currentStep === 3 && (
        <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-ink/10 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Step 3: Dual OTP Verification</h2>
              <p className="text-xs text-ink-soft">Verify your work email and mobile phone number</p>
            </div>
            <span className="badge bg-signal/20 text-ink font-bold">Step 3 of 4</span>
          </div>

          {/* Domain Match Analysis Card */}
          <div
            className={`mb-6 rounded-2xl border p-4 text-xs transition ${
              domainAnalysis.matched
                ? 'border-emerald-500/30 bg-emerald-50/70 text-emerald-900'
                : 'border-amber-500/30 bg-amber-50/70 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold ${
                  domainAnalysis.matched ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {domainAnalysis.matched ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {domainAnalysis.matched
                    ? 'Corporate Domain Match Verified'
                    : 'Domain Mismatch or Custom Verification Required'}
                </p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {domainAnalysis.matched
                    ? `Your work email domain (${domainAnalysis.emailDomain}) matches the company domain (${domainAnalysis.webDomain}). This speeds up your admin approval.`
                    : `Your work email domain (${domainAnalysis.emailDomain || 'N/A'}) does not match the company website (${domainAnalysis.webDomain || 'N/A'}). Admin review will verify your employment via corporate ID badge.`}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Email OTP Verification */}
            <div className="rounded-2xl border border-ink/10 bg-paper/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-signal-dark" />
                  <span className="font-semibold text-xs text-ink">Work Email OTP</span>
                </div>
                {emailVerified ? (
                  <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Pending
                  </span>
                )}
              </div>

              <p className="text-xs text-ink-soft mb-3 font-mono">{workEmail}</p>

              {!emailVerified && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={emailSending || emailTimer > 0}
                      onClick={handleSendEmailOtp}
                      className="btn-secondary text-xs flex-1 justify-center"
                    >
                      {emailSending
                        ? 'Sending…'
                        : emailTimer > 0
                          ? `Resend in ${emailTimer}s`
                          : emailOtpSent
                            ? 'Resend Code'
                            : 'Send Code'}
                    </button>
                  </div>

                  {emailOtpSent && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="6-digit code"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        className="input-field text-center font-mono font-bold tracking-widest text-sm"
                      />
                      <button
                        type="button"
                        disabled={emailVerifying || !emailOtp}
                        onClick={handleVerifyEmailOtp}
                        className="btn-primary text-xs shrink-0"
                      >
                        {emailVerifying ? 'Verifying…' : 'Verify'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Phone OTP Verification */}
            <div className="rounded-2xl border border-ink/10 bg-paper/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-signal-dark" />
                  <span className="font-semibold text-xs text-ink">Mobile Phone OTP</span>
                </div>
                {phoneVerified ? (
                  <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Pending
                  </span>
                )}
              </div>

              <p className="text-xs text-ink-soft mb-3 font-mono">{mobileNumber}</p>

              {!phoneVerified && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={phoneSending || phoneTimer > 0}
                      onClick={handleSendPhoneOtp}
                      className="btn-secondary text-xs flex-1 justify-center"
                    >
                      {phoneSending
                        ? 'Sending…'
                        : phoneTimer > 0
                          ? `Resend in ${phoneTimer}s`
                          : phoneOtpSent
                            ? 'Resend Code'
                            : 'Send Code'}
                    </button>
                  </div>

                  {phoneOtpSent && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="6-digit code"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        className="input-field text-center font-mono font-bold tracking-widest text-sm"
                      />
                      <button
                        type="button"
                        disabled={phoneVerifying || !phoneOtp}
                        onClick={handleVerifyPhoneOtp}
                        className="btn-primary text-xs shrink-0"
                      >
                        {phoneVerifying ? 'Verifying…' : 'Verify'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="btn-secondary text-xs gap-2"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="button"
              disabled={!emailVerified || !phoneVerified}
              onClick={() => setCurrentStep(4)}
              className="btn-primary text-xs gap-2 disabled:opacity-50"
            >
              Continue to Relationship & Submission <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Relationship Proof & Final Declaration */}
      {currentStep === 4 && (
        <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-ink/10 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Step 4: Relationship & Review</h2>
              <p className="text-xs text-ink-soft">Provide employment authorization proof and submit application</p>
            </div>
            <span className="badge bg-signal/20 text-ink font-bold">Step 4 of 4</span>
          </div>

          {/* Corporate ID Badge / Authorization Letter */}
          <div className="mb-6 rounded-2xl border border-ink/10 bg-paper/30 p-5">
            <h3 className="font-display text-sm font-bold text-ink mb-1">
              Recruiter-Company Relationship Proof
            </h3>
            <p className="text-xs text-ink-soft mb-4 leading-relaxed">
              Upload a scanned copy or photo of your Corporate ID badge, HR authorization letter, or official offer letter to verify that you are authorized to recruit on behalf of {legalName || 'your company'}.
            </p>

            <div className="flex items-center gap-3">
              <label className="btn-secondary text-xs cursor-pointer gap-2 shrink-0">
                <Upload size={14} />
                {uploadingBadge ? 'Uploading…' : 'Upload Corporate ID / Authorization'}
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'idBadge')}
                />
              </label>
              {idBadgeUrl && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={14} /> ID badge attached
                </span>
              )}
            </div>
          </div>

          {/* Application Summary Box */}
          <div className="mb-6 rounded-2xl border border-ink/10 bg-paper/60 p-5 space-y-3">
            <h3 className="font-display text-sm font-bold text-ink">Application Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-ink-soft text-[11px] block">Recruiter:</span>
                <span className="font-semibold text-ink">{fullName}</span>
              </div>
              <div>
                <span className="text-ink-soft text-[11px] block">Work Email:</span>
                <span className="font-semibold text-ink font-mono">{workEmail}</span>
              </div>
              <div>
                <span className="text-ink-soft text-[11px] block">Mobile:</span>
                <span className="font-semibold text-ink">{mobileNumber}</span>
              </div>
              <div>
                <span className="text-ink-soft text-[11px] block">Designation:</span>
                <span className="font-semibold text-ink">{designation}</span>
              </div>
              <div>
                <span className="text-ink-soft text-[11px] block">Company:</span>
                <span className="font-semibold text-ink">{legalName}</span>
              </div>
              <div>
                <span className="text-ink-soft text-[11px] block">Company Type:</span>
                <span className="font-semibold text-ink">{companyType}</span>
              </div>
            </div>
          </div>

          {/* Statutory Declaration */}
          <div className="mb-6 rounded-2xl border border-signal/30 bg-signal/10 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={declarationAgreed}
                onChange={(e) => setDeclarationAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink/20 text-signal focus:ring-signal"
              />
              <span className="text-xs text-ink leading-relaxed">
                I hereby declare that I am an authorized recruiting representative of{' '}
                <strong>{legalName || 'the specified company'}</strong>. I confirm that all submitted details, statutory identifiers, and documents are genuine and accurate. I understand that misrepresentation will lead to immediate account termination and legal action.
              </span>
            </label>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="btn-secondary text-xs gap-2"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="button"
              disabled={submitting || !declarationAgreed}
              onClick={handleSubmitApplication}
              className="btn-primary text-xs gap-2 disabled:opacity-50"
            >
              {submitting ? 'Submitting Application…' : 'Submit for Admin Review'} <Sparkles size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Application Status Tracker & Decision Hub */}
      {currentStep === 5 && appData && (
        <div className="space-y-6">
          {/* Status Alert Banner */}
          <div
            className={`rounded-3xl border p-6 sm:p-8 shadow-sm ${
              appData.status === 'APPROVED'
                ? 'border-emerald-500/30 bg-emerald-50/80 text-emerald-950'
                : appData.status === 'REJECTED'
                  ? 'border-rose-500/30 bg-rose-50/80 text-rose-950'
                  : appData.status === 'SUSPENDED' || appData.status === 'REVOKED'
                    ? 'border-red-500/30 bg-red-50/80 text-red-950'
                    : 'border-signal/40 bg-signal/15 text-ink'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    appData.status === 'APPROVED'
                      ? 'bg-emerald-600 text-white'
                      : appData.status === 'REJECTED'
                        ? 'bg-rose-600 text-white'
                        : 'bg-signal text-ink'
                  }`}
                >
                  {appData.status === 'APPROVED' ? (
                    <CheckCircle2 size={24} />
                  ) : appData.status === 'REJECTED' ? (
                    <AlertCircle size={24} />
                  ) : (
                    <Clock size={24} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl font-bold">
                      Application Status: {appData.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs opacity-90 leading-relaxed max-w-xl">
                    {appData.status === 'APPROVED'
                      ? `Your recruiter access for ${appData.companyDetails?.legalName} is active. You can now post jobs and manage candidate pipelines.`
                      : appData.status === 'UNDER_REVIEW'
                        ? 'An administrator is currently reviewing your documents, domain match, and legal identifiers.'
                        : appData.status === 'REJECTED'
                          ? `Application was not approved. Reason: ${appData.adminReview?.rejectionReason || 'Information could not be verified'}. You can update details and re-apply.`
                          : 'Your application has been received and is queued for verification review by our compliance team.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex gap-2">
                {appData.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => navigate('/recruiter/dashboard')}
                    className="btn-primary text-xs gap-2"
                  >
                    Go to Recruiter Dashboard <ArrowRight size={14} />
                  </button>
                )}
                {appData.status === 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="btn-primary text-xs gap-2"
                  >
                    <RefreshCw size={14} /> Edit & Resubmit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Verification Tracker */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8 shadow-sm">
            <h3 className="font-display text-base font-bold text-ink mb-6">Verification Progress</h3>

            <div className="space-y-4">
              {[
                {
                  label: 'Application Submission',
                  desc: 'Recruiter and legal entity information submitted',
                  done: true,
                  date: appData.createdAt,
                },
                {
                  label: 'Work Email Verification',
                  desc: `OTP verified for ${appData.applicantDetails?.workEmail}`,
                  done: Boolean(appData.verification?.emailVerified),
                  date: appData.verification?.emailVerifiedAt,
                },
                {
                  label: 'Mobile Phone Verification',
                  desc: `SMS code verified for ${appData.applicantDetails?.mobileNumber}`,
                  done: Boolean(appData.verification?.phoneVerified),
                  date: appData.verification?.phoneVerifiedAt,
                },
                {
                  label: 'Domain Match Analysis',
                  desc: appData.verification?.domainMatched
                    ? 'Corporate domain matched company website'
                    : 'Manual domain inspection required',
                  done: Boolean(appData.verification?.domainMatched),
                },
                {
                  label: 'Admin Review & Decision',
                  desc:
                    appData.status === 'APPROVED'
                      ? 'Approved by CareerHub Admin Team'
                      : appData.status === 'UNDER_REVIEW'
                        ? 'Under Active Review'
                        : appData.status === 'REJECTED'
                          ? 'Review Complete (Rejected)'
                          : 'Pending Admin Review',
                  done: ['APPROVED', 'REJECTED'].includes(appData.status),
                  date: appData.adminReview?.reviewedAt,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3.5 rounded-2xl border border-ink/5 bg-paper/40 p-3.5"
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      item.done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-ink/10 text-ink-soft'
                    }`}
                  >
                    {item.done ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-ink">{item.label}</p>
                      {item.date && (
                        <span className="text-[10px] text-ink-soft">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-soft mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
