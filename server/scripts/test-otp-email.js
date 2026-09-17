require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const { sendSignupOtpEmail } = require('../services/emailService')

const targetEmail = process.argv[2] || process.env.GMAIL_USER || 'prajwalprajwal5674@gmail.com'
const testOtp = Math.floor(100000 + Math.random() * 900000).toString()

console.log('========================================================')
console.log(`🚀 Sending live verification OTP test to: ${targetEmail}`)
console.log(`🔑 Verification Code: ${testOtp}`)
console.log('========================================================')

const t0 = Date.now()

sendSignupOtpEmail(targetEmail, testOtp, 'CareerHub Tester')
  .then((result) => {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
    console.log('--------------------------------------------------------')
    if (result.success) {
      console.log(`✅ SUCCESS! Email delivered in ${elapsed}s via [${result.provider}]`)
      console.log(`📬 Message ID: ${result.messageId}`)
      console.log(`👉 Please check the Primary Inbox for: ${targetEmail}`)
    } else {
      console.error(`❌ FAILED: ${result.error}`)
    }
    console.log('========================================================')
    process.exit(result.success ? 0 : 1)
  })
  .catch((err) => {
    console.error('❌ Exception occurred:', err.message)
    process.exit(1)
  })
