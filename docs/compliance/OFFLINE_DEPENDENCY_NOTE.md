# Offline Dependency Note

The repository can be inspected offline, but reproducible dependency certification requires a real `pnpm-lock.yaml` resolved from the package registry. The lockfile must not be fabricated.

Generate it on a connected machine with `scripts/generate-lockfile.sh` or `scripts/generate-lockfile.ps1`, then run `pnpm install --frozen-lockfile`, `pnpm dependencies:check`, and `pnpm verify:static`.
