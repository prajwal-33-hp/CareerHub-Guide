const crypto = require('crypto')

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

/**
 * Generates an HMAC-signed state parameter to prevent CSRF attacks.
 * Encodes the desired user role, a random cryptographic nonce, and a creation timestamp.
 */
function createSignedState(role = 'student', clientUrl = null) {
  const secret = process.env.JWT_SECRET || 'careerhub_oauth_secret'
  const safeRole = ['student', 'recruiter'].includes(role) ? role : 'student'

  const statePayload = {
    role: safeRole,
    clientUrl: clientUrl || process.env.CLIENT_URL || 'http://localhost:5174',
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Date.now(),
  }

  const payloadString = Buffer.from(JSON.stringify(statePayload)).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('base64url')

  return `${payloadString}.${signature}`
}

/**
 * Validates and decodes the HMAC-signed state parameter.
 * Rejects tampered states and states older than 10 minutes.
 */
function verifySignedState(state) {
  if (!state || typeof state !== 'string' || !state.includes('.')) {
    return null
  }

  const [payloadString, providedSig] = state.split('.')
  const secret = process.env.JWT_SECRET || 'careerhub_oauth_secret'
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadString).digest('base64url')

  // Timing-safe comparison to mitigate timing attacks
  const providedBuf = Buffer.from(providedSig)
  const expectedBuf = Buffer.from(expectedSig)
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadString, 'base64url').toString('utf8'))
    const MAX_AGE_MS = 10 * 60 * 1000 // 10 minutes
    if (Date.now() - payload.iat > MAX_AGE_MS) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

/**
 * Builds the official Google OAuth 2.0 redirect URL.
 */
function getGoogleAuthUrl(role = 'student', clientUrl = null) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in backend environment.')
  }

  const state = createSignedState(role, clientUrl)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  })

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
}

/**
 * Exchanges Google OAuth 2.0 authorization code for tokens.
 */
async function exchangeCodeForTokens(code) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET) are missing.')
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  })

  const data = await response.json()
  if (!response.ok) {
    const errorDescription = data.error_description || data.error || 'Failed to exchange authorization code'
    throw new Error(`Google Token Exchange Error: ${errorDescription}`)
  }

  return data
}

/**
 * Fetches the authenticated user profile from Google's official userinfo endpoint.
 */
async function getGoogleUserInfo(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || 'Failed to retrieve user profile from Google.')
  }

  if (!data.email) {
    throw new Error('Google account did not return an email address.')
  }

  return {
    googleId: data.sub,
    email: data.email.toLowerCase().trim(),
    name: data.name || data.email.split('@')[0],
    picture: data.picture || '',
    emailVerified: data.email_verified,
  }
}

module.exports = {
  createSignedState,
  verifySignedState,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
}
