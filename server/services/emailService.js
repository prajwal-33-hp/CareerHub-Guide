const nodemailer = require('nodemailer')

let brevoTransporter = null
let gmailTransporter = null
let etherealTransporter = null

// Initializes high-speed Brevo (Sendinblue) Transporter
function getBrevoTransporter() {
  if (brevoTransporter) return brevoTransporter

  const brevoUser = (process.env.BREVO_SMTP_USER || (process.env.SMTP_HOST?.includes('brevo') ? process.env.SMTP_USER : null))?.trim()
  const brevoKey = (process.env.BREVO_SMTP_KEY || (process.env.SMTP_HOST?.includes('brevo') ? process.env.SMTP_PASS : null))?.replace(/\s+/g, '')

  if (brevoUser && brevoKey) {
    brevoTransporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 2500, // 2.5s rapid failover timeout
      greetingTimeout: 2500,
      socketTimeout: 4000,
      auth: {
        user: brevoUser,
        pass: brevoKey,
      },
    })
    console.log(`[EmailService] Primary Brevo high-speed relay active (${brevoUser})`)
  }
  return brevoTransporter
}

// Initializes Gmail SMTP Transporter with persistent socket pooling
function getGmailTransporter() {
  if (gmailTransporter) return gmailTransporter

  const gmailUser = (process.env.GMAIL_USER || (!process.env.SMTP_HOST?.includes('brevo') ? process.env.SMTP_USER : null))?.trim()
  const gmailPass = (process.env.GMAIL_APP_PASS || (!process.env.SMTP_HOST?.includes('brevo') ? process.env.SMTP_PASS : null))?.replace(/\s+/g, '')

  if (gmailUser && gmailPass) {
    gmailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 5000,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    })
    console.log(`[EmailService] Secondary Gmail SMTP relay active (${gmailUser})`)
  }
  return gmailTransporter
}

// Initializes Ethereal dev fallback
async function getEtherealTransporter() {
  if (etherealTransporter) return etherealTransporter
  try {
    const testAccount = await nodemailer.createTestAccount()
    etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    console.log('[EmailService] Dev Ethereal transport initialized.')
    return etherealTransporter
  } catch (err) {
    return {
      sendMail: async (opts) => {
        console.log(`[EmailService Mock] To: ${opts.to} | Subject: ${opts.subject}`)
        return { messageId: 'mock-id' }
      },
    }
  }
}

// Utility to dispatch email with automatic failover (Brevo -> Gmail -> Ethereal)
async function sendEmail({ to, subject, html, text }) {
  const fromAddress =
    process.env.EMAIL_FROM ||
    `"CareerHub Verifications" <${process.env.BREVO_SMTP_USER || process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@careerhub.com'}>`

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text: text || html.replace(/<[^>]*>?/gm, ''),
    html,
    priority: 'high',
    headers: {
      'X-Priority': '1 (Highest)',
      'X-MSMail-Priority': 'High',
      Importance: 'High',
    },
  }

  // 1. Attempt Primary: Brevo (Ultra-fast instant sub-second delivery)
  const brevo = getBrevoTransporter()
  if (brevo) {
    try {
      const info = await brevo.sendMail(mailOptions)
      console.log(`[EmailService] ⚡ Instant email delivered via Brevo to ${to} (MessageID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: 'brevo' }
    } catch (err) {
      console.warn(`[EmailService] Brevo delivery failed (${err.message}). Attempting Gmail fallback...`)
    }
  }

  // 2. Attempt Fallback: Gmail SMTP App Password
  const gmail = getGmailTransporter()
  if (gmail) {
    try {
      const info = await gmail.sendMail(mailOptions)
      console.log(`[EmailService] Email delivered via Gmail SMTP to ${to} (MessageID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: 'gmail' }
    } catch (err) {
      console.warn(`[EmailService] Gmail delivery failed (${err.message}). Attempting dev transport...`)
    }
  }

  // 3. Dev Fallback: Ethereal test inbox
  try {
    const ethereal = await getEtherealTransporter()
    const info = await ethereal.sendMail(mailOptions)
    const previewUrl = nodemailer.getTestMessageUrl(info)
    console.log(`[EmailService] Email delivered via Ethereal test transport to ${to}`)
    if (previewUrl) {
      console.log(`[EmailService] 🔗 Live test email preview: ${previewUrl}`)
    }
    return { success: true, messageId: info.messageId, previewUrl, provider: 'ethereal' }
  } catch (err) {
    console.error(`[EmailService] All email transports failed for ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

// ==========================================
// PRE-BUILT BRANDED TEMPLATES
// ==========================================

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
            © ${new Date().getFullYear()} CareerHub Recruitment Platform • Secure Verification Engine
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
            © ${new Date().getFullYear()} CareerHub • Account Security Team
          </div>
        </div>
      </body>
    </html>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendInviteEmail,
  sendApplicationApprovedEmail,
  sendPasswordResetEmail,
}
