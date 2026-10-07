# Architecture Guards

The repository includes two layers of preventive controls:

1. **ESLint restrictions** block database imports from frontend and route/controller layers, and block server-only dependencies from the browser-safe shared package.
2. **`scripts/check-architecture.mjs`** validates required directory shape, required Compose services, API base path, forbidden dependency substitutions and import-boundary violations.

These guards are not a substitute for code review, but they make accidental stack/architecture drift fail early.
