const nodemailer = require('nodemailer')

let cachedTransporter = null

// Creates and caches a Nodemailer transporter instance
async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter
  }

  // 1. If real SMTP credentials are provided in environment variables
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const isGmail =
      process.env.SMTP_SERVICE?.toLowerCase() === 'gmail' ||
      process.env.SMTP_HOST?.includes('gmail') ||
      process.env.SMTP_USER?.includes('@gmail.com')

    const transportOptions = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS, // 16-character Google App Password
          },
        }
      : {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }

    cachedTransporter = nodemailer.createTransport(transportOptions)
    console.log(`[EmailService] Configured real SMTP delivery via ${process.env.SMTP_USER}`)
    return cachedTransporter
  }

  // 2. If no SMTP credentials provided, create an auto-generated Ethereal test account
  // This allows seeing real formatted emails in development via a live web preview link.
  try {
    const testAccount = await nodemailer.createTestAccount()
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    console.log('[EmailService] Using Ethereal test email transport for local testing.')
    return cachedTransporter
  } catch (err) {
    console.warn('[EmailService] Could not initialize Ethereal transport:', err.message)
    // Fallback pseudo transporter
    return {
      sendMail: async (opts) => {
        console.log(`[EmailService Mock] To: ${opts.to} | Subject: ${opts.subject}`)
        return { messageId: 'mock-id' }
      },
    }
  }
}

// Utility to dispatch email
async function sendEmail({ to, subject, html, text }) {
  try {
    const transporter = await getTransporter()
    const fromAddress =
      process.env.EMAIL_FROM ||
      `"CareerHub Verifications" <${process.env.SMTP_USER || 'no-reply@careerhub.com'}>`

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
    })

    console.log(`[EmailService] Email sent successfully to ${to} (MessageID: ${info.messageId})`)

    // If Ethereal test transport was used, print the live URL preview
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`[EmailService] 🔗 View delivered test email in browser: ${previewUrl}`)
    }

    return { success: true, messageId: info.messageId, previewUrl }
  } catch (err) {
    console.error(`[EmailService] Error sending email to ${to}:`, err.message)
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

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendInviteEmail,
  sendApplicationApprovedEmail,
}
