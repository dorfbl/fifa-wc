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
  stage = 'group',
  score90Home?: number | null,
  score90Away?: number | null
): number {
  // For knockout matches that went to ET/penalties, score predictions on the 90-min result
  const effectiveHome = (score90Home != null) ? score90Home : actualHome;
  const effectiveAway = (score90Away != null) ? score90Away : actualAway;

  let points = 0;

  if (predHome === effectiveHome && predAway === effectiveAway) {
    points = 3;
  } else {
    const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const effectiveWinner = effectiveHome > effectiveAway ? 'home' : effectiveHome < effectiveAway ? 'away' : 'draw';
    if (predWinner === effectiveWinner) {
      points = 1;
    }
  }

  if (isPlayoffStage(stage)) points *= 2;

  return isDouble ? points * 2 : points;
}

export function getPointLabel(points: number | null | undefined): string {
  if (points === null || points === undefined) return '';
  if (points > 0) return `+${points}`;
  return '+0';
}
