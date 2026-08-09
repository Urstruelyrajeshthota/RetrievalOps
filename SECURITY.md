# Security Policy

## Reporting Security Vulnerabilities

RetrievalOps takes security seriously. If you discover a security vulnerability, please report it responsibly to:

**Email**: security@retrievalops.dev

Please do **not** create a public GitHub issue for security vulnerabilities.

### Reporting Process

1. Send a detailed report to security@retrievalops.dev
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)
3. Allow 48 hours for initial response
4. We will investigate and coordinate disclosure

We commit to:

- Acknowledging receipt within 48 hours
- Providing a timeline for remediation
- Crediting you (if desired) in security advisory
- Not disclosing publicly until a fix is available

## Security Best Practices

### For Users

- Keep RetrievalOps and dependencies updated
- Use HTTPS for all network communications
- Never log retrieved content containing sensitive data
- Validate and sanitize data before embedding
- Implement rate limiting on retrieval endpoints
- Use strong authentication and authorization

### Threat Model

RetrievalOps assumes:

- Adapters (databases) are trustworthy
- Embedding models are trustworthy
- Application layer handles authentication
- Network transport is secured (TLS)
- Retrieved documents should not modify system behavior

RetrievalOps protects against:

- Cross-tenant data leakage
- Permission bypass
- Stale ACL enforcement
- Prompt injection via retrieved content
- Model dimension mismatch
- Unsafe telemetry

### Access Control

RetrievalOps implements:

- Tenant-scoped retrieval
- Principal-based permissions
- Permission filters before content retrieval
- Audit event logging
- Cache isolation by tenant + principal

See [Security Model](docs/security.md) for detailed information.

## Testing

We maintain security test suites for:

- Cross-tenant isolation
- Permission revocation
- Deleted document handling
- Cache key isolation
- Stale ACL propagation
- Prompt injection resistance
- Model compatibility

Security tests are run with every release and documented in CI/CD logs.

## Dependency Management

- We use automatic dependency scanning
- Security patches are prioritized
- We monitor for CVEs in transitive dependencies
- We maintain minimal dependency footprint

## Version Support

- **v1.0.0+**: Full support and security patches
- **Older versions**: Security advisories published, patches on request

## Compliance

RetrievalOps is designed with:

- GDPR awareness (data deletion, access logs)
- Separation of concerns (storage vs. retrieval)
- Audit trail capabilities
- Permission enforcement at storage layer

This is not a legal guarantee. Consult your security and legal teams before deploying to production.

## Security Advisories

Security advisories are published at https://github.com/retrievalops/retrievalops/security/advisories

Subscribe to notifications for critical updates.

## Credits

We appreciate security researchers who responsibly disclose vulnerabilities. We will credit you in security advisories (with your consent).
