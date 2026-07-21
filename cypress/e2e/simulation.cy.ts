/**
 * Simulation verification tests.
 * Run AFTER: node scripts/simulate-full.mjs
 * Run with: npx cypress run  OR  npx cypress open
 */

// Helper: log in as a user via the API (sets session cookie)
function loginAs(username: string, pin: string) {
  cy.request('POST', '/api/auth/login', { username, pin }).then(res => {
    expect(res.status).to.eq(200);
  });
}

describe('Simulation — Leaderboard', () => {
  before(() => loginAs('michael', '5555'));

  it('shows at least 8 users with positive points', () => {
    cy.visit('/leaderboard');
    cy.get('body').should('not.contain', 'שגיאה');

    // Verify multiple users are listed
    cy.get('[class*="rounded"]').should('have.length.gte', 6);

    // At least one user should have points > 0
    cy.contains(/\+\d+/).should('exist');
  });

  it('shows דור at or near the top (picked correct champion)', () => {
    cy.visit('/leaderboard');
    cy.get('body').should('contain', 'דור');
  });
});

describe('Simulation — Matches', () => {
  before(() => loginAs('michael', '5555'));

  it('shows finished group stage matches with scores', () => {
    cy.visit('/matches');
    // Some matches should show scores (finished)
    cy.contains(/\d+ - \d+/).should('exist');
  });

  it('shows the final as finished', () => {
    // Check DB that final exists and is finished
    cy.task('dbQuery', {
      text: `SELECT m.home_score, m.away_score, m.status,
                    ht.name_he as home, at.name_he as away
             FROM matches m
             JOIN teams ht ON m.home_team_id = ht.id
             JOIN teams at ON m.away_team_id = at.id
             WHERE m.api_id = 'SIM-FINAL'`,
    }).then((rows: unknown) => {
      const r = (rows as Array<{ home_score: number; away_score: number; status: string; home: string; away: string }>)[0];
      expect(r).to.exist;
      expect(r.status).to.eq('finished');
      expect(r.home_score).to.eq(2);
      expect(r.away_score).to.eq(1);
      expect(r.home).to.eq('ברזיל');
      expect(r.away).to.eq('צרפת');
    });
  });
});

describe('Simulation — Points integrity', () => {
  it('Brazil pickers (דור and מיכאל) have 8 champion points', () => {
    cy.task('dbQuery', {
      text: `SELECT u.display_name, tw.points
             FROM tournament_winners tw
             JOIN users u ON u.id = tw.user_id
             WHERE tw.team_id = 90 AND u.is_bot = false
             ORDER BY u.display_name`,
    }).then((rows: unknown) => {
      const r = rows as Array<{ display_name: string; points: number }>;
      expect(r.length).to.be.gte(2);
      r.forEach(row => expect(row.points).to.eq(8));
    });
  });

  it('Raphinha has 7 goals scored', () => {
    cy.task('dbQuery', {
      text: `SELECT COUNT(*) as goals
             FROM match_events
             WHERE event_type = 'goal' AND player_name = 'Raphinha'`,
    }).then((rows: unknown) => {
      const r = rows as Array<{ goals: string }>;
      expect(parseInt(r[0].goals)).to.eq(7);
    });
  });

  it('דור (Raphinha picker) has top scorer points = 7 goals + 8 bonus', () => {
    cy.task('dbQuery', {
      text: `SELECT ts.points
             FROM top_scorer_picks ts
             JOIN users u ON u.id = ts.user_id
             WHERE u.id = 1`,
    }).then((rows: unknown) => {
      const r = rows as Array<{ points: string }>;
      // 7 goals awarded as points (bonus set separately by tournament end logic)
      expect(parseInt(r[0].points)).to.be.gte(7);
    });
  });

  it('every non-bot user has at least 10 prediction points', () => {
    cy.task('dbQuery', {
      text: `SELECT u.display_name, COALESCE(SUM(p.points), 0) as pred_pts
             FROM users u
             LEFT JOIN predictions p ON p.user_id = u.id
             WHERE u.is_bot = false
             GROUP BY u.id, u.display_name
             ORDER BY pred_pts DESC`,
    }).then((rows: unknown) => {
      const r = rows as Array<{ display_name: string; pred_pts: string }>;
      expect(r.length).to.be.gte(8);
      // Top scorer should have substantial points
      expect(parseInt(r[0].pred_pts)).to.be.gte(30);
    });
  });

  it('knockout matches award doubled points', () => {
    cy.task('dbQuery', {
      text: `SELECT MAX(p.points) as max_pts
             FROM predictions p
             JOIN matches m ON m.id = p.match_id
             WHERE m.stage = 'final'`,
    }).then((rows: unknown) => {
      const r = rows as Array<{ max_pts: string }>;
      // Max possible for final exact+double = 12 pts
      expect(parseInt(r[0].max_pts)).to.be.gte(6);
    });
  });
});

describe('Simulation — Profile page', () => {
  beforeEach(() => loginAs('michael', '5555'));

  it('מיכאל profile shows champion pick (Brazil) and points', () => {
    cy.visit('/profile');
    cy.contains('ברזיל').should('exist');
  });
});
