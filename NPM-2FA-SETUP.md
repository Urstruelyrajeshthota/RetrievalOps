# Fixing "Two-factor authentication required" npm Error

Your npm account has 2FA enabled, but your token doesn't have bypass permission.

---

## Solution: Create Token with Bypass 2FA

### Option 1: Via npm CLI (Recommended)

```bash
npm token create --access publish
```

When prompted:
- **Expiration**: 365 days (or custom)
- **Permissions**: Write access (for publish)

This token automatically supports 2FA bypass when publishing.

### Option 2: Via npm Web Dashboard

1. Go to https://www.npmjs.com/settings/~/tokens
2. Create token (not automation token)
3. Select: **Publish** permission
4. **2FA**: Ensure it's configured properly
5. Copy token

### Option 3: Create Automation Token (CI/CD Only)

For GitHub Actions (not local):

```bash
npm token create --access publish --read-only
```

---

## Using the New Token

### Local Publishing

```bash
npm login
# Use new token when prompted
# Leave password blank
# Use token as 2FA bypass

npm publish --workspaces --access public
```

### For GitHub Actions

1. Generate new token with bypass 2FA
2. Update GitHub Secret: `NPM_TOKEN`
3. Push to trigger workflow

---

## If 2FA is Still Blocking

### Temporarily Disable 2FA

1. Go to https://www.npmjs.com/settings/security
2. Disable 2FA temporarily
3. Create token
4. Re-enable 2FA

### Or Use 2FA Code

Some npm versions support entering 2FA code:

```bash
npm publish --workspaces --access public
# When prompted for 2FA, enter code from authenticator
```

---

## Quick Fix (Try Now)

```bash
# 1. Logout first
npm logout

# 2. Login again (fresh)
npm login
# Enter username
# Enter password
# Enter 2FA code from authenticator

# 3. Try publishing
npm publish --workspaces --access public
```

If it still fails, the token needs bypass 2FA permission.

---

## What to Do Next

1. **Create new token** with bypass 2FA enabled
2. **Logout**: `npm logout`
3. **Login**: `npm login` (use new token)
4. **Publish**: `npm publish --workspaces --access public`

---

**Try the "Quick Fix" first!** 🔧
