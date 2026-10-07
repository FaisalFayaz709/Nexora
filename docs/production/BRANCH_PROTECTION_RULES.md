# R20 Branch Protection Rules

This repository source file cannot enable GitHub branch protection by itself. Apply these settings in GitHub repository settings for `main`.

## Required protections

- Require a pull request before merging.
- Require approvals from CODEOWNERS.
- Require conversation resolution before merge.
- Require status checks to pass before merge.
- Require branches to be up to date before merging.
- Block force pushes to `main`.
- Block direct pushes to `main` except controlled release automation.
- Require signed commits where the organization policy supports it.
- Restrict who can dismiss reviews.

## Required status checks

Use these names from the R20 workflow and security workflows:

- `Source architecture gates R0-R20`
- `Frozen install, quality, tests, build`
- `Appendix G frontend gates`
- `Backend boundaries and security gates`
- `Docker build and smoke`
- `E2E smoke source gate`
- `R20 gate summary`
- `CodeQL / analyze (javascript-typescript)`
- `Semgrep / semgrep`

## Merge rule

A change must not merge if it violates locked stack, module boundaries, tenant isolation, RBAC, audit, transaction handling, Appendix G frontend conventions, or CI/CD evidence requirements.


## R21 final blueprint compliance audit

The final source gate is `node scripts/check-pass-r21-final-blueprint-compliance-audit.mjs --source-only`. It must run before any production GO decision is accepted.
