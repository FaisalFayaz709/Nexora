# Prisma Model Ownership

`database/prisma/schema.prisma` is the canonical active Prisma schema.

The specification recommends domain grouping under `database/prisma/models/`, but Prisma remains persistence rather than the API contract. This directory records ownership without duplicating active model definitions.

Physical models are introduced by capability as required by the locked specification. Do not introduce duplicate `.prisma` fragments unless multi-file Prisma schema support is intentionally enabled and validated.
