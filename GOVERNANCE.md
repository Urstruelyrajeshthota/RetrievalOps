# Governance

RetrievalOps is governed by a maintainer-led model with clear roles and decision-making processes.

## Structure

```
Founder/Maintainer
        ↓
Core Maintainers
        ↓
Adapter Maintainers
        ↓
Contributors
```

## Roles

### Founder/Maintainer

- Steward of project vision and roadmap
- Final decision-maker on disputes
- Approves major architectural changes
- Manages release schedule

### Core Maintainers

- Review pull requests for quality and safety
- Manage issues and triage bugs
- Mentor contributors
- Participate in architectural decisions
- Maintain core packages (@retrievalops/core, contracts, evaluator)

### Adapter Maintainers

- Maintain specific adapters (pgvector, qdrant, etc.)
- Ensure adapter compliance with contracts
- Handle adapter-specific issues
- Can approve adapter PRs independently

### Contributors

- Report bugs
- Submit pull requests
- Improve documentation
- Suggest features

## Decision Making

### Minor Decisions

- Bug fixes
- Documentation improvements
- Test coverage additions
- Dependency updates

**Process**: One maintainer approval required

### Major Decisions

- New packages
- API changes
- Architecture changes
- Significant feature additions
- Release schedule changes

**Process**: Discussion in issue, consensus among core maintainers, founder approval

### Strategic Decisions

- Project direction
- Licensing changes
- Governance model changes
- Community management

**Process**: Public RFC (Request for Comments), feedback period (1-2 weeks), founder decision

## Release Process

1. **Planning**: Maintainers identify PRs for next release
2. **Changesets**: Contributors add changesets for their changes
3. **Versioning**: `npm run version` bumps versions per semver
4. **Release**: Founder or designated maintainer runs `npm run release`
5. **Announcement**: Release notes published on GitHub and social channels

## Contribution Process

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## Becoming a Maintainer

Contributors can become maintainers by:

1. Consistent high-quality contributions (3+ months)
2. Deep knowledge of a specific area
3. Nomination by existing maintainer
4. Approval by core team
5. Signed CLA (if required in future)

## Code of Conduct

All community members must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Violations can be reported to conduct@retrievalops.dev.

## Conflict Resolution

1. **Discussion**: Attempt to resolve in GitHub issue or email
2. **Mediation**: Core maintainer facilitates discussion
3. **Resolution**: Founder makes final decision if needed

## Licensing

- Apache License 2.0 for all contributions
- Contributor Certificate of Origin (CCO) for all commits
- CLA may be added in future for commercial relicensing

## Changes to Governance

Changes to governance model require:

1. RFC with detailed proposal
2. 2-week feedback period
3. Consensus among core maintainers
4. Founder approval
5. Announcement to community

## Current Maintainers

- **Rajesh Thota** (Founder) — Strategic direction, final decisions

## Contact

- General: hello@retrievalops.dev
- Security: security@retrievalops.dev
- Conduct: conduct@retrievalops.dev
