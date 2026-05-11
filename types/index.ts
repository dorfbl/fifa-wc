export interface User {
  id: number;
  username: string;
  display_name: string;
  is_admin: boolean;
  is_first_login: boolean;
  created_at: string;
}

export interface Team {
  id: number;
  api_id?: string;
  name_en: string;
  name_he: string;
  flag_emoji: string;
  group_letter: string;
}

export interface Venue {
  id: number;
  api_id?: string;
  name_he: string;
  city_he: string;
  country_he: string;
}

export interface Channel {
  id: number;
  name_he: string;
  logo_url?: string;
}

export interface Match {
  id: number;
  api_id?: string;
  home_team_id: number;
  away_team_id: number;
  venue_id?: number;
  channel_id?: number;
  match_date: string;
  stage: string;
  group_letter?: string;
  home_score?: number;
  away_score?: number;
  status: 'scheduled' | 'live' | 'finished';
  // Joined
  home_team?: Team;
  away_team?: Team;
  venue?: Venue;
  channel?: Channel;
}

export interface Prediction {
  id: number;
  user_id: number;
  match_id: number;
  home_score: number;
  away_score: number;
  is_double: boolean;
  points?: number;
  created_at: string;
  updated_at: string;
  // Joined
  user?: User;
}

export interface LeaderboardEntry {
  user_id: number;
  display_name: string;
  total_points: number;
  exact_scores: number;
  correct_winners: number;
  success_rate: number;
  rank: number;
}

export interface TournamentWinner {
  id: number;
  user_id: number;
  team_id: number;
  points: number;
  team?: Team;
  user?: User;
}
