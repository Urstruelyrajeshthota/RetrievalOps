# GitHub Actions Workflows

Automated testing, building, publishing, and security checks for RetrievalOps.

---

## Workflows

### 1. Test & Build (test.yml)

**Triggers**: Push to main/develop, Pull Requests

**What it does**:
- Lint code (ESLint)
- Type check (TypeScript strict)
- Run tests (Vitest)
- Build packages (Turbo)
- Upload coverage to Codecov

**Matrix**: Tests on Node 18.x and 20.x

**Status Badge**:
```markdown
![Tests](https://github.com/Urstruelyrajeshthota/RetrievalOps/actions/workflows/test.yml/badge.svg)
```

---

### 2. Publish to npm (publish.yml)

**Triggers**: GitHub Release published

**What it does**:
- Checks out code
- Runs all tests
- Builds packages
- Publishes all 7 packages to npm with `--access public`
- Posts success comment

**Requirements**:
- GitHub Secret: `NPM_TOKEN` (read-only)
- Create release on GitHub to trigger

**How to publish**:
```bash
# Locally, create release
git tag v0.2.0
git push origin v0.2.0

# Or via GitHub UI:
# 1. Go to Releases
# 2. Create new release
# 3. Tag version: v0.2.0
# 4. Title: "RetrievalOps v0.2.0"
# 5. Publish release
```

---

### 3. Security & Dependabot (security.yml)

**Triggers**: 
- Weekly schedule (Sundays 2am UTC)
- Push to main/develop
- Pull requests to main

**What it does**:
- Runs `npm audit`
- Optional Snyk security scan

**Requirements**:
- GitHub Secret: `SNYK_TOKEN` (optional, for Snyk)

---

### 4. Performance Benchmark (benchmark.yml)

**Triggers**:
- Push to main (packages changed)
- Manual workflow dispatch

**What it does**:
- Starts PostgreSQL container
- Builds packages
- Runs benchmarks
- Stores results
- Auto-pushes results to repo

**Requirements**:
- benchmarks/ directory with test files
- benchmark-results.json output

---

## Setup Instructions

### 1. Add NPM_TOKEN Secret

For npm publishing:

1. Generate token locally:
   ```bash
   npm token create --read-only
   ```

2. Add to GitHub:
   - Go to repo Settings
   - Secrets and variables → Actions
   - New secret: `NPM_TOKEN`
   - Paste token
   - Save

### 2. Add SNYK_TOKEN (Optional)

For Snyk security scanning:

1. Create account at https://snyk.io
2. Generate token in settings
3. Add to GitHub Secrets: `SNYK_TOKEN`

### 3. Configure Codecov (Optional)

For coverage reports:

1. Go to https://codecov.io
2. Connect GitHub account
3. Enable for repository
4. Codecov will auto-detect uploads

---

## Running Locally

### Test Workflow

```bash
npm install
npm run lint
npm run type-check
npm run test
npm run build
```

### Benchmark Workflow

```bash
# Start PostgreSQL locally
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=testpass pgvector/pgvector:pg15

# Run benchmarks
npm run bench

# See results
cat benchmark-results.json
```

---

## Debugging Workflows

### View Workflow Runs

1. Go to GitHub repo
2. Click "Actions" tab
3. Select workflow (e.g., "Test & Build")
4. Click run to see logs

### Common Issues

**Test fails on CI but passes locally**:
- Check Node version (CI uses 18.x, 20.x)
- Check environment variables (DATABASE_URL, etc)
- Check dependencies (npm ci vs npm install)

**Publish fails**:
- Check NPM_TOKEN is valid
- Check 2FA on npm account
- Verify packages build locally first

**Security scan fails**:
- Run `npm audit` locally
- Fix vulnerabilities or `npm audit fix`
- Commit and push

---

## Status Badges

Add to README.md:

```markdown
## CI/CD Status

[![Tests](https://github.com/Urstruelyrajeshthota/RetrievalOps/actions/workflows/test.yml/badge.svg)](https://github.com/Urstruelyrajeshthota/RetrievalOps/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/@retrievalops/core.svg)](https://www.npmjs.com/package/@retrievalops/core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
```

---

## Environment Variables

### For CI/CD

Set in GitHub Secrets (Settings → Secrets):
- `NPM_TOKEN` — For npm publishing
- `SNYK_TOKEN` — For Snyk scanning (optional)
- `DATABASE_URL` — For integration tests (optional)

### For Local Testing

Create `.env.local`:
```
DATABASE_URL=postgresql://postgres:testpass@localhost:5432/retrievalops_test
QDRANT_URL=http://localhost:6333
```

---

## Future Enhancements

### Coming Soon

- [ ] Docker image building and pushing
- [ ] Performance regression detection
- [ ] Automated PR comments on test results
- [ ] FOSSA license scanning
- [ ] CodeQL security analysis

---

## Support

**Questions?**
- See GitHub Actions docs: https://docs.github.com/en/actions
- Check workflow logs: GitHub → Actions → Workflow → Run
- Open issue on GitHub

---

**Workflows active and monitoring!** ✅
