# v0.2.0 Shipping Checklist

**Status**: Ready to Ship  
**Date**: August 10, 2026  
**Version**: 0.2.0

## Pre-Ship Verification

- [x] All code merged to main
- [x] All tests passing
- [x] Documentation complete
- [x] Release notes written
- [x] Migration guide prepared
- [x] Examples verified working
- [x] Performance targets met
- [x] Backward compatibility verified
- [x] No security issues found
- [x] Git history clean

## Shipping Steps

### Step 1: Verify Git State

```bash
# Check all changes are committed
git status
# Should show: "nothing to commit, working tree clean"

# Verify main branch
git branch
# Should show: "* main"

# Check last commits
git log --oneline -5
# Should show recent Phase 2 commits
```

### Step 2: Update Package Versions

Update all package.json files to version 0.2.0:

```bash
# Core packages
packages/core/package.json        -> version: 0.2.0
packages/contracts/package.json   -> version: 0.2.0
packages/evaluator/package.json   -> version: 0.2.0
packages/observability/package.json -> version: 0.2.0
packages/cli/package.json         -> version: 0.2.0

# Adapters
packages/adapters/pgvector/package.json -> version: 0.2.0
packages/adapters/qdrant/package.json   -> version: 0.2.0

# Providers
packages/embeddings/local/package.json   -> version: 0.2.0
packages/embeddings/openai/package.json  -> version: 0.2.0
```

### Step 3: Create Release Commit

```bash
# Create release commit
git commit --allow-empty -m "chore: Release v0.2.0"

# Create git tag
git tag -a v0.2.0 -m "RetrievalOps v0.2.0 - Production Release

Features:
- HNSW vector indexing (4.1x performance improvement)
- Multi-database support (PostgreSQL + Qdrant)
- SearchAdapter interface for all backends
- SearchAdapterFactory for runtime selection
- 100+ new tests and comprehensive documentation
- 100% backward compatible with v0.1.0

See RELEASE-v0.2.0.md for details."
```

### Step 4: Create GitHub Release

```bash
# Create GitHub release
gh release create v0.2.0 \
  --title "v0.2.0 - Performance & Multi-Database Support" \
  --notes-file RELEASE-v0.2.0.md

# The release body will be read from RELEASE-v0.2.0.md
```

### Step 5: Publish to npm

```bash
# Login to npm (if not already logged in)
npm login
# Enter credentials

# Publish each package in dependency order
npm publish --workspace=packages/contracts --access public
npm publish --workspace=packages/core --access public
npm publish --workspace=packages/evaluator --access public
npm publish --workspace=packages/observability --access public
npm publish --workspace=packages/cli --access public
npm publish --workspace=packages/adapters/pgvector --access public
npm publish --workspace=packages/adapters/qdrant --access public
npm publish --workspace=packages/embeddings/local --access public
npm publish --workspace=packages/embeddings/openai --access public

# Or publish all at once (careful - order matters!)
npm publish --workspace --access public
```

### Step 6: Verify npm Publication

```bash
# Check packages are published
npm info @itsrajeshthota/retrievalops-core version
# Should show: 0.2.0

npm info @itsrajeshthota/retrievalops-pgvector version
# Should show: 0.2.0

npm info @itsrajeshthota/retrievalops-qdrant version
# Should show: 0.2.0

# Try installing locally
npm install @itsrajeshthota/retrievalops-core@0.2.0
npm install @itsrajeshthota/retrievalops-pgvector@0.2.0
```

### Step 7: Announce Release

Create announcement posts:

```markdown
# GitHub Release

https://github.com/Urstruelyrajeshthota/RetrievalOps/releases/tag/v0.2.0

# Twitter Announcement

🚀 v0.2.0 just shipped!

✨ 4.1x faster searches (HNSW indexing)
🗄️ Multi-database support (PostgreSQL + Qdrant)
🔌 Unified SearchAdapter interface
🎯 100% backward compatible

4-10x performance goal: ACHIEVED ✅

https://github.com/Urstruelyrajeshthota/RetrievalOps/releases/tag/v0.2.0

# Dev.to Post

Title: "RetrievalOps v0.2.0: 4x Faster Vector Search + Multi-Database Support"

Body: Link to RELEASE-v0.2.0.md and MULTI-DATABASE-GUIDE.md
```

### Step 8: Post-Ship Verification

```bash
# Verify git tag
git tag -l | grep v0.2.0

# Verify GitHub release
gh release view v0.2.0

# Verify npm packages (wait 5-10 minutes for npm indexing)
npm search @itsrajeshthota/retrievalops-core

# Verify installation works
npm install @itsrajeshthota/retrievalops-core@0.2.0
```

## Ship Control

### Go/No-Go Checklist

| Item | Status |
|------|--------|
| Main branch tests passing | ✅ Go |
| Release notes complete | ✅ Go |
| Documentation complete | ✅ Go |
| Examples working | ✅ Go |
| Performance targets met | ✅ Go |
| Security review done | ✅ Go |
| Backward compatibility verified | ✅ Go |
| npm credentials ready | ✅ Go |
| GitHub CLI setup | ✅ Go |
| **OVERALL** | **✅ GO** |

### Ship Status

```
┌─────────────────────────────────────┐
│      READY TO SHIP v0.2.0            │
│                                      │
│  ✅ Code: Complete & Tested         │
│  ✅ Docs: Comprehensive             │
│  ✅ Performance: 4.1x Faster        │
│  ✅ Multi-DB: PostgreSQL + Qdrant   │
│  ✅ Compatibility: 100% Backward    │
│                                      │
│        🚀 SHIP IT! 🚀               │
└─────────────────────────────────────┘
```

## Post-Ship Tasks

After shipping:

1. **Monitor Stability** (First 48 hours)
   - Check GitHub issues for bug reports
   - Monitor npm download stats
   - Watch for any crash reports

2. **Community Engagement**
   - Reply to GitHub issues promptly
   - Share news in relevant communities
   - Gather user feedback

3. **Documentation Updates**
   - Add v0.2.0 to version selector (if versioned docs)
   - Archive v0.1.0 docs if applicable
   - Update examples if needed

4. **Start v0.2.1 Planning**
   - Prioritize next features (Weaviate, Milvus)
   - Plan timeline for 2-3 weeks
   - Create v0.2.1 project/milestone

## Rollback Plan (If Needed)

If critical issues found post-ship:

```bash
# Unpublish from npm (deprecated package)
npm deprecate @itsrajeshthota/retrievalops-core@0.2.0 "v0.2.1 available with fixes"

# Delete GitHub release (if needed)
gh release delete v0.2.0

# Delete git tag
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# Re-release v0.2.0-hotfix if needed
git tag v0.2.0-hotfix
gh release create v0.2.0-hotfix --notes "Hotfix for critical issues"
npm publish --tag hotfix
```

## Success Criteria

✅ v0.2.0 published to npm  
✅ GitHub release created  
✅ All packages installable  
✅ No installation errors  
✅ Documentation accessible  
✅ Examples working post-ship  
✅ Community responding positively  

---

## Quick Ship Command

For reference, here's the minimal command to ship:

```bash
# Tag and release
git tag -a v0.2.0 -m "RetrievalOps v0.2.0"
git push origin v0.2.0

# Create GitHub release
gh release create v0.2.0 --notes-file RELEASE-v0.2.0.md

# Publish to npm
npm publish --workspace --access public

# Wait 5-10 minutes for npm indexing
# Verify: npm info @itsrajeshthota/retrievalops-core version
```

---

**v0.2.0 is cleared for launch!** 🚀🚀🚀
