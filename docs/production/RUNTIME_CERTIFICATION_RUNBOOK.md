# Runtime Certification Runbook

Run from a clean clone on a connected machine with Node, Corepack, Docker and
network access.

## Linux/macOS

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --lockfile-only
pnpm install --frozen-lockfile
pnpm final:certify
```

## Windows PowerShell

```powershell
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --lockfile-only
pnpm install --frozen-lockfile
pnpm final:certify:ps
```

## Certification rule

Do not mark AR-2/AR-3 PASS unless every command exits 0 and the generated logs
are attached to the release record.
