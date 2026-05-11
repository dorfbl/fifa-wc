-- מונדיאל חברים 2026 - Database Schema

CREATE DATABASE mondial_2026;
\c mondial_2026;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_first_login BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  api_id VARCHAR(50),
  name_en VARCHAR(100) NOT NULL,
  name_he VARCHAR(100) NOT NULL,
  flag_emoji VARCHAR(10),
  group_letter VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venues table
CREATE TABLE venues (
  id SERIAL PRIMARY KEY,
  api_id VARCHAR(50),
  name_he VARCHAR(200) NOT NULL,
  city_he VARCHAR(100) NOT NULL,
  country_he VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels table
CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  name_he VARCHAR(100) NOT NULL,
  logo_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  api_id VARCHAR(50) UNIQUE,
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  venue_id INTEGER REFERENCES venues(id),
  channel_id INTEGER REFERENCES channels(id),
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  stage VARCHAR(50) NOT NULL DEFAULT 'group', -- group, round_of_32, round_of_16, quarter_final, semi_final, final
  group_letter VARCHAR(2),
  home_score INTEGER,
  away_score INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, live, finished
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions table
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  is_double BOOLEAN DEFAULT FALSE,
  points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- Tournament winner picks
CREATE TABLE tournament_winners (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App settings
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('tournament_started', 'false'),
  ('tournament_ended', 'false'),
  ('admin_pin_hash', '');

-- Seed admin user (PIN: 1708, will be hashed by setup script)
-- INSERT INTO users (username, display_name, pin_hash, is_admin, is_first_login)
-- VALUES ('admin', 'מנהל', '<hashed>', true, false);

-- WC 2026 Teams (48 teams)
INSERT INTO teams (name_en, name_he, flag_emoji, group_letter) VALUES
-- Group A (USA hosts)
('United States', 'ארצות הברית', '🇺🇸', 'A'),
('Panama', 'פנמה', '🇵🇦', 'A'),
('Honduras', 'הונדורס', '🇭🇳', 'A'),
('TBD', 'לא נקבע', '🏳️', 'A'),

-- Group B
('Mexico', 'מקסיקו', '🇲🇽', 'B'),
('TBD', 'לא נקבע', '🏳️', 'B'),
('TBD', 'לא נקבע', '🏳️', 'B'),
('TBD', 'לא נקבע', '🏳️', 'B'),

-- Group C (Canada hosts)
('Canada', 'קנדה', '🇨🇦', 'C'),
('TBD', 'לא נקבע', '🏳️', 'C'),
('TBD', 'לא נקבע', '🏳️', 'C'),
('TBD', 'לא נקבע', '🏳️', 'C'),

-- Group D
('Argentina', 'ארגנטינה', '🇦🇷', 'D'),
('Chile', 'צ''ילה', '🇨🇱', 'D'),
('Peru', 'פרו', '🇵🇪', 'D'),
('TBD', 'לא נקבע', '🏳️', 'D'),

-- Group E
('Spain', 'ספרד', '🇪🇸', 'E'),
('Morocco', 'מרוקו', '🇲🇦', 'E'),
('TBD', 'לא נקבע', '🏳️', 'E'),
('TBD', 'לא נקבע', '🏳️', 'E'),

-- Group F
('Germany', 'גרמניה', '🇩🇪', 'F'),
('Japan', 'יפן', '🇯🇵', 'F'),
('TBD', 'לא נקבע', '🏳️', 'F'),
('TBD', 'לא נקבע', '🏳️', 'F'),

-- Group G
('Brazil', 'ברזיל', '🇧🇷', 'G'),
('Colombia', 'קולומביה', '🇨🇴', 'G'),
('Ecuador', 'אקוודור', '🇪🇨', 'G'),
('TBD', 'לא נקבע', '🏳️', 'G'),

-- Group H
('Portugal', 'פורטוגל', '🇵🇹', 'H'),
('France', 'צרפת', '🇫🇷', 'H'),
('TBD', 'לא נקבע', '🏳️', 'H'),
('TBD', 'לא נקבע', '🏳️', 'H'),

-- Group I
('England', 'אנגליה', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'I'),
('Netherlands', 'הולנד', '🇳🇱', 'I'),
('TBD', 'לא נקבע', '🏳️', 'I'),
('TBD', 'לא נקבע', '🏳️', 'I'),

-- Group J
('Uruguay', 'אורוגוואי', '🇺🇾', 'J'),
('Belgium', 'בלגיה', '🇧🇪', 'J'),
('TBD', 'לא נקבע', '🏳️', 'J'),
('TBD', 'לא נקבע', '🏳️', 'J'),

-- Group K
('Croatia', 'קרואטיה', '🇭🇷', 'K'),
('Turkey', 'טורקיה', '🇹🇷', 'K'),
('TBD', 'לא נקבע', '🏳️', 'K'),
('TBD', 'לא נקבע', '🏳️', 'K'),

-- Group L
('Australia', 'אוסטרליה', '🇦🇺', 'L'),
('South Korea', 'קוריאה הדרומית', '🇰🇷', 'L'),
('Saudi Arabia', 'ערב הסעודית', '🇸🇦', 'L'),
('TBD', 'לא נקבע', '🏳️', 'L');

-- Default venues (USA/Canada/Mexico host cities)
INSERT INTO venues (name_he, city_he, country_he) VALUES
('אצטדיון SoFi', 'לוס אנג''לס', 'ארצות הברית'),
('אצטדיון MetLife', 'ניו יורק / ניו ג''רזי', 'ארצות הברית'),
('אצטדיון AT&T', 'דאלאס', 'ארצות הברית'),
('אצטדיון Arrowhead', 'קנזס סיטי', 'ארצות הברית'),
('אצטדיון Levi''s', 'סן פרנסיסקו', 'ארצות הברית'),
('אצטדיון Lincoln Financial', 'פילדלפיה', 'ארצות הברית'),
('אצטדיון Hard Rock', 'מיאמי', 'ארצות הברית'),
('אצטדיון NRG', 'יוסטון', 'ארצות הברית'),
('אצטדיון Gillette', 'בוסטון', 'ארצות הברית'),
('אצטדיון Seattle', 'סיאטל', 'ארצות הברית'),
('BMO Field', 'טורונטו', 'קנדה'),
('BC Place', 'ונקובר', 'קנדה'),
('אצטדיון Azteca', 'מקסיקו סיטי', 'מקסיקו'),
('אצטדיון Akron', 'גואדלחארה', 'מקסיקו'),
('אצטדיון BBVA', 'מונטריי', 'מקסיקו');
