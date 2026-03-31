# Google Workspace Integration Setup

This document outlines the Google Workspace integration that has been implemented in the application.

## Overview

The application now supports multiple authentication methods:
- **Password-based authentication** (existing)
- **Google OAuth authentication** (new)
  - Organization members (`@startrighttutoring.com`) - Google Workspace SSO
  - Educational institution emails (`.edu`, `.k12.*`, etc.)
  - Personal emails (Gmail, Yahoo, Outlook, etc.)

## Environment Variables Required

Add these to your `.env` file in the `server/` directory:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_from_google_cloud_console
GOOGLE_CLIENT_SECRET=your_client_secret_from_google_cloud_console
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
ORGANIZATION_DOMAIN=startrighttutoring.com

# Application URLs
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3001

# For Production (update when deploying):
# CLIENT_URL=https://app.startrighttutoring.com
# SERVER_URL=https://api.startrighttutoring.com
# GOOGLE_REDIRECT_URI=https://api.startrighttutoring.com/api/auth/google/callback
```

## Google Cloud Console Setup

1. **OAuth 2.0 Client ID**: You've already created `OpSRTClient` in Google Cloud Console
2. **Authorized Redirect URIs**: Make sure to add:
   - `http://localhost:3001/api/auth/google/callback` (development)
   - `https://api.startrighttutoring.com/api/auth/google/callback` (production)

3. **APIs to Enable** (if not already enabled):
   - Google Identity Services API
   - People API (optional, for additional profile data)

## Features Implemented

### Backend

1. **Google Auth Controller** (`server/controllers/googleAuthController.js`)
   - Multi-domain support (organization, educational, personal)
   - Automatic user creation on first Google login
   - Role determination based on email domain
   - Domain verification and restrictions

2. **Google Auth Routes** (`server/routes/googleAuthRoutes.js`)
   - `GET /api/auth/google/url?userType=organization|student` - Get OAuth URL
   - `GET /api/auth/google/callback` - Handle OAuth callback
   - `POST /api/auth/google/sync` - Sync Workspace users (admin only, requires service account)

3. **User Model Updates** (`server/models/User.js`)
   - Added `domainType` field (organization, educational, personal, other)
   - Added `authMethod` field (password, google, sso)
   - Password field now optional for Google OAuth users

4. **Auth Controller Updates** (`server/controllers/authController.js`)
   - Prevents password login for Google auth users
   - Provides helpful error messages

### Frontend

1. **Google Auth API** (`client/src/api/googleAuth.js`)
   - `getGoogleAuthUrl(userType)` - Get OAuth URL
   - `handleGoogleCallback(token, email)` - Process callback

2. **Login Pages Updated**
   - **LoginPage** (`client/src/pages/LoginPage.jsx`): Added "Sign in with Google" button
   - **EmployeeLoginPage** (`client/src/pages/EmployeeLoginPage.jsx`): Added "Sign in with Google Workspace" button

3. **Auth Callback Page** (`client/src/pages/AuthCallback.jsx`)
   - Handles OAuth redirects
   - Validates user roles and redirects appropriately
   - Shows loading and error states

4. **App Routing** (`client/src/App.jsx`)
   - Added `/auth/callback` route

## Authentication Flow

### For Students/Parents:
1. User clicks "Sign in with Google" on login page
2. Redirected to Google OAuth (any Google account allowed)
3. After authentication, user is created/updated in database
4. JWT token generated and user redirected to dashboard

### For Organization Members (Employees):
1. User clicks "Sign in with Google Workspace" on employee login page
2. Redirected to Google OAuth (restricted to `@startrighttutoring.com`)
3. After authentication, user is created/updated with appropriate role
4. Organization members default to 'tutor' role (can be changed by admin)
5. JWT token generated and user redirected to dashboard

## Domain Types

The system automatically categorizes email domains:

- **Organization**: `@startrighttutoring.com` - Requires Google Workspace SSO
- **Educational**: `.edu`, `.k12.*`, `.school`, `.ac.*` - Allowed for students
- **Personal**: Gmail, Yahoo, Outlook, Hotmail, iCloud, AOL, ProtonMail - Allowed for students/parents
- **Other**: Any other domain - Allowed but logged for review

## Role Assignment

- **Organization emails**: Default to 'tutor' role (can be changed by admin)
- **Educational/Personal emails**: Default to 'student' role
- **Role can be changed**: By admin after user creation

## Security Features

1. **Domain Verification**: Organization logins restricted to `@startrighttutoring.com`
2. **Password Protection**: Google auth users cannot use password login
3. **Role Validation**: Users redirected to appropriate portal based on role
4. **JWT Tokens**: Same secure token system for all authentication methods

## Testing

### Test Organization Login:
1. Use an email ending with `@startrighttutoring.com`
2. Go to `/employee-login`
3. Click "Sign in with Google Workspace"
4. Should be restricted to your domain

### Test Student Login:
1. Use any Google account (Gmail, educational, etc.)
2. Go to `/login`
3. Click "Sign in with Google"
4. Should work with any Google account

## Next Steps (Optional Enhancements)

1. **Service Account Setup**: For automated user sync from Google Workspace
   - Create service account in Google Cloud Console
   - Enable Domain-Wide Delegation
   - Grant scopes in Google Workspace Admin
   - Implement user sync endpoint

2. **Email Verification**: Add email verification for non-organization users

3. **Allowed Domains Management**: Create admin interface to manage allowed educational domains

4. **Google Calendar Integration**: Sync with Google Calendar for scheduling

5. **Google Drive Integration**: Access Google Drive resources

## Troubleshooting

### "Failed to initiate Google login"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Verify redirect URI matches in Google Cloud Console

### "This email domain is not allowed"
- Check domain categorization in `googleAuthController.js`
- Verify `ORGANIZATION_DOMAIN` is set correctly

### "This account uses Google authentication"
- User was created via Google OAuth
- They must use Google login, not password login

### Redirect URI mismatch
- Ensure redirect URI in `.env` matches exactly with Google Cloud Console
- Include protocol (http/https) and port number

## Files Modified/Created

### Created:
- `server/controllers/googleAuthController.js`
- `server/routes/googleAuthRoutes.js`
- `client/src/api/googleAuth.js`
- `client/src/pages/AuthCallback.jsx`

### Modified:
- `server/models/User.js` - Added domainType and authMethod fields
- `server/controllers/authController.js` - Added Google auth user checks
- `server/server.js` - Added Google auth routes
- `client/src/pages/LoginPage.jsx` - Added Google login button
- `client/src/pages/EmployeeLoginPage.jsx` - Added Google Workspace login button
- `client/src/App.jsx` - Added auth callback route

### Dependencies Added:
- `googleapis` (server)







