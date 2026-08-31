const http = require('http')

const BASE_URL = 'http://localhost:5000'

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsed })
        } catch {
          resolve({ status: res.statusCode, raw: data })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function verifyLiveSystem() {
  console.log('========================================================')
  console.log('🚀 RUNNING LIVE HTTP END-TO-END VERIFICATION')
  console.log(`Target: ${BASE_URL}`)
  console.log('========================================================\n')

  let passed = 0
  let failed = 0

  function check(title, condition, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${title}`)
      if (extraInfo) console.log(`   ${extraInfo}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${title}`)
      if (extraInfo) console.error(`   ${extraInfo}`)
      failed++
    }
  }

  try {
    const timestamp = Date.now()
    const testCandidateEmail = `live_candidate_${timestamp}@prismtechnologies.com`
    const testPassword = 'Password123!'

    // 1. Health Check
    const health = await request('GET', '/api/health')
    check('API Health Check', health.status === 200 && health.data.status === 'ok')

    // 2. Candidate Registration (Must be role: student)
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Sarah Talent Lead',
      email: testCandidateEmail,
      password: testPassword,
      role: 'recruiter', // Frontend tries sending recruiter, but server strictly enforces candidate!
    })

    check(
      'Registration Security Enforcement',
      regRes.status === 201 && regRes.data.user.role === 'student',
      `User created with role "${regRes.data.user?.role}" and recruiterStatus "${regRes.data.user?.recruiterStatus}" (Recruiter role is blocked on signup)`
    )

    const candidateToken = regRes.data.token

    // 3. Unapproved User Trying to Post a Job (Must be 403 Forbidden)
    const illegalJobRes = await request(
      'POST',
      '/api/jobs',
      { title: 'Hacked Job Posting' },
      candidateToken
    )
    check(
      'Unauthorized Recruiter Route Guard',
      illegalJobRes.status === 403,
      `Unapproved candidate job posting blocked with 403 Forbidden: "${illegalJobRes.data.message}"`
    )

    // 4. Submit Recruiter & Company Onboarding Application
    const applyRes = await request(
      'POST',
      '/api/recruiter-verification/apply',
      {
        applicantDetails: {
          fullName: 'Sarah Talent Lead',
          workEmail: testCandidateEmail,
          mobileNumber: '+919876543210',
          designation: 'Head of Talent Acquisition',
          department: 'Engineering Hiring',
          linkedinUrl: 'https://linkedin.com/in/sarahtalent',
        },
        companyDetails: {
          legalName: `Prism Cloud Technologies ${timestamp} Pvt Ltd`,
          website: 'https://prismtechnologies.com',
          companyType: 'Private Limited',
          industry: 'Cloud & AI Infrastructure',
          companySize: '51-200',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          businessAddress: '100 Outer Ring Road, Bengaluru',
          description: 'High performance cloud AI compute infrastructure.',
          cin: 'U72900KA2022PTC156789',
          gstin: '29ABCDE1234F1Z5',
        },
      },
      candidateToken
    )

    check(
      'Recruiter Application Submission',
      applyRes.status === 201 && applyRes.data.application.status === 'REQUESTED',
      `Application ID: ${applyRes.data.application?._id} | Domain Matched: ${applyRes.data.application?.verification?.domainMatched}`
    )

    const applicationId = applyRes.data.application._id

    // 5. Send & Verify Work Email OTP
    const emailOtpRes = await request(
      'POST',
      '/api/recruiter-verification/send-otp',
      { type: 'email', target: testCandidateEmail },
      candidateToken
    )
    const emailCode = emailOtpRes.data.testOtp
    check(
      'Work Email OTP Dispatch',
      emailOtpRes.status === 200 && Boolean(emailCode),
      `OTP Code: ${emailCode} sent to ${testCandidateEmail}`
    )

    const verifyEmailRes = await request(
      'POST',
      '/api/recruiter-verification/verify-otp',
      { type: 'email', target: testCandidateEmail, otp: emailCode },
      candidateToken
    )
    check(
      'Work Email OTP Verification',
      verifyEmailRes.status === 200 && verifyEmailRes.data.verification.emailVerified === true,
      `Email verification status: ${verifyEmailRes.data.verification?.emailVerified}`
    )

    // 6. Send & Verify Phone OTP
    const phoneOtpRes = await request(
      'POST',
      '/api/recruiter-verification/send-otp',
      { type: 'phone', target: '+919876543210' },
      candidateToken
    )
    const phoneCode = phoneOtpRes.data.testOtp
    const verifyPhoneRes = await request(
      'POST',
      '/api/recruiter-verification/verify-otp',
      { type: 'phone', target: '+919876543210', otp: phoneCode },
      candidateToken
    )
    check(
      'Phone OTP Verification',
      verifyPhoneRes.status === 200 && verifyPhoneRes.data.verification.phoneVerified === true,
      `Phone verification status: ${verifyPhoneRes.data.verification?.phoneVerified}`
    )

    // 7. Admin Login
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@careerhub.com',
      password: 'admin1234',
      role: 'admin',
    })
    check('Admin Authentication', adminLoginRes.status === 200 && adminLoginRes.data.user.role === 'admin')
    const adminToken = adminLoginRes.data.token

    // 8. Admin Application Dossier Inspection
    const adminDossierRes = await request(
      'GET',
      `/api/recruiter-verification/admin/applications/${applicationId}`,
      null,
      adminToken
    )
    check(
      'Admin Application Review Dossier',
      adminDossierRes.status === 200 && adminDossierRes.data.application._id === applicationId,
      `CIN: ${adminDossierRes.data.application?.companyDetails?.cin} | Domain Matched: ${adminDossierRes.data.application?.verification?.domainMatched}`
    )

    // 9. Admin Approves Application
    const approveRes = await request(
      'PUT',
      `/api/recruiter-verification/admin/applications/${applicationId}/status`,
      {
        status: 'APPROVED',
        notes: 'Statutory CIN & GSTIN verified against registry. Approved by Admin.',
        companyRole: 'OWNER',
      },
      adminToken
    )
    check(
      'Admin Application Approval Workflow',
      approveRes.status === 200 && approveRes.data.application.status === 'APPROVED',
      `Company created: "${approveRes.data.company?.name}" | Verified: ${approveRes.data.company?.verified}`
    )

    // 10. Re-authenticate Recruiter and Test Job Creation
    const recruiterLoginRes = await request('POST', '/api/auth/login', {
      email: testCandidateEmail,
      password: testPassword,
      role: 'recruiter',
    })
    check(
      'Approved Recruiter Authentication',
      recruiterLoginRes.status === 200 &&
        recruiterLoginRes.data.user.role === 'recruiter' &&
        recruiterLoginRes.data.user.recruiterStatus === 'APPROVED',
      `User Role: ${recruiterLoginRes.data.user?.role} | Status: ${recruiterLoginRes.data.user?.recruiterStatus}`
    )
    const approvedRecruiterToken = recruiterLoginRes.data.token

    // 11. Recruiter Posts a Real Job
    const postJobRes = await request(
      'POST',
      '/api/jobs',
      {
        title: `Senior Full Stack Cloud Engineer ${timestamp}`,
        location: 'Bengaluru',
        jobType: 'Full Time',
        workMode: 'Hybrid',
        skills: ['React', 'Node.js', 'AWS', 'Docker'],
        salary: '₹22L - ₹35L',
        experience: '4-8 yrs',
        description: 'Lead engineering for our high scale distributed AI infrastructure.',
      },
      approvedRecruiterToken
    )
    check(
      'Recruiter Job Posting Permission',
      postJobRes.status === 201 && Boolean(postJobRes.data.job?._id),
      `Job "${postJobRes.data.job?.title}" created with Slug: ${postJobRes.data.job?.slug}`
    )

    // 12. Recruiter Invites a Colleague
    const colleagueEmail = `colleague_${timestamp}@prismtechnologies.com`
    const inviteRes = await request(
      'POST',
      '/api/companies/team/invite',
      {
        recipientEmail: colleagueEmail,
        recipientName: 'Alex Colleague',
        companyRole: 'RECRUITER',
        designation: 'Technical Talent Sourcer',
        department: 'Talent Acquisition',
      },
      approvedRecruiterToken
    )
    check(
      'Multi-Recruiter Team Invitation',
      inviteRes.status === 201 && Boolean(inviteRes.data.invite?.token),
      `Invite URL: ${inviteRes.data.inviteUrl}`
    )
    const inviteToken = inviteRes.data.invite.token

    // 13. Public Invite Token Validation
    const validateTokenRes = await request(
      'GET',
      `/api/companies/team/invites/validate/${inviteToken}`
    )
    check(
      'Public Invite Token Validation',
      validateTokenRes.status === 200 && validateTokenRes.data.invite.recipientEmail === colleagueEmail,
      `Company: ${validateTokenRes.data.invite?.company?.name} | Role: ${validateTokenRes.data.invite?.companyRole}`
    )

    // 14. Colleague Registers and Accepts Invitation
    const colleagueReg = await request('POST', '/api/auth/register', {
      name: 'Alex Colleague',
      email: colleagueEmail,
      password: testPassword,
    })
    const colleagueToken = colleagueReg.data.token

    const acceptRes = await request(
      'POST',
      '/api/companies/team/invites/accept',
      {
        token: inviteToken,
        mobileNumber: '+919999888877',
        designation: 'Technical Talent Sourcer',
      },
      colleagueToken
    )
    check(
      'Invitation Acceptance & Instant Company Membership',
      acceptRes.status === 200 && acceptRes.data.membership?.companyRole === 'RECRUITER',
      `Joined: ${acceptRes.data.company?.name} as ${acceptRes.data.membership?.companyRole}`
    )

    // Final Summary
    console.log('\n========================================================')
    console.log(`LIVE VERIFICATION RESULT: ${passed} Passed, ${failed} Failed`)
    console.log('========================================================\n')

    process.exit(failed > 0 ? 1 : 0)
  } catch (err) {
    console.error('Fatal verification error:', err)
    process.exit(1)
  }
}

verifyLiveSystem()
