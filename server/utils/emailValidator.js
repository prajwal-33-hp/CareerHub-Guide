const dns = require('dns').promises

// Common typos for major email providers
const COMMON_TYPO_DOMAINS = {
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaul.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yaho.co.in': 'yahoo.co.in',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlk.com': 'outlook.com',
  'iclou.com': 'icloud.com',
  'iclod.com': 'icloud.com',
}

// Common placeholder / dummy handles that do not represent real users
const DUMMY_LOCAL_PARTS = new Set([
  'test',
  'testing',
  'testuser',
  'fake',
  'fakeuser',
  'fakeemail',
  'dummy',
  'dummyuser',
  'temp',
  'tempuser',
  'asdf',
  'asdfgh',
  'asdfghjk',
  'qwerty',
  'qwertyuiop',
  'zxcvbnm',
  'nobody',
  'null',
  'undefined',
  'invalid',
  'sample',
  'example',
])

// Comprehensive list of known disposable, temporary, and burner email providers
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'trashmail.com',
  'yopmail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'fake.com',
  'test.com',
  'example.com',
  'invalid',
  'temp-mail.org',
  'throwawaymail.com',
  'burnermail.io',
  'crazymailing.com',
  'generator.email',
  'maildrop.cc',
  'mintemail.com',
  'mohmal.com',
  'fakemailgenerator.com',
  'emailondeck.com',
  'mytemp.email',
  'inboxkitten.com',
  'getnada.com',
  'trashmail.net',
  'tempmailaddress.com',
  'throwawayemail.com',
  'spamgourmet.com',
  '0-mail.com',
  '10mail.org',
  'dropmail.me',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'einrot.com',
  'harakirimail.com',
  'trashmail.me',
  'jetable.org',
  'mailcatch.com',
  'meltmail.com',
  'mytrashmail.com',
  'trashymail.com',
  'zoemail.org',
  'mailnesia.com',
  'tempinbox.com',
  'trashmail.ws',
])

/**
 * Check if email exists via external Verification API (Abstract API / Hunter / ZeroBounce / Debounce)
 * @param {string} email
 * @returns {Promise<{ checked: boolean, valid?: boolean, error?: string }>}
 */
async function checkExternalVerificationApi(email) {
  // 1. Abstract API (Popular, instant SMTP existence check)
  if (process.env.ABSTRACT_EMAIL_API_KEY) {
    try {
      const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_EMAIL_API_KEY}&email=${encodeURIComponent(email)}`
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) })
      if (res.ok) {
        const data = await res.json()
        if (data.deliverability === 'UNDELIVERABLE' || data.is_valid_format?.value === false) {
          return {
            checked: true,
            valid: false,
            error: 'This email address does not exist in real life. Please check for typos or use an active email account.',
          }
        }
        if (data.is_disposable_email?.value === true) {
          return {
            checked: true,
            valid: false,
            error: 'Disposable and temporary email addresses are strictly prohibited.',
          }
        }
        return { checked: true, valid: true }
      }
    } catch (err) {
      console.warn('[EmailValidator] Abstract API check warning:', err.message)
    }
  }

  // 2. Hunter.io API
  if (process.env.HUNTER_API_KEY) {
    try {
      const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${process.env.HUNTER_API_KEY}`
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) })
      if (res.ok) {
        const data = await res.json()
        const result = data?.data?.result
        if (result === 'undeliverable') {
          return {
            checked: true,
            valid: false,
            error: 'This email address does not exist in real life. Please check for typos or use an active email account.',
          }
        }
        if (data?.data?.disposable) {
          return {
            checked: true,
            valid: false,
            error: 'Disposable and temporary email addresses are strictly prohibited.',
          }
        }
        return { checked: true, valid: true }
      }
    } catch (err) {
      console.warn('[EmailValidator] Hunter API check warning:', err.message)
    }
  }

  // 3. ZeroBounce API (Real-Time SMTP & AI Mailbox Verification)
  if (process.env.ZEROBOUNCE_API_KEY) {
    try {
      const url = `https://api.zerobounce.net/v2/validate?api_key=${process.env.ZEROBOUNCE_API_KEY}&email=${encodeURIComponent(email)}`
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'invalid') {
          const sub = data.sub_status ? ` (${data.sub_status.replace(/_/g, ' ')})` : ''
          return {
            checked: true,
            valid: false,
            error: `This email mailbox does not exist in real life${sub}. Please check for typos or enter a real email account.`,
          }
        }
        if (data.status === 'abuse' || data.status === 'spamtrap') {
          return {
            checked: true,
            valid: false,
            error: 'Disposable, temporary, or high-risk email addresses are strictly prohibited.',
          }
        }
        if (data.status === 'do_not_mail') {
          return {
            checked: true,
            valid: false,
            error: 'This email address cannot receive mail. Please use an active, deliverable email.',
          }
        }
        return { checked: true, valid: true }
      }
    } catch (err) {
      console.warn('[EmailValidator] ZeroBounce API check warning:', err.message)
    }
  }

  return { checked: false }
}

/**
 * Validates whether an email is a genuine, active, deliverable real-world email address.
 * @param {string} email
 * @returns {Promise<{ valid: boolean, error?: string, normalizedEmail: string, domain: string }>}
 */
async function validateRealEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required.' }
  }

  const normalized = email.toLowerCase().trim()

  // 1. Standard RFC 5322 regex validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRegex.test(normalized)) {
    return { valid: false, error: 'Please provide a valid email address format.' }
  }

  const parts = normalized.split('@')
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid email address structure.' }
  }

  const [localPart, domain] = parts

  if (!localPart || localPart.length > 64) {
    return { valid: false, error: 'Email username is invalid or too long.' }
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { valid: false, error: 'Email username contains invalid punctuation.' }
  }

  // 2. Check for dummy / placeholder handles
  const isDummy =
    DUMMY_LOCAL_PARTS.has(localPart.toLowerCase()) ||
    /^(test|fake|dummy|temp|sample|example|asdf|qwerty|zxcv|user\d+|prajju123)/i.test(localPart)

  if (isDummy) {
    return {
      valid: false,
      error: `"${localPart}" appears to be a placeholder or test handle. Please use your genuine, active personal or work email address.`,
    }
  }

  if (!domain || domain.length > 255 || !domain.includes('.')) {
    return { valid: false, error: 'Email domain is invalid.' }
  }

  // 3. Check for common domain typos with instant correction
  if (COMMON_TYPO_DOMAINS[domain]) {
    return {
      valid: false,
      error: `The email domain "${domain}" is not a valid mail host. Did you mean "@${COMMON_TYPO_DOMAINS[domain]}"?`,
    }
  }

  // 4. Check against disposable / temporary domain blocklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: 'Temporary, disposable, or fake email addresses are not permitted. Please use a real email account.',
    }
  }

  // 5. Check for dummy test top-level domains
  if (
    domain.endsWith('.invalid') ||
    domain.endsWith('.test') ||
    domain.endsWith('.example') ||
    domain.endsWith('.localhost') ||
    domain.endsWith('.local')
  ) {
    return { valid: false, error: 'Test and placeholder email domains do not exist in real life.' }
  }

  // 6. External Verification API Check (Abstract API / Hunter.io / ZeroBounce)
  const apiCheck = await checkExternalVerificationApi(normalized)
  if (apiCheck.checked && !apiCheck.valid) {
    return { valid: false, error: apiCheck.error }
  }

  // 7. Live DNS MX (Mail Exchange) verification: verifies that the domain has active mail servers in real life
  try {
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS lookup timeout')), 2500)),
    ])

    if (!mxRecords || mxRecords.length === 0) {
      return {
        valid: false,
        error: `The domain "${domain}" does not exist in real life or has no active mail servers. Please enter a real email.`,
      }
    }
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'ESERVFAIL') {
      return {
        valid: false,
        error: `The domain "${domain}" does not exist in real life. Please use a real email address.`,
      }
    }
    console.warn(`[EmailValidator] MX check warning for ${domain}:`, err.message)
  }

  return { valid: true, normalizedEmail: normalized, domain }
}

module.exports = {
  validateRealEmail,
  checkExternalVerificationApi,
  DISPOSABLE_DOMAINS,
  COMMON_TYPO_DOMAINS,
  DUMMY_LOCAL_PARTS,
}
