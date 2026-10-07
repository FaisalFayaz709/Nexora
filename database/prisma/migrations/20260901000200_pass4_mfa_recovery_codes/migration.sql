-- Pass 4 supporting persistence for source-required hashed MFA recovery codes.
-- The source requires recovery codes to be stored hashed but does not name the table.
CREATE TABLE "MfaRecoveryCode" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MfaRecoveryCode_userId_usedAt_idx"
  ON "MfaRecoveryCode"("userId", "usedAt");

ALTER TABLE "MfaRecoveryCode"
  ADD CONSTRAINT "MfaRecoveryCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
