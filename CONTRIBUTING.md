# Contributing to RetrievalOps

Thank you for your interest in contributing! We welcome contributions from the community.

## Code of Conduct

Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- Clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (Node.js version, OS, etc.)
- Relevant code snippets or error logs

### Suggesting Features

Feature suggestions are welcome. Please include:

- Use case and motivation
- Proposed API or behavior
- Any alternative approaches you considered

### Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Start local services: `docker-compose up -d`
5. Run tests to verify setup: `npm run test`

### Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Add or update tests
4. Run linting: `npm run lint`
5. Run type checking: `npm run type-check`
6. Commit with conventional commits: `git commit -m "feat: description"`
7. Push to your fork
8. Create a Pull Request

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Example:

```
feat(pgvector): add support for custom distance metrics

Support cosine, l2, and ip distance metrics in PgVector adapter.
Adds configuration option to entity schema.

Closes #123
```

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Request review from maintainers
5. Address feedback promptly

### Testing

- Write unit tests for business logic
- Write integration tests for adapters
- Write security tests for access control
- Target: 80%+ code coverage

Run tests:

```bash
npm run test
npm run test:security
```

### Documentation

- Update README if changing user-facing behavior
- Add ADRs for significant architectural decisions
- Include inline comments for non-obvious logic
- Keep examples up-to-date

## Adapter Development

If you're implementing a new adapter:

1. Implement the `SearchAdapter` interface from `@retrievalops/contracts`
2. Pass the adapter contract test suite
3. Add integration tests against a real instance
4. Document setup and configuration
5. Create a working example in `examples/`

## Release Process

Releases are managed by maintainers using [changesets](https://github.com/changesets/changesets):

1. Create a changeset: `npx changeset add`
2. Commit with your changes
3. On release, maintainers run: `npm run version && npm run release`

## Questions?

- GitHub Discussions for questions
- Security issues: security@retrievalops.dev
- General inquiries: hello@retrievalops.dev

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
