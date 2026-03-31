const { google } = require('googleapis');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Check if email domain is allowed
 */
const isAllowedDomain = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { allowed: false, type: null, requiresSSO: false };

  // Organization domain (Google Workspace)
  if (domain === process.env.ORGANIZATION_DOMAIN) {
    return { allowed: true, type: 'organization', requiresSSO: true };
  }

  // Educational institution domains
  const eduPatterns = [
    /\.edu$/i,
    /\.k12\.[a-z]{2,3}$/i, // e.g., .k12.ca.us
    /\.school$/i,
    /\.ac\.[a-z]{2,3}$/i, // e.g., .ac.uk
  ];
  
  const isEduDomain = eduPatterns.some(pattern => pattern.test(domain));
  if (isEduDomain) {
    return { allowed: true, type: 'educational', requiresSSO: false };
  }

  // Personal emails (Gmail, Yahoo, etc.) - allowed for students/parents
  const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com'];
  if (personalDomains.includes(domain)) {
    return { allowed: true, type: 'personal', requiresSSO: false };
  }

  // Default: allow but log for review
  return { allowed: true, type: 'other', requiresSSO: false };
};

/**
 * Determine user role based on email and context
 */
const determineRoleFromEmail = (email, domainInfo) => {
  const emailPrefix = email.split('@')[0].toLowerCase();
  
  // Organization members
  if (domainInfo.type === 'organization') {
    // Check for super admin keywords first
    if (emailPrefix.includes('super') || emailPrefix.includes('founder') || emailPrefix.includes('ceo') || emailPrefix.includes('owner')) {
      return 'super_admin';
    }
    if (emailPrefix.includes('admin') || emailPrefix.includes('manager')) {
      return 'admin';
    }
    if (emailPrefix.includes('tutor') || emailPrefix.includes('teacher')) {
      return 'tutor';
    }
    // Default org members to tutor (can be changed by admin)
    return 'tutor';
  }

  // Educational and personal emails default to student
  // Parents can be created separately or during signup
  return 'student';
};

/**
 * Generate Google OAuth URL
 * For organization members, restrict to domain
 * For others, allow any Google account
 */
const getGoogleAuthUrl = (req, res) => {
  const { userType } = req.query; // 'organization' or 'student'
  
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const authOptions = {
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  };

  // Only restrict domain for organization members
  if (userType === 'organization' && process.env.ORGANIZATION_DOMAIN) {
    authOptions.hd = process.env.ORGANIZATION_DOMAIN;
  }

  const url = oauth2Client.generateAuthUrl(authOptions);
  res.json({ url });
};

/**
 * Handle Google OAuth callback
 */
const handleGoogleCallback = async (req, res) => {
  try {
    const { code, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      console.error('[handleGoogleCallback] OAuth error:', oauthError);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=oauth_denied`);
    }

    if (!code) {
      console.error('[handleGoogleCallback] No authorization code provided');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=no_code`);
    }

    console.log('[handleGoogleCallback] Received authorization code, exchanging for tokens...');

    // Exchange code for tokens
    let tokens;
    try {
      const tokenResponse = await oauth2Client.getToken(code);
      tokens = tokenResponse.tokens;
      oauth2Client.setCredentials(tokens);
      console.log('[handleGoogleCallback] Successfully obtained tokens');
    } catch (tokenError) {
      console.error('[handleGoogleCallback] Token exchange error:', tokenError);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=token_exchange_failed`);
    }

    // Get user info from Google
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });

    let googleUser;
    try {
      const userResponse = await oauth2.userinfo.get();
      googleUser = userResponse.data;
      console.log('[handleGoogleCallback] Retrieved user info:', googleUser.email);
    } catch (userError) {
      console.error('[handleGoogleCallback] Error getting user info:', userError);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=user_info_failed`);
    }

    if (!googleUser || !googleUser.email) {
      console.error('[handleGoogleCallback] No email in Google user data');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=no_email`);
    }

    // Check domain restrictions
    const domainInfo = isAllowedDomain(googleUser.email);
    console.log('[handleGoogleCallback] Domain info:', domainInfo);
    
    if (!domainInfo.allowed) {
      console.error('[handleGoogleCallback] Domain not allowed:', googleUser.email);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=domain_not_allowed`);
    }

    // Check if user exists
    let user = await User.findOne({ email: googleUser.email.toLowerCase() });
    console.log('[handleGoogleCallback] User lookup result:', user ? 'Found existing user' : 'New user');

    if (!user) {
      // Auto-create user
      const role = determineRoleFromEmail(googleUser.email, domainInfo);
      console.log('[handleGoogleCallback] Creating new user with role:', role);
      
      user = new User({
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email.toLowerCase(),
        password: await bcrypt.hash(Math.random().toString(36) + Date.now(), 10),
        role: role,
        avatar: googleUser.picture,
        domainType: domainInfo.type,
        authMethod: 'google'
      });

      // Set up tutor info if needed (for tutors and super_admin)
      if (role === 'tutor' || role === 'super_admin') {
        user.tutorInfo = {
          status: domainInfo.type === 'organization' ? 'active' : 'pending',
          subjects: []
        };
        // Super admin starts with tutor availability disabled by default
        if (role === 'super_admin') {
          user.availableAsTutor = false;
        }
      }

      await user.save();
      console.log('[handleGoogleCallback] New user created:', user.email);
    } else {
      // Update existing user info from Google
      console.log('[handleGoogleCallback] Updating existing user:', user.email);
      if (googleUser.picture) user.avatar = googleUser.picture;
      if (googleUser.name) user.name = googleUser.name;
      if (!user.domainType) user.domainType = domainInfo.type;
      // Allow linking Google auth to existing password accounts
      if (!user.authMethod || user.authMethod === 'password') {
        user.authMethod = 'google';
        console.log('[handleGoogleCallback] Linked Google auth to existing account');
      }
      // Ensure super_admin has tutorInfo if they don't have it
      if (user.role === 'super_admin' && !user.tutorInfo) {
        user.tutorInfo = {
          status: 'active',
          subjects: []
        };
      }
      await user.save();
      console.log('[handleGoogleCallback] User updated successfully');
    }

    // Generate JWT token
    const payload = {
      user: { id: user.id, role: user.role }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    console.log('[handleGoogleCallback] JWT token generated, redirecting to frontend...');

    // Redirect to frontend with token
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/callback?token=${token}&email=${encodeURIComponent(user.email)}`);
  } catch (error) {
    console.error('[handleGoogleCallback] Unexpected error:', error);
    console.error('[handleGoogleCallback] Error stack:', error.stack);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?error=google_auth_failed&details=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Sync users from Google Workspace (Admin only)
 * This requires service account setup
 */
const syncWorkspaceUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // This would require service account credentials
    // For now, return instructions
    res.json({ 
      message: 'Workspace user sync requires service account setup',
      instructions: [
        '1. Create a service account in Google Cloud Console',
        '2. Enable Domain-Wide Delegation',
        '3. Grant necessary scopes in Google Workspace Admin',
        '4. Download service account JSON key',
        '5. Store key securely and configure in environment variables'
      ]
    });
  } catch (error) {
    console.error('Workspace sync error:', error);
    res.status(500).json({ message: 'Sync failed' });
  }
};

module.exports = {
  getGoogleAuthUrl,
  handleGoogleCallback,
  syncWorkspaceUsers,
  isAllowedDomain
};

