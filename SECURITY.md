# Security Policy

## Supported versions

Security fixes are applied to the current `master` branch and the latest published container version. Operators should update to the newest available image tag before reporting a problem already fixed upstream.

## Reporting a vulnerability

Do not open a public issue for suspected vulnerabilities.

Preferred channel: [open a private GitHub security advisory](https://github.com/Shik3i/KoalaData/security/advisories/new).

Alternative: email `koalasync@koalastuff.net` with the subject `KoalaData security report`.

Include:

- affected version or commit;
- impact and prerequisites;
- minimal reproduction steps;
- suggested mitigation, if known.

Do not include production credentials, session cookies, personal data, or real publisher CSV exports. Use synthetic examples and redact identifiers.

Reports are reviewed as availability permits. Coordinated disclosure is requested until a fix or mitigation is available. No bounty program is currently offered.

## Security design

- Argon2id password hashing and opaque, hashed server-side session tokens.
- HTTP-only, SameSite session cookies with `Secure` enabled in production.
- Server-side role and project authorization checks.
- File-size, row-count, encoding, content, and mapping validation for CSV imports.
- HTTPS-only external project URLs and strict Chrome Web Store URL validation.
- Content Security Policy and restrictive image/connect sources.
- Moderation gates for public listings and leaderboards.
- Audit events with secret-field filtering and minimized persisted network identifiers.

See [docs/security-review.md](docs/security-review.md) for verification boundaries and [the live security page](https://data.koalastuff.net/security) for the operator-facing summary.
