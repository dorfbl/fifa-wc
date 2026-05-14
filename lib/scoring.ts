const PLAYOFF_STAGES = new Set(['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']);

export function isPlayoffStage(stage: string): boolean {
  return PLAYOFF_STAGES.has(stage);
}

export function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  isDouble: boolean,
  stage = 'group'
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

  // Playoff stage: all points automatically doubled
  if (isPlayoffStage(stage)) points *= 2;

  return isDouble ? points * 2 : points;
}

export function getPointLabel(points: number | null | undefined): string {
  if (points === null || points === undefined) return '';
  if (points > 0) return `+${points}`;
  return '+0';
}
