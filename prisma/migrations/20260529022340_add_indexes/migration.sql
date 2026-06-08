-- CreateIndex
CREATE INDEX "champion_guesses_userId_idx" ON "champion_guesses"("userId");

-- CreateIndex
CREATE INDEX "groups_ownerId_idx" ON "groups"("ownerId");

-- CreateIndex
CREATE INDEX "matches_matchDate_idx" ON "matches"("matchDate");
