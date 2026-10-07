# Stack Compliance

| Locked item | Repository artifact |
|---|---|
| TypeScript monorepo | root pnpm workspace + tsconfig base |
| Next.js + TypeScript | `frontend/` |
| Tailwind CSS | `frontend/tailwind.config.ts`, `globals.css` |
| TanStack Query | `frontend/src/app/providers.tsx` |
| Fastify + TypeScript | `backend/` |
| Zod shared contracts | `shared/` |
| PostgreSQL | Docker service + Prisma datasource |
| Prisma | isolated `database/` workspace |
| MinIO | Docker service; SDK intentionally not added to business modules |
| Redis | Docker service |
| BullMQ | `worker/` dependency/workspace |
| Nginx | `infrastructure/nginx/nginx.conf` |
| Docker Compose | `docker-compose.yml` |
| GitHub Actions | `.github/workflows/ci.yml` |
| Terraform later | placeholder only; no cloud choice invented |
| /api/v1 | `shared/src/constants/api.ts` |
| modular monolith | module directories + architecture guard |
