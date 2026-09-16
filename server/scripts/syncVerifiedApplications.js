const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '../.env') })

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    const RecruiterApplication = require('../models/RecruiterApplication')
    const User = require('../models/User')

    const result = await RecruiterApplication.updateMany(
      {},
      {
        $set: {
          'verification.emailVerified': true,
          'verification.emailVerifiedAt': new Date(),
          'verification.phoneVerified': true,
          'verification.phoneVerifiedAt': new Date(),
        },
      }
    )
    console.log('Successfully updated verification flags:', result)

    await User.updateMany(
      { recruiterStatus: { $in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED'] } },
      { $set: { isEmailVerified: true, isPhoneVerified: true } }
    )
    console.log('Successfully updated user email/phone verified flags')
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await mongoose.disconnect()
  }
}

run()
