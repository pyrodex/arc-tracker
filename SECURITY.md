# Security Policy

## Supported Versions

Only the latest release on the `main` branch receives security fixes.

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| Older tags | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Use [GitHub Private Vulnerability Reporting](https://github.com/pyrodex/arc-tracker/security/advisories/new) to submit a report confidentially. This keeps the details private until a fix is available.

Include as much of the following as possible:

- Type of vulnerability (e.g. injection, SSRF, privilege escalation)
- Full path of the source file(s) related to the issue
- Steps to reproduce (proof-of-concept or exploit code is welcome)
- Impact assessment — what can an attacker achieve?
- Any suggested remediation

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgement | Within **48 hours** |
| Triage & severity assessment | Within **5 business days** |
| Fix or mitigation published | Within **30 days** for critical/high |
| CVE / advisory published | After fix is released |

If a critical vulnerability requires more than 30 days to fix, a coordinated disclosure date will be agreed upon.

## Disclosure Policy

This project follows [coordinated (responsible) disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html). Please allow a reasonable window to patch before publishing publicly.

Public credit will be given in the GitHub Security Advisory and release notes unless you prefer to remain anonymous.

## Scope

### In scope

- The Node.js/Express backend (`backend/`)
- The React frontend (`frontend/`)
- The Docker image and its runtime configuration
- The `download-icons.js` script (network requests, file writes)
- The GitHub Actions workflows (supply-chain / injection risks)

### Out of scope

- Vulnerabilities in third-party dependencies that already have a public CVE and a pending upstream fix
- Issues only exploitable with direct shell access to the host machine
- Self-XSS
- Social engineering

## Security Architecture Notes

- **No authentication** is built in — the app is designed to run behind a reverse proxy (nginx, Caddy, Traefik) that handles auth. Running it directly on a public interface without a proxy is an unsupported configuration.
- **HSTS is intentionally disabled** on the app server — it must be set by the TLS-terminating proxy.
- **Rate limiting** is applied to all API routes (300 reads / 120 writes per IP per minute).
- The Docker image runs as a **non-root user** (`arcapp`, uid 1001) with a **read-only root filesystem** and **all Linux capabilities dropped**.
