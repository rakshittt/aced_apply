# OAuth Setup Guide

## Quick Setup (5 minutes)

### Option 1: Google OAuth (Recommended)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Sign in with your Google account

2. **Create a New Project** (if needed)
   - Click "Select a project" → "New Project"
   - Name it "Aced Apply" → Create

3. **Configure OAuth Consent Screen**
   - Go to "OAuth consent screen"
   - Choose "External" → Create
   - Fill in:
     - App name: "Aced Apply"
     - User support email: your email
     - Developer contact: your email
   - Save and Continue (skip scopes)

4. **Create OAuth Credentials**
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Aced Apply Web"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Click "Create"

5. **Copy Credentials to .env**
   ```env
   GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-secret-here"
   ```

6. **Restart your dev server**
   ```bash
   # Press Ctrl+C to stop
   npm run dev
   ```

### Option 2: GitHub OAuth

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/developers
   - Click "New OAuth App"

2. **Fill in Details**
   - Application name: "Aced Apply"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
   - Click "Register application"

3. **Copy Credentials**
   - Copy the Client ID
   - Generate a new client secret
   - Add to .env:
   ```env
   GITHUB_ID="your-github-client-id"
   GITHUB_SECRET="your-github-secret"
   ```

4. **Restart your dev server**

---

## Testing

1. Navigate to `http://localhost:3000/auth/signin`
2. You should now see the "Continue with Google" (or GitHub) button
3. Click to test authentication
4. You'll be redirected to the OAuth provider
5. After approval, you'll be signed in and redirected to the dashboard

---

## Production Setup

Before deploying:

1. Add production URLs to OAuth settings:
   - Google: `https://yourdomain.com/api/auth/callback/google`
   - GitHub: `https://yourdomain.com/api/auth/callback/github`

2. Update `NEXTAUTH_URL` in production .env:
   ```env
   NEXTAUTH_URL="https://yourdomain.com"
   ```

3. Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
