CREATE TABLE "match_reminder_emails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_reminder_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_reminder_emails_userId_matchId_key" ON "match_reminder_emails"("userId", "matchId");
CREATE INDEX "match_reminder_emails_matchId_idx" ON "match_reminder_emails"("matchId");

ALTER TABLE "match_reminder_emails" ADD CONSTRAINT "match_reminder_emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_reminder_emails" ADD CONSTRAINT "match_reminder_emails_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
