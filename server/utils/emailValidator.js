const dns = require('dns').promises

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

// Trusted standard public email providers (skip DNS check for maximum speed)
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
 * Validates whether an email is a genuine, non-disposable, deliverable address.
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

  if (!domain || domain.length > 255 || !domain.includes('.')) {
    return { valid: false, error: 'Email domain is invalid.' }
  }

  // 1. Check against disposable / fake domain blocklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: 'Temporary, disposable, or fake email addresses are not permitted. Please use a real email account.',
    }
  }

  // 2. Check for obvious dummy patterns
  if (
    domain.endsWith('.invalid') ||
    domain.endsWith('.test') ||
    domain.endsWith('.example') ||
    domain.endsWith('.localhost') ||
    domain.endsWith('.local')
  ) {
    return { valid: false, error: 'Test and placeholder domains are not allowed.' }
  }

  // 3. If it's a known trusted provider, instantly pass
  if (TRUSTED_DOMAINS.has(domain)) {
    return { valid: true, normalizedEmail: normalized, domain }
  }

  // 4. For custom/corporate domains, verify DNS MX (Mail Exchange) records exist
  try {
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS lookup timeout')), 2500)),
    ])

    if (!mxRecords || mxRecords.length === 0) {
      return {
        valid: false,
        error: `The domain "${domain}" has no active mail servers configured to receive emails. Please provide a real email.`,
      }
    }
  } catch (err) {
    // If ENOTFOUND or ENODATA, domain cannot receive mail
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return {
        valid: false,
        error: `The email domain "${domain}" does not exist or cannot receive mail. Please use a real email address.`,
      }
    }
    // If network timeout in dev, log warning but allow graceful degradation
    console.warn(`[EmailValidator] MX check warning for ${domain}:`, err.message)
  }

  return { valid: true, normalizedEmail: normalized, domain }
}

module.exports = {
  validateRealEmail,
  DISPOSABLE_DOMAINS,
  TRUSTED_DOMAINS,
}
