# Publishing RetrievalOps to npm

Complete guide for publishing RetrievalOps packages to npm registry.

---

## Prerequisites

1. **npm Account**
   - Sign up at https://www.npmjs.com/signup
   - Verify email
   - Enable 2FA (recommended)

2. **Node.js 18+**
   - Installed and working
   - npm CLI available

3. **Git**
   - All changes committed
   - Remote configured

---

## Step 1: Local npm Login

```bash
npm login
```

When prompted:
- **Username**: Your npm username
- **Password**: Your npm password
- **Email**: Your email registered with npm
- **OTP** (if 2FA enabled): One-time password from authenticator

Verify login:
```bash
npm whoami
# Should return your username
```

---

## Step 2: Verify Package Information

### Check package.json files

All packages should have:
- `name` field (scoped, e.g., `@retrievalops/core`)
- `version` field (matching v0.1.0)
- `description`
- `license` (Apache-2.0)
- `repository` (pointing to GitHub)
- `homepage`

```bash
# Check specific package
cat packages/core/package.json | grep -E '"name"|"version"|"license"'
```

### Verify all 7 packages

```
✅ packages/contracts/package.json
✅ packages/core/package.json
✅ packages/adapters/pgvector/package.json
✅ packages/embeddings/local/package.json
✅ packages/cli/package.json
✅ packages/types/package.json
✅ packages/utils/package.json
✅ examples/jira-pgvector/package.json (private: true)
```

---

## Step 3: Publish to npm

### Option A: Publish All Packages (Recommended)

```bash
npm publish --workspaces --access public
```

This publishes all packages in dependency order automatically.

### Option B: Publish Individual Packages

```bash
# In correct order (dependencies first)
cd packages/contracts && npm publish --access public
cd ../core && npm publish --access public
cd ../adapters/pgvector && npm publish --access public
cd ../embeddings/local && npm publish --access public
cd ../cli && npm publish --access public
cd ../types && npm publish --access public
cd ../utils && npm publish --access public
```

### Option C: Use GitHub Actions (Automated)

1. Create GitHub release: v0.1.0
2. Add npm token to secrets (below)
3. Workflow publishes automatically

---

## Step 4: Add GitHub Secrets (for CI/CD)

### Generate npm Token

```bash
npm token create --read-only
# Copy the token
```

Or via web:
1. Go to https://www.npmjs.com/settings/~/tokens
2. Create new token (read-only for security)
3. Copy token

### Add to GitHub

1. Go to your repository settings
2. Secrets and variables → Actions
3. Create new secret: `NPM_TOKEN`
4. Paste token value
5. Save

Now GitHub Actions can publish automatically.

---

## Step 5: Verify Publication

### Check npm Registry

```bash
npm view @retrievalops/core
npm view @retrievalops/pgvector
npm view @retrievalops/local
# etc for all packages
```

Or browse:
- https://www.npmjs.com/package/@retrievalops/core
- https://www.npmjs.com/package/@retrievalops/pgvector
- https://www.npmjs.com/package/@retrievalops/local

### Test Installation

```bash
mkdir test-install && cd test-install
npm init -y
npm install @retrievalops/core @retrievalops/pgvector @retrievalops/local
```

Verify imports work:
```bash
node -e "const ro = require('@retrievalops/core'); console.log('✓ Loaded successfully')"
```

---

## Step 6: Update Documentation

### Update README

Add npm installation section:

```markdown
## Installation

```bash
npm install @retrievalops/core @retrievalops/pgvector @retrievalops/local
```

Or individual packages:

```bash
npm install @retrievalops/core       # Core SDK
npm install @retrievalops/pgvector   # PostgreSQL adapter
npm install @retrievalops/local      # Local embeddings
```

---

### Update Getting Started

Show npm-based setup:

```typescript
import { RetrievalOps, defineEntity } from "@retrievalops/core";
import { PgVectorAdapter } from "@retrievalops/pgvector";
import { LocalEmbeddingProvider } from "@retrievalops/local";

// Now available from npm!
```

---

## Step 7: Create Release Notes

After publishing, create GitHub release:

1. Go to GitHub releases
2. Create new release: v0.1.0
3. Title: "RetrievalOps v0.1.0 - Production Ready"
4. Description: Use release notes from earlier
5. Publish release

This triggers GitHub Actions to publish to npm automatically (if set up).

---

## Maintenance: Future Releases

### For v0.2.0+

1. Update versions in all package.json files
   ```bash
   npm version minor --workspaces
   ```

2. Commit changes
   ```bash
   git add .
   git commit -m "chore: bump version to v0.2.0"
   git push origin main
   ```

3. Create GitHub release
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. GitHub Actions publishes automatically

---

## Troubleshooting

### "npm ERR! code E403"
**Problem**: Permission denied  
**Solution**: 
- Check npm login: `npm whoami`
- Verify npm token in GitHub Secrets
- Check 2FA if enabled

### "npm ERR! code E404"
**Problem**: Package not found  
**Solution**:
- Verify package name is correct and scoped
- Check all dependencies published first

### "npm ERR! need auth"
**Problem**: Not logged in  
**Solution**:
```bash
npm login
npm whoami  # Verify
```

### "npm WARN"
**Problem**: Warnings about package.json  
**Solution**:
- Add missing fields (description, repository, license)
- Check package.json format is valid

---

## Security Best Practices

1. **Use 2FA on npm account**
   - Protects against unauthorized publishes

2. **Use read-only tokens in CI/CD**
   - GitHub Actions don't need full access

3. **Keep npm token secret**
   - Never commit .npmrc with token
   - Use GitHub Secrets for CI/CD

4. **Review package contents before publish**
   ```bash
   npm pack
   tar tzf *.tgz | head -20
   ```

---

## What Gets Published

Each package publishes:
- Source TypeScript files (src/)
- Compiled JavaScript (dist/)
- Type definitions (.d.ts)
- README and license
- package.json metadata

Excluded:
- tests/
- .github/
- node_modules/
- .git/

---

## Post-Publication Checklist

- [ ] All 7 packages on npm
- [ ] Installation works locally
- [ ] GitHub Secrets configured (NPM_TOKEN)
- [ ] README updated
- [ ] Getting Started updated
- [ ] GitHub release created
- [ ] Release notes published
- [ ] Community notified (Twitter, HN, etc)

---

## Support

**Questions?**
- Check npm docs: https://docs.npmjs.com
- View GitHub releases: https://github.com/Urstruelyrajeshthota/RetrievalOps/releases
- Open issue on GitHub

---

**Ready to publish?** Follow the steps above! 🚀
