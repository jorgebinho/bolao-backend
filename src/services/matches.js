export function getMatchLockTime(matchDate) {
  return new Date(new Date(matchDate).getTime() - 15 * 60 * 1000)
}

export function isMatchLocked(matchDate) {
  return new Date() >= getMatchLockTime(matchDate)
}

export function isPendingUrgent(match, userId) {
  if (match.status !== 'UPCOMING') return false
  if (match.guesses?.some((guess) => guess.userId === userId)) return false

  const now = new Date()
  const lockTime = getMatchLockTime(match.matchDate)
  const alertStart = new Date(lockTime.getTime() - 60 * 60 * 1000)

  return now >= alertStart && now < lockTime
}

export function serializeMatch(match, currentUser) {
  const currentStatus =
    match.status === 'UPCOMING' && isMatchLocked(match.matchDate)
      ? 'LOCKED'
      : match.status

  const myGuess = match.guesses?.find((guess) => guess.userId === currentUser.id) || null
  const canShowAllGuesses = currentStatus === 'LOCKED' || currentStatus === 'FINISHED'
  const visibleGuesses = canShowAllGuesses
    ? match.guesses.map((guess) => ({
      id: guess.id,
      userId: guess.userId,
      userName: guess.user?.name || 'Participante',
      homeGuess: guess.homeGuess,
      awayGuess: guess.awayGuess,
      points: guess.points,
    }))
    : myGuess
      ? [{
        id: myGuess.id,
        userId: myGuess.userId,
        userName: currentUser.name,
        homeGuess: myGuess.homeGuess,
        awayGuess: myGuess.awayGuess,
        points: myGuess.points,
      }]
      : []

  const lockTime = getMatchLockTime(match.matchDate)
  const urgent = isPendingUrgent({ ...match, status: currentStatus }, currentUser.id)

  return {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeFlag: match.homeFlag,
    awayFlag: match.awayFlag,
    matchDate: match.matchDate,
    stage: match.stage,
    status: currentStatus,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    lockTime,
    isUrgent: urgent,
    minutesToLock: Math.max(Math.ceil((lockTime.getTime() - Date.now()) / 60000), 0),
    myGuess: myGuess
      ? {
        id: myGuess.id,
        homeGuess: myGuess.homeGuess,
        awayGuess: myGuess.awayGuess,
        points: myGuess.points,
      }
      : null,
    guesses: visibleGuesses,
    isLocked: currentStatus !== 'UPCOMING',
  }
}


