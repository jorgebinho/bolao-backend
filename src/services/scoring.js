const CHAMPION_BONUS_POINTS = 5;

function calculateMatchPoints(homeGuess, awayGuess, homeScore, awayScore) {
  if (homeGuess === homeScore && awayGuess === awayScore) return 3;

  const guessResult = Math.sign(homeGuess - awayGuess);
  const realResult = Math.sign(homeScore - awayScore);
  return guessResult === realResult ? 1 : 0;
}

function normalizeRankingUsers(users, currentUserId) {
  return users
    .map((user) => {
      const guesses = user.guesses || [];
      const championPoints = user.championGuess?.points || 0;
      const matchPoints = user.points || 0;
      const exactScores = guesses.filter((guess) => guess.points === 3).length;
      const partialScores = guesses.filter((guess) => guess.points === 1).length;
      const totalGuesses = user._count?.guesses ?? guesses.length;
      const totalPoints = matchPoints + championPoints;

      return {
        id: user.id,
        name: user.name,
        matchPoints,
        championPoints,
        totalPoints,
        totalGuesses,
        exactScores,
        partialScores,
        errors: Math.max(totalGuesses - exactScores - partialScores, 0),
        championGuess: user.championGuess
          ? {
              team: user.championGuess.team,
              isCorrect: user.championGuess.isCorrect,
              points: user.championGuess.points,
            }
          : null,
        isCurrentUser: user.id === currentUserId,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      if (b.partialScores !== a.partialScores) return b.partialScores - a.partialScores;
      return 0;
    })
    .map((user, index) => ({ ...user, position: index + 1 }));
}

module.exports = {
  CHAMPION_BONUS_POINTS,
  calculateMatchPoints,
  normalizeRankingUsers,
};
