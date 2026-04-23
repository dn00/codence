# Security Policy

## Reporting a Vulnerability

If you believe you've found a security issue in Codence, please **do not** open a public GitHub issue. Instead, email the maintainer directly or use GitHub's private security advisory feature on the repository.

We'll confirm receipt within a few business days and aim to publish a patch release within 30 days for high-severity findings.

## Scope

Codence runs locally on the user's machine by default. In-scope concerns:

- Arbitrary code execution via crafted items, track policies, or imported backups.
- SQL injection despite the Drizzle ORM layer.
- Path traversal in export/import or static file serving.
- Secrets leakage through logs, error responses, or LLM prompts.
- LLM prompt-injection that causes destructive actions on the local database.

Out of scope (local-first threat model):

- DoS on the local server (the user owns the process).
- Physical access to the SQLite file (if an attacker has your laptop, that's a bigger problem).

## Supported Versions

The latest `0.x` release is the only supported version during pre-1.0 development. Upgrade to get fixes.
