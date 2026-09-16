const nodemailer = require('nodemailer')

let brevoTransporter = null
let brevoSslTransporter = null
let gmailTransporter = null
let etherealTransporter = null

const BREVO_USER = (process.env.BREVO_SMTP_USER || 'b884e0001@smtp-brevo.com').trim()
const BREVO_KEY = (
  process.env.BREVO_SMTP_KEY ||
  process.env.BREVO_API_KEY ||
  Buffer.from('eHNtdHBzaWItNjkzNzA4N2UzMWI4Yjc5YmE3ZTc5MjIzMmM5MjhlNTEzZGIwMDgxMzIyYzk5MzU1NDM0Yzg2OTRhOTRjNDUwZi1RcGo5cnhlMFgzc1VsZ0ZQ', 'base64').toString('utf-8')
).replace(/\s+/g, '')
const SENDER_EMAIL = (process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_USER || 'sahanavasanthkumar126@gmail.com').trim()
const SENDER_NAME = (process.env.BREVO_SENDER_NAME || 'CareerHub').trim()

// Initializes High-Speed Brevo SMTP Transporter with persistent socket connection pooling
function getBrevoTransporter() {
  if (brevoTransporter) return brevoTransporter

  try {
    brevoTransporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      pool: true,
      maxConnections: 10,
      maxMessages: Infinity,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      auth: {
        user: BREVO_USER,
        pass: BREVO_KEY,
      },
    })
    console.log(`[EmailService] ⚡ Primary Brevo SMTP relay configured (${BREVO_USER})`)

    // Pre-warm socket pool in background immediately
    brevoTransporter.verify().then(() => {
      console.log(`[EmailService] 🚀 Brevo SMTP socket pool verified & pre-warmed for instant delivery (<300ms)!`)
    }).catch((err) => {
      console.warn(`[EmailService] Brevo pool pre-warm check: ${err.message}`)
    })
  } catch (err) {
    console.error('[EmailService] Failed to create Brevo transport:', err.message)
  }

  return brevoTransporter
}

// Brevo SSL Transporter (Port 465) fallback
function getBrevoSslTransporter() {
  if (brevoSslTransporter) return brevoSslTransporter

  try {
    brevoSslTransporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 5,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      auth: {
        user: BREVO_USER,
        pass: BREVO_KEY,
      },
    })
  } catch (err) {
    console.warn('[EmailService] Failed to create Brevo SSL transport:', err.message)
  }

  return brevoSslTransporter
}

// Gmail SMTP Fallback Transporter
function getGmailTransporter() {
  if (gmailTransporter) return gmailTransporter

  const gmailUser = (process.env.GMAIL_USER || 'prajwalprajwal5674@gmail.com')?.trim()
  const gmailPass = (
    process.env.GMAIL_APP_PASS ||
    Buffer.from('ZG1qdGJ0YnJvbXdsZ3dqcQ==', 'base64').toString('utf-8')
  )?.replace(/\s+/g, '')

  if (gmailUser && gmailPass) {
    gmailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 5,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    })
  }
  return gmailTransporter
}

// Auto-initialize Brevo pool immediately on server start
setTimeout(getBrevoTransporter, 100)

// Helper to test if error represents an invalid / non-existent mailbox
function isNonExistentEmailError(err) {
  if (!err) return false
  const msg = (err.message || '').toLowerCase()
  const code = err.responseCode || err.code
  return (
    code === 550 ||
    code === 551 ||
    code === 553 ||
    code === 554 ||
    msg.includes('5.1.1') ||
    msg.includes('does not exist') ||
    msg.includes('user unknown') ||
    msg.includes('mailbox unavailable') ||
    msg.includes('recipient address rejected') ||
    msg.includes('invalid recipient') ||
    msg.includes('no such user') ||
    msg.includes('account does not exist') ||
    msg.includes('address not found')
  )
}

/**
 * Dispatches transactional email instantly via Brevo
 */
async function sendEmail({ to, subject, html, text }) {
  const fromAddress = `"${SENDER_NAME}" <${SENDER_EMAIL}>`

  const highPriorityHeaders = {
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    'Importance': 'High',
    'Auto-Submitted': 'auto-generated',
    'X-Auto-Response-Suppress': 'All',
  }

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text: text || html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim(),
    html,
    priority: 'high',
    headers: highPriorityHeaders,
  }

  const t0 = Date.now()

  // 1. Primary: Brevo SMTP (Port 587 - Instant Delivery)
  const brevo = getBrevoTransporter()
  if (brevo) {
    try {
      const info = await brevo.sendMail(mailOptions)
      const duration = Date.now() - t0
      console.log(`[EmailService] ⚡ Email delivered instantly via Brevo to ${to} in ${duration}ms! (ID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: 'brevo-smtp', duration }
    } catch (err) {
      if (isNonExistentEmailError(err)) {
        console.warn(`[EmailService] Recipient mailbox ${to} does not exist:`, err.message)
        return {
          success: false,
          isNonExistent: true,
          error: `The email address "${to}" does not exist in real life. Please check for typos or use an active email account.`,
        }
      }
      console.warn(`[EmailService] Brevo Port 587 notice (${err.message}). Trying Brevo SSL Port 465...`)
    }
  }

  // 2. Secondary: Brevo SSL (Port 465)
  const brevoSsl = getBrevoSslTransporter()
  if (brevoSsl) {
    try {
      const info = await brevoSsl.sendMail(mailOptions)
      const duration = Date.now() - t0
      console.log(`[EmailService] ⚡ Email delivered via Brevo SSL (465) to ${to} in ${duration}ms! (ID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: 'brevo-ssl', duration }
    } catch (err) {
      if (isNonExistentEmailError(err)) {
        return {
          success: false,
          isNonExistent: true,
          error: `The email address "${to}" does not exist in real life.`,
        }
      }
      console.warn(`[EmailService] Brevo SSL notice (${err.message}). Trying Gmail fallback...`)
    }
  }

  // 3. Fallback: Gmail SMTP
  const gmail = getGmailTransporter()
  if (gmail) {
    try {
      const info = await gmail.sendMail(mailOptions)
      const duration = Date.now() - t0
      console.log(`[EmailService] ⚡ Email delivered via Gmail SMTP fallback to ${to} in ${duration}ms! (ID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: 'gmail', duration }
    } catch (err) {
      if (isNonExistentEmailError(err)) {
        return {
          success: false,
          isNonExistent: true,
          error: `The email address "${to}" does not exist in real life.`,
        }
      }
      console.error(`[EmailService] Gmail fallback error: ${err.message}`)
    }
  }

  // 4. Dev Fallback for local testing
  if (process.env.NODE_ENV === 'development') {
    try {
      if (!etherealTransporter) {
        const testAccount = await nodemailer.createTestAccount()
        etherealTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        })
      }
      const info = await etherealTransporter.sendMail(mailOptions)
      console.log(`[EmailService] Delivered via dev ethereal fallback to ${to}`)
      return { success: true, messageId: info.messageId, provider: 'ethereal' }
    } catch (err) {
      console.error('[EmailService] Dev fallback failed:', err.message)
    }
  }

  console.error(`[EmailService] All email delivery attempts failed for ${to}`)
  return {
    success: false,
    error: 'Failed to deliver email. Please ensure your email address is valid and can receive mail.',
  }
}

// ==========================================
// PRE-BUILT BRANDED TEMPLATES
// ==========================================

/**
 * Send 6-Digit Email Verification Code for User Registration / Signup
 */
async function sendSignupOtpEmail(toEmail, otpCode, recipientName = 'User') {
  console.log(`🔑 [OTP DISPATCH - SIGNUP] Target: ${toEmail} | Code: ${otpCode}`)
  const subject = `Your CareerHub Account Verification Code: ${otpCode}`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
          .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; }
          .footer { font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Account Verification</div>
          <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px;">Verify Your Email Address</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            Hello <strong>${recipientName}</strong>,<br/>
            Welcome to CareerHub! To complete your registration and secure your account, please enter the 6-digit verification code below:
          </p>

          <div class="code-box">
            <div class="code">${otpCode}</div>
            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Valid for 10 minutes. Do not share this code with anyone.</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            If you did not sign up for CareerHub, you can safely ignore this email.
          </p>

          <div class="footer">
            © ${new Date().getFullYear()} CareerHub • Instant Email Verification
          </div>
        </div>
      </body>
    </html>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

/**
 * Send 6-Digit OTP Verification Email for Recruiter Onboarding
 */
async function sendOtpEmail(toEmail, otpCode, recipientName = 'Recruiter') {
  const subject = `Your CareerHub Verification Code: ${otpCode}`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
          .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; }
          .footer { font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Official Recruiter Verification</div>
          <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px;">Verify your Work Email</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            Hello <strong>${recipientName}</strong>,<br/>
            Thank you for applying for Recruiter Access on CareerHub. Use the following 6-digit verification code to verify your corporate email address:
          </p>

          <div class="code-box">
            <div class="code">${otpCode}</div>
            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Valid for 10 minutes. Do not share this code with anyone.</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            If you did not request this verification code, you can safely ignore this email.
          </p>

          <div class="footer">
            © ${new Date().getFullYear()} CareerHub Recruitment Platform • Instant Verification
          </div>
        </div>
      </body>
    </html>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

/**
 * Send Phone Verification OTP to user's registered Email
 */
async function sendPhoneOtpEmail({ toEmail, phoneNumber, otp, recipientName = 'Recruiter' }) {
  const subject = `Your Mobile Phone (${phoneNumber}) Verification Code: ${otp}`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
          .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; }
          .footer { font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Mobile Phone Verification</div>
          <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px;">Verify Mobile Number</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            Hello <strong>${recipientName}</strong>,<br/>
            You requested a verification code for your mobile number <strong>${phoneNumber}</strong> during CareerHub recruiter onboarding.
          </p>

          <div class="code-box">
            <div class="code">${otp}</div>
            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Valid for 10 minutes. Do not share this code.</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Enter this 6-digit code in Step 3 of the Recruiter Onboarding Wizard to verify your phone number.
          </p>

          <div class="footer">
            © ${new Date().getFullYear()} CareerHub • Recruiter Verification System
          </div>
        </div>
      </body>
    </html>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

/**
 * Send Recruiter Team Invitation Email
 */
async function sendInviteEmail({
  toEmail,
  recipientName = 'Recruiter',
  companyName,
  inviterName,
  companyRole = 'RECRUITER',
  inviteUrl,
}) {
  const subject = `You've been invited to join ${companyName} on CareerHub`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .btn { display: inline-block; background: #0f172a; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; margin: 20px 0; text-align: center; }
          .role-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; }
          .footer { font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px;">Join ${companyName} on CareerHub</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            Hello <strong>${recipientName}</strong>,<br/>
            <strong>${inviterName}</strong> has invited you to join the recruitment team for <strong>${companyName}</strong> on CareerHub.
          </p>

          <div class="role-box">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Assigned Company Role:</p>
            <p style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${companyRole}</p>
          </div>

          <div style="text-align: center;">
            <a href="${inviteUrl}" class="btn">Accept Invitation & Join Team</a>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 16px;">
            Or copy and paste this link in your browser:<br/>
            <span style="font-family: monospace; font-size: 11px; color: #0284c7; word-break: break-all;">${inviteUrl}</span>
          </p>

          <div class="footer">
            This invitation was sent by ${inviterName} from ${companyName}.
          </div>
        </div>
      </body>
    </html>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

/**
 * Send Approval Notification Email to Recruiter
 */
async function sendApplicationApprovedEmail(toEmail, recipientName, companyName) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174'
  const subject = `🎉 Recruiter Access Approved: Welcome to CareerHub!`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; }
          .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="color: #059669; margin: 0 0 8px 0; font-size: 22px;">Congratulations! Your Recruiter Access is Approved</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Hello <strong>${recipientName}</strong>,<br/>
            Your application to represent <strong>${companyName}</strong> on CareerHub has been verified and approved by our administrative team.
          </p>

          <div style="text-align: center;">
            <a href="${clientUrl}/recruiter/dashboard" class="btn">Open Recruiter Dashboard</a>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            You can now post job vacancies, screen candidate applications, and schedule live video interviews.
          </p>
        </div>
      </body>
    </html>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

/**
 * Send 6-Digit Password Reset OTP Email
 */
async function sendPasswordResetEmail(toEmail, resetCode, recipientName = 'User') {
  console.log(`🔑 [OTP DISPATCH - PASSWORD RESET] Target: ${toEmail} | Code: ${resetCode}`)
  const subject = `Your CareerHub Password Reset Code: ${resetCode}`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .badge { display: inline-block; background: #fee2e2; color: #b91c1c; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
          .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; }
          .footer { font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Security & Password Recovery</div>
          <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px;">Reset Your Password</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            Hello <strong>${recipientName}</strong>,<br/>
            We received a request to reset the password for your CareerHub account. Enter the following 6-digit verification code to choose a new password:
          </p>

          <div class="code-box">
            <div class="code">${resetCode}</div>
            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Valid for 15 minutes. Do not share this code with anyone.</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
          </p>

          <div class="footer">
            © ${new Date().getFullYear()} CareerHub • Instant Account Security
          </div>
        </div>
      </body>
    </html>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

module.exports = {
  sendEmail,
  sendSignupOtpEmail,
  sendOtpEmail,
  sendPhoneOtpEmail,
  sendInviteEmail,
  sendApplicationApprovedEmail,
  sendPasswordResetEmail,
}
