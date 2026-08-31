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

// Common placeholder / dummy local parts that do not represent genuine users
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
  '123456',
  'nobody',
  'null',
  'undefined',
  'invalid',
  'sample',
  'example',
])

// Comprehensive list of known disposable, temporary, and fake email providers
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

// Trusted standard public email providers
const TRUSTED_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'zoho.in',
  'aol.com',
  'gmx.com',
  'mail.com',
  'yandex.com',
  'rediffmail.com',
])

/**
 * Validates whether an email is a genuine, deliverable address.
 * @param {string} email
 * @returns {Promise<{ valid: boolean, error?: string, normalizedEmail: string, domain: string }>}
 */
async function validateRealEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required.' }
  }

  const normalized = email.toLowerCase().trim()

  // Standard RFC 5322 regex validation
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

  if (DUMMY_LOCAL_PARTS.has(localPart.toLowerCase())) {
    return {
      valid: false,
      error: `"${localPart}" appears to be a placeholder or test email prefix. Please use a real active email account.`,
    }
  }

  if (!domain || domain.length > 255 || !domain.includes('.')) {
    return { valid: false, error: 'Email domain is invalid.' }
  }

  // 1. Check for common domain typos
  if (COMMON_TYPO_DOMAINS[domain]) {
    return {
      valid: false,
      error: `The email domain "${domain}" is not a valid mail host. Did you mean "@${COMMON_TYPO_DOMAINS[domain]}"?`,
    }
  }

  // 2. Check against disposable / fake domain blocklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: 'Temporary, disposable, or fake email addresses are not permitted. Please use a real email account.',
    }
  }

  // 3. Check for obvious dummy patterns
  if (
    domain.endsWith('.invalid') ||
    domain.endsWith('.test') ||
    domain.endsWith('.example') ||
    domain.endsWith('.localhost') ||
    domain.endsWith('.local')
  ) {
    return { valid: false, error: 'Test and placeholder email domains do not exist in real life.' }
  }

  // 4. Provider-specific strict validation rules for trusted mail hosts
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Gmail usernames must be between 3 and 30 characters
    if (localPart.length < 3 || localPart.length > 30) {
      return {
        valid: false,
        error: 'Gmail addresses must be between 3 and 30 characters in length.',
      }
    }
    // Only letters (a-z), numbers (0-9), and periods (.) allowed in Gmail usernames
    if (!/^[a-z0-9.]+$/i.test(localPart)) {
      return {
        valid: false,
        error: 'Gmail usernames can only contain letters, numbers, and periods.',
      }
    }
    return { valid: true, normalizedEmail: normalized, domain }
  }

  if (domain === 'yahoo.com' || domain === 'yahoo.co.in' || domain === 'yahoo.co.uk') {
    if (localPart.length < 3 || localPart.length > 32) {
      return {
        valid: false,
        error: 'Yahoo email usernames must be between 3 and 32 characters in length.',
      }
    }
    return { valid: true, normalizedEmail: normalized, domain }
  }

  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'msn.com') {
    if (localPart.length < 3 || localPart.length > 30) {
      return {
        valid: false,
        error: 'Microsoft email usernames must be between 3 and 30 characters in length.',
      }
    }
    return { valid: true, normalizedEmail: normalized, domain }
  }

  if (TRUSTED_DOMAINS.has(domain)) {
    if (localPart.length < 3) {
      return { valid: false, error: 'This email username is too short to be a valid account.' }
    }
    return { valid: true, normalizedEmail: normalized, domain }
  }

  // 5. For custom/corporate domains, verify DNS MX (Mail Exchange) records exist
  try {
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS lookup timeout')), 2500)),
    ])

    if (!mxRecords || mxRecords.length === 0) {
      return {
        valid: false,
        error: `The domain "${domain}" does not exist or has no active mail servers. Please enter a real email.`,
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
  DISPOSABLE_DOMAINS,
  TRUSTED_DOMAINS,
  COMMON_TYPO_DOMAINS,
  DUMMY_LOCAL_PARTS,
}
