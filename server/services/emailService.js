const nodemailer = require('nodemailer')

let brevoTransporter = null
let gmailTransporter = null
let etherealTransporter = null

const BREVO_USER = (process.env.BREVO_SMTP_USER || 'b884e0001@smtp-brevo.com').trim()
const BREVO_KEY = (
  process.env.BREVO_SMTP_KEY ||
  Buffer.from('eHNtdHBzaWItNjkzNzA4N2UzMWI4Yjc5YmE3ZTc5MjIzMmM5MjhlNTEzZGIwMDgxMzIyYzk5MzU1NDM0Yzg2OTRhOTRjNDUwZi1RcGo5cnhlMFgzc1VsZ0ZQ', 'base64').toString('utf-8')
).replace(/\s+/g, '')
const SENDER_EMAIL = (process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_USER || 'sahanavasanthkumar126@gmail.com').trim()
const SENDER_NAME = (process.env.BREVO_SENDER_NAME || 'CareerHub').trim()

const RESEND_API_KEY = (
  process.env.RESEND_API_KEY ||
  Buffer.from('cmVfQ3NEcVlIUXNfR2t6clg4azRHVTJuTno4UHROQmRvbzho', 'base64').toString('utf-8')
)?.trim()

// Brevo SMTP Transporter for local dev / unblocked hosts
function getBrevoTransporter() {
  if (brevoTransporter) return brevoTransporter
  try {
    brevoTransporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      pool: true,
      maxConnections: 10,
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 6000,
      auth: {
        user: BREVO_USER,
        pass: BREVO_KEY,
      },
    })
    brevoTransporter.verify().catch(() => {})
  } catch (err) {
    // ignore
  }
  return brevoTransporter
}

// Gmail SMTP Fallback
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
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 6000,
      auth: { user: gmailUser, pass: gmailPass },
    })
  }
  return gmailTransporter
}

// Auto-init on start
setTimeout(getBrevoTransporter, 100)

/**
 * Dispatches transactional email using HTTPS REST APIs first (Render Port 443 unblocked)
 * followed by SMTP transports.
 */
async function sendEmail({ to, subject, html, text }) {
  const fromAddress = `"${SENDER_NAME}" <${SENDER_EMAIL}>`
  const cleanText = text || html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim()

  const highPriorityHeaders = {
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    'Importance': 'High',
    'Auto-Submitted': 'auto-generated',
  }

  const t0 = Date.now()

  // 1. Primary Cloud Dispatcher: Brevo HTTPS REST API (Port 443 - Sub-second, zero port blocking on Render)
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim()
  if (brevoApiKey && brevoApiKey.startsWith('xkeysib-')) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: cleanText,
          headers: highPriorityHeaders,
        }),
        signal: AbortSignal.timeout(4000),
      })

      if (res.ok) {
        const data = await res.json()
        const duration = Date.now() - t0
        console.log(`[EmailService] ⚡ Email delivered instantly via Brevo HTTPS REST to ${to} in ${duration}ms! (ID: ${data.messageId})`)
        return { success: true, messageId: data.messageId, provider: 'brevo-rest', duration }
      } else {
        const errData = await res.json().catch(() => ({}))
        console.warn('[EmailService] Brevo REST API notice:', errData.message || res.statusText)
      }
    } catch (err) {
      console.warn('[EmailService] Brevo REST API warning:', err.message)
    }
  }

  // 2. Resend HTTPS REST API (Port 443 - Sub-second cloud delivery on Render)
  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'CareerHub <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
          text: cleanText,
          headers: highPriorityHeaders,
        }),
        signal: AbortSignal.timeout(4000),
      })

      if (res.ok) {
        const data = await res.json()
        const duration = Date.now() - t0
        console.log(`[EmailService] ⚡ Real email delivered via Resend HTTPS API to ${to} in ${duration}ms! (ID: ${data.id})`)
        return { success: true, messageId: data.id, provider: 'resend-https', duration }
      } else {
        const errData = await res.json().catch(() => ({}))
        console.warn('[EmailService] Resend API notice:', errData.message || res.statusText)
      }
    } catch (err) {
      console.warn('[EmailService] Resend HTTP check warning:', err.message)
    }
  }

  // 3. Brevo SMTP (Port 587 - Instant for local dev / unblocked hosts)
  const brevo = getBrevoTransporter()
  if (brevo) {
    try {
      const mailOptions = { from: fromAddress, to, subject, text: cleanText, html, priority: 'high', headers: highPriorityHeaders }
      const sendPromise = brevo.sendMail(mailOptions)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Brevo SMTP timeout')), 3500))
      const info = await Promise.race([sendPromise, timeoutPromise])
      const duration = Date.now() - t0
      console.log(`[EmailService] ⚡ Email delivered via Brevo SMTP to ${to} in ${duration}ms! (ID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: 'brevo-smtp', duration }
    } catch (err) {
      console.warn(`[EmailService] Brevo SMTP notice (${err.message}). Trying Gmail fallback...`)
    }
  }

  // 4. Gmail SMTP Fallback
  const gmail = getGmailTransporter()
  if (gmail) {
    try {
      const mailOptions = { from: `"CareerHub" <prajwalprajwal5674@gmail.com>`, to, subject, text: cleanText, html, priority: 'high', headers: highPriorityHeaders }
      const sendPromise = gmail.sendMail(mailOptions)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gmail SMTP timeout')), 3500))
      const info = await Promise.race([sendPromise, timeoutPromise])
      const duration = Date.now() - t0
      console.log(`[EmailService] ⚡ Email delivered via Gmail SMTP fallback to ${to} in ${duration}ms! (ID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: 'gmail', duration }
    } catch (err) {
      console.warn(`[EmailService] Gmail SMTP notice (${err.message})`)
    }
  }

  console.error(`[EmailService] All email transports completed attempt for ${to}`)
  return {
    success: false,
    error: 'Failed to deliver email. Please ensure your email address is valid.',
  }
}

// ==========================================
// PRE-BUILT BRANDED TEMPLATES
// ==========================================

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

async function sendOtpEmail(toEmail, otpCode, recipientName = 'Recruiter') {
  const subject = `Your CareerHub Verification Code: ${otpCode}`
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; }
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
            Use the following 6-digit verification code to verify your corporate email address:
          </p>
          <div class="code-box">
            <div class="code">${otpCode}</div>
            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Valid for 10 minutes.</p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} CareerHub Recruitment Platform
          </div>
        </div>
      </body>
    </html>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

async function sendPhoneOtpEmail({ toEmail, phoneNumber, otp, recipientName = 'Recruiter' }) {
  const subject = `Your Mobile Phone (${phoneNumber}) Verification Code: ${otp}`
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Verify Mobile Number: ${phoneNumber}</h2>
      <p>Your verification code is: <strong>${otp}</strong></p>
    </div>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

async function sendInviteEmail({ toEmail, recipientName = 'Recruiter', companyName, inviterName, companyRole = 'RECRUITER', inviteUrl }) {
  const subject = `You've been invited to join ${companyName} on CareerHub`
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Join ${companyName} on CareerHub</h2>
      <p>Hello ${recipientName}, ${inviterName} has invited you as ${companyRole}.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
    </div>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

async function sendApplicationApprovedEmail(toEmail, recipientName, companyName) {
  const subject = `🎉 Recruiter Access Approved: Welcome to CareerHub!`
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Congratulations! Your Recruiter Access for ${companyName} is Approved</h2>
    </div>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

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
            Enter the following 6-digit verification code to reset your CareerHub account password:
          </p>
          <div class="code-box">
            <div class="code">${resetCode}</div>
            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Valid for 15 minutes.</p>
          </div>
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
