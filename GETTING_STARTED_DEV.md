# Getting Started: RetrievalOps Development

Welcome! This guide gets you up and running with the RetrievalOps codebase.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org))
- Docker & Docker Compose ([Download](https://www.docker.com/products/docker-desktop))
- Git
- VS Code (recommended) or your IDE of choice

## 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/retrievalops/retrievalops.git
cd retrievalops

# Install dependencies
npm install

# Verify installation
npm run build
# Should compile all 18 packages successfully
```

## 2. Start Local Services

```bash
# Start PostgreSQL, Qdrant, OpenSearch, Weaviate
docker-compose up -d

# Verify services are running
docker-compose ps
# All containers should show "healthy" or "Up"
```

## 3. Explore the Project

### Directory Structure

```
retrievalops/
├── packages/
│   ├── core/              # Main SDK (you'll work here in Phase 1)
│   ├── contracts/         # Type definitions for adapters
│   ├── adapters/
│   │   └── pgvector/      # PostgreSQL adapter (implement in Phase 1)
│   └── embeddings/
│       └── local/         # Local embeddings (implement in Phase 1)
├── examples/
│   └── jira-pgvector/     # Working example (build in Phase 1)
├── docs/
│   ├── adr/               # Architecture decisions
│   └── ARCHITECTURE.md    # System overview
└── PHASE-1-KICKOFF.md     # Phase 1 detailed plan
```

### Key Documentation

- **[README.md](./README.md)** — Project overview
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — System design
- **[PHASE-0-COMPLETION.md](./PHASE-0-COMPLETION.md)** — What's done
- **[PHASE-1-KICKOFF.md](./PHASE-1-KICKOFF.md)** — What's next
- **[docs/adr/](./docs/adr/)** — Design decisions

## 4. Understand the Codebase

### Core Contracts

All adapters must implement the `SearchAdapter` interface:

```ts
// See: packages/contracts/src/adapter.ts
interface SearchAdapter {
  capabilities(): AdapterCapabilities;
  index(request: IndexRequest): Promise<IndexResult>;
  denseSearch(request: DenseSearchRequest): Promise<Candidate[]>;
  keywordSearch?(request: KeywordSearchRequest): Promise<Candidate[]>;
  delete(request: DeleteRequest): Promise<void>;
  health(): Promise<AdapterHealth>;
}
```

All adapters must pass:

```ts
// See: packages/contracts/src/adapter-test-suite.ts
createAdapterTestSuite(async () => new YourAdapter(...));
```

### Current State

**What's implemented** (Phase 0):
- ✅ Monorepo structure
- ✅ Contracts and interfaces
- ✅ Adapter test suite
- ✅ CI/CD pipeline
- ✅ Architecture documentation
- ✅ Development environment

**What's NOT implemented** (Phase 1):
- ❌ RetrievalOps core
- ❌ PgVector adapter
- ❌ Local embeddings
- ❌ Hybrid retrieval
- ❌ Working examples

## 5. Common Tasks

### Run Tests

```bash
# All packages
npm run test

# One package
npm run test --workspace=@retrievalops/core

# Watch mode
npm run test:watch --workspace=@retrievalops/core

# Security tests only
npm run test:security
```

### Build

```bash
# All packages
npm run build

# One package
npm run build --workspace=@retrievalops/pgvector
```

### Lint & Format

```bash
# Check linting
npm run lint

# Fix linting
npm run lint -- --fix

# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### Type Checking

```bash
npm run type-check
```

## 6. Start Development

### For Phase 1 Contributors

**Pick a task from [PHASE-1-KICKOFF.md](./PHASE-1-KICKOFF.md):**

1. **Core Types** (Week 1)
   - Work in `packages/core/src/`
   - Define entity schema, request/response types

2. **PgVector Adapter** (Week 2)
   - Work in `packages/adapters/pgvector/src/`
   - Implement `SearchAdapter` interface
   - Pass test suite

3. **Local Embeddings** (Week 3)
   - Work in `packages/embeddings/local/src/`
   - Implement `EmbeddingProvider` interface

4. **Core Pipeline** (Week 3.5)
   - Work in `packages/core/src/`
   - Connect adapters + embeddings

### Workflow

```bash
# 1. Create feature branch
git checkout -b feat/entity-schema

# 2. Make changes
# Edit files in packages/core/src/

# 3. Build
npm run build

# 4. Test
npm run test --workspace=@retrievalops/core

# 5. Lint
npm run lint --workspace=@retrievalops/core

# 6. Commit
git commit -m "feat(core): add entity schema DSL"

# 7. Push and create PR
git push origin feat/entity-schema
# Then create PR on GitHub
```

## 7. Database Access

### PostgreSQL

```bash
# Connect to PostgreSQL
psql -U retrievalops -h localhost -d retrievalops_dev

# Query vectors table
SELECT entity_type, COUNT(*) FROM vectors GROUP BY entity_type;

# View schema
\dt
```

### Create Schema (automated)

```ts
// In your adapter initialization
const adapter = new PgVectorAdapter(config);
await adapter.health();  // Creates schema if missing
```

## 8. VSCode Setup

### Recommended Extensions

```
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- TypeScript support (built-in)
- GitHub Copilot (optional)
- REST Client (optional)
```

Install via VS Code Extensions panel, or auto-install with:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

### Settings

Settings are pre-configured in `.vscode/settings.json`:
- Format on save
- Lint on save
- TypeScript strict mode

## 9. Troubleshooting

### "Module not found" Error

```bash
# Rebuild dependencies
npm install

# Rebuild all packages
npm run build
```

### PostgreSQL Connection Error

```bash
# Check if container is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart container
docker-compose restart postgres
```

### Tests Failing

```bash
# Clean and rebuild
npm run clean
npm install
npm run build

# Run tests again
npm run test
```

### Type Errors in IDE

```bash
# Restart TS server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

## 10. Development Checklist

Before submitting a PR:

- [ ] Code compiles: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] Lint passes: `npm run lint`
- [ ] Types pass: `npm run type-check`
- [ ] Coverage > 80%: Check test output
- [ ] Code formatted: `npm run format`
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] Documentation updated (README, comments, etc.)

## 11. Learning Resources

### Architecture

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System overview
- [docs/adr/](./docs/adr/) — Design decisions

### Adapter Development

- [packages/contracts/src/adapter.ts](./packages/contracts/src/adapter.ts) — Interface
- [packages/contracts/src/adapter-test-suite.ts](./packages/contracts/src/adapter-test-suite.ts) — Tests
- [packages/adapters/pgvector/](./packages/adapters/pgvector/) — Reference implementation (Phase 1)

### TypeScript

- [tsconfig.json](./tsconfig.json) — Compiler options
- [.eslintrc.json](./.eslintrc.json) — Linting rules

## 12. Getting Help

**Questions?**
- 📖 Check [docs/](./docs/)
- 💬 GitHub Discussions
- 📧 Email: hello@retrievalops.dev

**Found a bug?**
- 🐛 Create an issue on GitHub
- 🔒 Security issues → security@retrievalops.dev

**Want to contribute?**
- 📝 See [CONTRIBUTING.md](./CONTRIBUTING.md)

## 13. Next Steps

### If You're Working on Phase 1

1. Read [PHASE-1-KICKOFF.md](./PHASE-1-KICKOFF.md) completely
2. Pick a task (Week 1: Entity Schema)
3. Read the relevant ADRs
4. Start implementing

### If You're Just Exploring

1. Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
2. Review [docs/adr/](./docs/adr/) for design context
3. Explore code in `packages/core/src/` and `packages/contracts/src/`
4. Try building: `npm run build`

---

**Happy coding! 🚀**

See [PHASE-1-KICKOFF.md](./PHASE-1-KICKOFF.md) for detailed development plan.
