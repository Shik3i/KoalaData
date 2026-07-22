# Security review notes

This document describes the current review boundary. It is not a certification or guarantee of vulnerability-free software.

## Controls reviewed in the repository

- Password hashing, session-token hashing, cookie flags, session expiry, and session invalidation.
- Secret filtering and network-identifier minimization in audit/session storage.
- Role, membership, visibility, moderation, and administrator authorization paths.
- CSV size, row, encoding, delimiter, numeric, date, and mapping validation.
- External URL validation and local-only project asset handling.
- Content Security Policy, external-link isolation, and public-page access rules.
- Production credential requirements and container build behavior.

## Automated evidence

The CI workflow runs static Svelte/TypeScript checks, unit and integration tests, Playwright system tests, responsive and accessibility checks, a production build, Lighthouse budgets, and a Docker build.

## Boundaries

- Hosting-provider, reverse-proxy, operating-system, Docker-host, DNS, and TLS configuration remain operator responsibilities.
- Imported CSV correctness ultimately depends on the publisher's source export and preview confirmation.
- Administrator verification confirms reviewed evidence; it is not an endorsement of an extension.
- Dependency and browser-platform behavior may change after a release. Operators should monitor updates and rebuild regularly.

Report suspected vulnerabilities through [SECURITY.md](../SECURITY.md), never through a public issue.
