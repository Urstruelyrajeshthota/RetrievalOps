# Release v0.2.2 - Ready to Publish

**Date**: August 10, 2026  
**Status**: ✅ Ready for npm publish  
**Total Packages**: 8 public packages at v0.2.2

---

## Corrected Version Numbering

### Why v0.2.2 instead of v0.2.1.1?

npm uses semantic versioning (semver) which requires 3 parts: `major.minor.patch`
- ❌ `0.2.1.1` - Invalid (4 parts)
- ✅ `0.2.2` - Valid (3 parts, bump minor version)

Since this release includes:
- New feature: `getCapabilities()` interface
- Comprehensive bug fixes
- 80+ new tests
- Improved factory configuration

Bumping to v0.2.2 is appropriate as a minor version update, not just a patch.

---

## Packages Ready to Publish (8 total)

### Core Packages (2)
- ✅ `@itsrajeshthota/retrievalops-core@0.2.2`
- ✅ `@itsrajeshthota/retrievalops-contracts@0.2.2`

### Adapters (4)
- ✅ `@itsrajeshthota/retrievalops-pgvector@0.2.2`
- ✅ `@itsrajeshthota/retrievalops-qdrant@0.2.2`
- ✅ `@itsrajeshthota/retrievalops-weaviate@0.2.2`
- ✅ `@itsrajeshthota/retrievalops-milvus@0.2.2`

### CLI & Embeddings (2)
- ✅ `@itsrajeshthota/retrievalops-cli@0.2.2`
- ✅ `@itsrajeshthota/retrievalops-local@0.2.2` (embeddings)

### Intentionally Not Published (Private)
These remain private as originally configured:
- observability (utility)
- evaluator (utility)
- openai (embeddings - paid service)
- gemini (embeddings - paid service)
- opensearch (adapter - 0.2.0 version)
- reranker packages (0.2.0 versions)

---

## Pre-Publication Checklist

- [x] All package versions corrected to 0.2.2
- [x] Private flag removed from packages to be published
- [x] All adapters have getCapabilities() implemented
- [x] 80+ tests added and validated
- [x] Documentation updated
- [x] Examples corrected

---

## Publish Command

```bash
# Build all packages first (if needed)
npm run build

# Publish all public packages to npm
npm publish --workspaces --access public
```

### What This Does:
- Publishes all 8 public packages to npm registry
- Sets packages as publicly accessible
- Tags with v0.2.2 version
- Updates version history on npm

### Output You Should See:
```
npm notice Publishing 8 packages

@itsrajeshthota/retrievalops-core@0.2.2
@itsrajeshthota/retrievalops-contracts@0.2.2
@itsrajeshthota/retrievalops-pgvector@0.2.2
@itsrajeshthota/retrievalops-qdrant@0.2.2
@itsrajeshthota/retrievalops-weaviate@0.2.2
@itsrajeshthota/retrievalops-milvus@0.2.2
@itsrajeshthota/retrievalops-cli@0.2.2
@itsrajeshthota/retrievalops-local@0.2.2
```

---

## Post-Publish Steps

### 1. Tag the Release
```bash
git tag v0.2.2
git push origin v0.2.2
```

### 2. Create GitHub Release
- Go to https://github.com/retrievalops/retrievalops/releases
- Create new release from v0.2.2 tag
- Copy CHANGELOG-v0.2.2.md content as description

### 3. Announce Release
- Community channels (Slack, Discord, etc.)
- Email newsletter
- Social media

### Example Announcement:
```
🎉 RetrievalOps v0.2.2 Released

Major improvements:
✅ Added runtime capability detection (getCapabilities)
✅ Fixed all 7 critical v0.2.1 violations  
✅ Added 80+ comprehensive tests
✅ Improved factory auto-configuration
✅ Corrected all example code

Adapter Status:
- PostgreSQL: ✅ Stable
- Qdrant: ✅ Stable
- Weaviate: 🟡 Beta
- Milvus: 🟠 Experimental

Get started: npm install @itsrajeshthota/retrievalops-core@0.2.2
```

---

## Verification After Publish

```bash
# Check package on npm registry
npm info @itsrajeshthota/retrievalops-core@0.2.2

# Verify all packages are published
npm search @itsrajeshthota retrievalops --json | jq '.[] | select(.version == "0.2.2")'

# Try installing the new version
npm install @itsrajeshthota/retrievalops-core@0.2.2
```

---

## What's Included in v0.2.2

### New Features
- ✅ `getCapabilities()` method on SearchAdapter interface
- ✅ AdapterCapabilities interface for runtime feature detection
- ✅ Improved factory auto-configuration

### Bug Fixes
- ✅ Fixed Milvus false production claims (now Experimental)
- ✅ Fixed Weaviate hybridSearch false advertising (now Beta)
- ✅ Fixed all examples to use correct contract
- ✅ Fixed factory environment configuration

### Quality Improvements
- ✅ 80+ comprehensive tests added
- ✅ Better TypeScript type safety
- ✅ Accurate documentation
- ✅ Honest adapter status labels

### Testing Coverage
- PostgreSQL capabilities: 11 tests
- Factory configuration: 22 tests
- Example compilation: 30+ tests
- Capability integration: 18 tests

---

## Version Summary

| Package | v0.2.1 | v0.2.2 | Notes |
|---------|--------|--------|-------|
| core | ✅ | ✅ | Updated with new capability detection |
| contracts | ✅ | ✅ | Added AdapterCapabilities interface |
| pgvector | ✅ | ✅ | Added getCapabilities() |
| qdrant | ✅ | ✅ | Added getCapabilities() |
| weaviate | ✅ | ✅ | Added getCapabilities() |
| milvus | ✅ | ✅ | Added getCapabilities() |
| cli | ✅ | ✅ | Updated, removed private flag |
| local (embeddings) | ✅ | ✅ | Updated with new contracts |

---

## Release Notes

See `CHANGELOG-v0.2.2.md` for complete release notes.

---

## Support

For issues with v0.2.2:
1. Check CHANGELOG-v0.2.2.md for known issues
2. Review COMPLETE-DELIVERY-SUMMARY.md for detailed changes
3. Consult v0.2.1-examples-CORRECTED.ts for correct usage patterns
4. Use getCapabilities() to detect backend features

---

**v0.2.2 is ready for production release.** 🚀

Proceed with: `npm publish --workspaces --access public`
