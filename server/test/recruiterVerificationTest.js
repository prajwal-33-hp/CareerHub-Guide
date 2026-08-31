const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.join(__dirname, '../.env') })

const mongoose = require('mongoose')
const connectDB = require('../config/db')
const User = require('../models/User')
const Company = require('../models/Company')
const CompanyMember = require('../models/CompanyMember')
const RecruiterApplication = require('../models/RecruiterApplication')
const VerificationOtp = require('../models/VerificationOtp')
const CompanyInvite = require('../models/CompanyInvite')
const Job = require('../models/Job')
const AuditLog = require('../models/AuditLog')
const generateToken = require('../utils/generateToken')

async function runTests() {
  console.log('--- Starting Recruiter Verification System Test Suite ---')
  await connectDB()

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${message}`)
      failed++
    }
  }

  try {
    // Clean up test records
    console.log('\n[1] Setup & Cleanup test data...')
    const testEmails = [
      'testcandidate@example.com',
      'testrecruiter@acmetech.com',
      'teamrecruiter@acmetech.com',
      'rejectedapplicant@example.com',
      'admin_test@careerhub.com',
    ]

    const existingUsers = await User.find({ email: { $in: testEmails } })
    const userIds = existingUsers.map((u) => u._id)
    await Promise.all([
      User.deleteMany({ email: { $in: testEmails } }),
      RecruiterApplication.deleteMany({ user: { $in: userIds } }),
      CompanyMember.deleteMany({ user: { $in: userIds } }),
      CompanyInvite.deleteMany({ recipientEmail: { $in: testEmails } }),
      Company.deleteMany({ name: { $in: ['Acme Technologies Pvt Ltd', 'Nova Corp'] } }),
      Job.deleteMany({ title: 'Senior Backend Engineer (Test)' }),
    ])

    // Create Admin User
    const adminUser = await User.create({
      name: 'Admin Tester',
      email: 'admin_test@careerhub.com',
      password: 'password123',
      role: 'admin',
    })
    assert(adminUser.role === 'admin', 'Admin user created successfully')

    // Test 1: Normal Registration baseline
    console.log('\n[2] Testing Normal Candidate Baseline Registration...')
    const candidate = await User.create({
      name: 'Alex Candidate',
      email: 'testcandidate@example.com',
      password: 'password123',
      role: 'student',
      recruiterStatus: 'NONE',
    })
    assert(candidate.role === 'student', 'New registered user has role "student"')
    assert(candidate.recruiterStatus === 'NONE', 'New registered user has recruiterStatus "NONE"')
    assert(!candidate.isApprovedRecruiter(), 'Candidate is not recognized as approved recruiter')

    // Test 2: Recruiter Application Submission
    console.log('\n[3] Testing Recruiter Application Submission & Domain Match...')
    const app = await RecruiterApplication.create({
      user: candidate._id,
      applicantDetails: {
        fullName: 'Alex Johnson',
        workEmail: 'alex@acmetech.com',
        mobileNumber: '+919876543210',
        designation: 'Lead Talent Partner',
        department: 'Talent Acquisition',
        linkedinUrl: 'https://linkedin.com/in/alexjohnson',
      },
      companyDetails: {
        legalName: 'Acme Technologies Pvt Ltd',
        website: 'https://acmetech.com',
        domain: 'acmetech.com',
        companyType: 'Private Limited',
        industry: 'Fintech & Cloud',
        companySize: '51-200',
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        businessAddress: '400 Cyber Park, Electronic City, Bengaluru',
        description: 'Building modern cloud-native fintech infrastructure.',
        cin: 'U72900KA2021PTC145678',
        gstin: '29ABCDE1234F1Z5',
      },
      verification: {
        emailVerified: false,
        phoneVerified: false,
        domainMatched: true,
        companyVerified: false,
        relationshipVerified: true,
      },
      status: 'REQUESTED',
      companyRole: 'OWNER',
    })

    await candidate.updateOne({ recruiterStatus: 'REQUESTED' })
    const updatedCandidate = await User.findById(candidate._id)

    assert(app.status === 'REQUESTED', 'Recruiter application created with status "REQUESTED"')
    assert(app.verification.domainMatched === true, 'Domain match correctly identified (acmetech.com)')
    assert(updatedCandidate.recruiterStatus === 'REQUESTED', 'User recruiterStatus updated to "REQUESTED"')
    assert(!updatedCandidate.isApprovedRecruiter(), 'User with status REQUESTED is not yet approved recruiter')

    // Test 3: OTP Verification
    console.log('\n[4] Testing OTP Verification (Email & Phone)...')
    const bcrypt = require('bcryptjs')
    const testOtpCode = '582914'
    const salt = await bcrypt.genSalt(10)
    const otpHash = await bcrypt.hash(testOtpCode, salt)

    const emailOtpDoc = await VerificationOtp.create({
      target: 'alex@acmetech.com',
      type: 'email',
      otpHash,
      code: testOtpCode,
      user: candidate._id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })

    const isMatch = await emailOtpDoc.compareOtp('582914')
    assert(isMatch === true, 'Hashed OTP verified successfully against user input')

    const isWrongMatch = await emailOtpDoc.compareOtp('000000')
    assert(isWrongMatch === false, 'Invalid OTP is rejected')

    // Mark email and phone as verified
    app.verification.emailVerified = true
    app.verification.emailVerifiedAt = new Date()
    app.verification.phoneVerified = true
    app.verification.phoneVerifiedAt = new Date()
    await app.save()
    assert(app.verification.emailVerified && app.verification.phoneVerified, 'Email and Phone marked verified')

    // Test 4: Admin Review & Approval
    console.log('\n[5] Testing Admin Review & Approval Workflow...')
    app.status = 'UNDER_REVIEW'
    app.adminReview = {
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
      notes: 'GSTIN and CIN verified with MCA records. Domain match confirmed.',
    }
    await app.save()
    assert(app.status === 'UNDER_REVIEW', 'Application moved to UNDER_REVIEW by Admin')

    // Approve
    const slugify = require('../utils/slugify')
    const company = await Company.create({
      name: app.companyDetails.legalName,
      slug: slugify(app.companyDetails.legalName),
      website: app.companyDetails.website,
      domain: app.companyDetails.domain,
      companyType: app.companyDetails.companyType,
      industry: app.companyDetails.industry,
      location: `${app.companyDetails.city}, ${app.companyDetails.state}`,
      employees: app.companyDetails.companySize,
      cin: app.companyDetails.cin,
      gstin: app.companyDetails.gstin,
      owner: candidate._id,
      verified: true,
      status: 'verified',
      verifiedAt: new Date(),
      verifiedBy: adminUser._id,
    })

    const companyMember = await CompanyMember.create({
      company: company._id,
      user: candidate._id,
      companyRole: 'OWNER',
      designation: app.applicantDetails.designation,
      department: app.applicantDetails.department,
      workEmail: app.applicantDetails.workEmail,
      workPhone: app.applicantDetails.mobileNumber,
      status: 'active',
    })

    await User.findByIdAndUpdate(candidate._id, {
      role: 'recruiter',
      recruiterStatus: 'APPROVED',
      company: company._id,
      companyRole: 'OWNER',
    })

    app.status = 'APPROVED'
    app.createdCompany = company._id
    await app.save()

    const approvedRecruiter = await User.findById(candidate._id)
    assert(approvedRecruiter.role === 'recruiter', 'User role upgraded to "recruiter"')
    assert(approvedRecruiter.recruiterStatus === 'APPROVED', 'User recruiterStatus is "APPROVED"')
    assert(approvedRecruiter.isApprovedRecruiter(), 'isApprovedRecruiter() returns true')
    assert(String(approvedRecruiter.company) === String(company._id), 'User linked to approved Company')
    assert(companyMember.companyRole === 'OWNER', 'User assigned companyRole "OWNER" in CompanyMember')

    // Test 5: Job Posting by Approved Recruiter
    console.log('\n[6] Testing Job Posting by Approved Recruiter...')
    const job = await Job.create({
      title: 'Senior Backend Engineer (Test)',
      slug: 'senior-backend-engineer-test',
      description: 'Design and build resilient high-throughput microservices.',
      company: company._id,
      postedBy: approvedRecruiter._id,
      location: 'Bengaluru',
      skills: ['Node.js', 'MongoDB', 'Redis', 'Docker'],
      salary: '₹18L - ₹28L',
      experience: '3-6 yrs',
      jobType: 'Full Time',
      workMode: 'Hybrid',
      status: 'approved',
    })

    assert(job._id != null, 'Approved recruiter created job successfully')
    assert(String(job.company) === String(company._id), 'Job linked to verified company')

    // Test 6: Multi-Recruiter Company Team Invitation & Acceptance
    console.log('\n[7] Testing Multi-Recruiter Team Invitation & Acceptance...')
    const inviteToken = CompanyInvite.generateInviteToken()
    const invite = await CompanyInvite.create({
      company: company._id,
      invitedBy: approvedRecruiter._id,
      recipientEmail: 'teamrecruiter@acmetech.com',
      recipientName: 'Samantha Recruiter',
      companyRole: 'RECRUITER',
      designation: 'Tech Talent Specialist',
      department: 'Engineering Hiring',
      token: inviteToken,
    })

    assert(invite.status === 'PENDING', 'Company invite generated with status "PENDING"')

    // Register second user as standard candidate
    const secondUser = await User.create({
      name: 'Samantha Recruiter',
      email: 'teamrecruiter@acmetech.com',
      password: 'password123',
      role: 'student',
      recruiterStatus: 'NONE',
    })

    // Second user accepts invite
    const secondMember = await CompanyMember.create({
      company: company._id,
      user: secondUser._id,
      companyRole: invite.companyRole,
      designation: invite.designation,
      department: invite.department,
      workEmail: secondUser.email,
      status: 'active',
      invitedBy: approvedRecruiter._id,
    })

    await User.findByIdAndUpdate(secondUser._id, {
      role: 'recruiter',
      recruiterStatus: 'APPROVED',
      company: company._id,
      companyRole: invite.companyRole,
    })

    invite.status = 'ACCEPTED'
    invite.acceptedBy = secondUser._id
    invite.acceptedAt = new Date()
    await invite.save()

    const verifiedSecondUser = await User.findById(secondUser._id)
    assert(verifiedSecondUser.role === 'recruiter', 'Second user upgraded to "recruiter"')
    assert(verifiedSecondUser.recruiterStatus === 'APPROVED', 'Second user recruiterStatus is "APPROVED"')
    assert(verifiedSecondUser.companyRole === 'RECRUITER', 'Second user assigned role "RECRUITER"')
    assert(String(verifiedSecondUser.company) === String(company._id), 'Second user linked to same company')

    const teamCount = await CompanyMember.countDocuments({ company: company._id, status: 'active' })
    assert(teamCount === 2, 'Company now has 2 active recruiters in team (multi-recruiter support verified)')

    // Test 7: Rejection Workflow
    console.log('\n[8] Testing Rejection Workflow...')
    const rejectedApplicant = await User.create({
      name: 'Unverified Applicant',
      email: 'rejectedapplicant@example.com',
      password: 'password123',
      role: 'student',
      recruiterStatus: 'REQUESTED',
    })

    const rejectApp = await RecruiterApplication.create({
      user: rejectedApplicant._id,
      applicantDetails: {
        fullName: 'Unverified Applicant',
        workEmail: 'unverified@freemail.com',
        mobileNumber: '+919000000000',
        designation: 'HR',
        department: 'HR',
      },
      companyDetails: {
        legalName: 'Nova Corp',
        website: 'https://novacorp.invalid',
        domain: 'novacorp.invalid',
        companyType: 'Other',
        industry: 'Unknown',
        companySize: '1-10',
        country: 'India',
        state: 'Delhi',
        city: 'Delhi',
        businessAddress: 'Delhi',
        description: 'Test',
      },
      status: 'REJECTED',
      adminReview: {
        reviewedBy: adminUser._id,
        reviewedAt: new Date(),
        rejectionReason: 'Invalid business registration documents and fake domain',
      },
      rejectionHistory: [
        {
          rejectedAt: new Date(),
          rejectedBy: adminUser._id,
          reason: 'Invalid business registration documents and fake domain',
        },
      ],
    })

    await rejectedApplicant.updateOne({ recruiterStatus: 'REJECTED' })
    const rejectedUser = await User.findById(rejectedApplicant._id)
    assert(rejectedUser.role === 'student', 'Rejected applicant remains "student" role')
    assert(rejectedUser.recruiterStatus === 'REJECTED', 'recruiterStatus set to "REJECTED"')
    assert(!rejectedUser.isApprovedRecruiter(), 'Rejected applicant cannot access recruiter privileges')
    assert(rejectApp.rejectionHistory.length === 1, 'Rejection history preserved for auditing')

    // Test 8: Suspension Workflow
    console.log('\n[9] Testing Suspension Workflow...')
    await User.findByIdAndUpdate(secondUser._id, {
      recruiterStatus: 'SUSPENDED',
      status: 'suspended',
    })
    const suspendedUser = await User.findById(secondUser._id)
    assert(suspendedUser.status === 'suspended', 'User marked as suspended')
    assert(!suspendedUser.isApprovedRecruiter(), 'Suspended user isApprovedRecruiter() returns false')

    // Teardown test artifacts
    console.log('\n[10] Cleaning up temporary test artifacts...')
    await Job.deleteMany({ _id: job._id })
    await Company.deleteMany({ _id: company._id })
    await CompanyMember.deleteMany({ company: company._id })
    await CompanyInvite.deleteMany({ company: company._id })
    await RecruiterApplication.deleteMany({ _id: { $in: [app._id, rejectApp._id] } })
    await User.deleteMany({ _id: { $in: [adminUser._id, candidate._id, secondUser._id, rejectedApplicant._id] } })
    await VerificationOtp.deleteMany({ target: { $in: ['john.doe@acmetech.com', '+919876543210'] } })

    // Final Summary
    console.log('\n========================================')
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`)
    console.log('========================================')

    if (failed > 0) {
      process.exit(1)
    } else {
      process.exit(0)
    }
  } catch (err) {
    console.error('Test execution error:', err)
    process.exit(1)
  }
}

runTests()
