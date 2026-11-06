CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "temporaryPassword" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "monthlyLimit" REAL NOT NULL DEFAULT 0,
    "currentSpent" REAL NOT NULL DEFAULT 0,
    "accessExpiresAt" DATETIME,
    "hasLoggedIn" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" DATETIME,
    "verificationToken" TEXT,
    "offerAcceptedAt" DATETIME,
    "offerVersion" TEXT,
    "offerAcceptedIp" TEXT,
    "privacyAcceptedAt" DATETIME,
    "privacyVersion" TEXT,
    "phone" TEXT,
    "phoneVerifiedAt" DATETIME,
    "lastLoginAt" DATETIME,
    "lastLogoutAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "User_verificationToken_key" ON "User"("verificationToken");