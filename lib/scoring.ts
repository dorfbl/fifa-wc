export function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  isDouble: boolean
): number {
  let points = 0;

  if (predHome === actualHome && predAway === actualAway) {
    points = 3; // Exact score
  } else {
    const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
    if (predWinner === actualWinner) {
      points = 1; // Correct winner
    }
  }

  return isDouble ? points * 2 : points;
}

export function getPointLabel(points: number | null | undefined): string {
  if (points === null || points === undefined) return '';
  if (points === 6) return '+6';
  if (points === 3) return '+3';
  if (points === 2) return '+2';
  if (points === 1) return '+1';
  return '+0';
}
