-- ============================================================
-- CORE LOOKUP TABLES
-- ============================================================

CREATE TABLE sports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sport-scoped: 'points' in NBA is distinct from 'points' in NHL
CREATE TABLE stat_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id    UUID NOT NULL REFERENCES sports(id),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sport_id, slug)
);

CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  team        TEXT NOT NULL,
  position    TEXT NOT NULL,
  sport_id    UUID NOT NULL REFERENCES sports(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROPS + ODDS
-- ============================================================

CREATE TABLE props (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID NOT NULL REFERENCES players(id),
  sport_id          UUID NOT NULL REFERENCES sports(id),
  stat_category_id  UUID NOT NULL REFERENCES stat_categories(id),
  line_value        NUMERIC(6, 1) NOT NULL,
  game_date         DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only: one row per bookmaker snapshot, never updated in place
CREATE TABLE odds_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prop_id      UUID NOT NULL REFERENCES props(id),
  bookmaker    TEXT NOT NULL,
  line_value   NUMERIC(6, 1) NOT NULL,
  over_odds    SMALLINT NOT NULL,
  under_odds   SMALLINT NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PICKS
-- ============================================================

CREATE TABLE picks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  prop_id      UUID NOT NULL REFERENCES props(id),
  selection    TEXT NOT NULL CHECK (selection IN ('over', 'under')),
  line_at_pick NUMERIC(6, 1) NOT NULL,
  confidence   SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  outcome      TEXT NOT NULL DEFAULT 'pending'
                 CHECK (outcome IN ('hit', 'miss', 'pending')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX ON stat_categories (sport_id);

CREATE INDEX ON players (sport_id);

CREATE INDEX ON props (player_id);
CREATE INDEX ON props (sport_id);
CREATE INDEX ON props (stat_category_id);
CREATE INDEX ON props (game_date);

CREATE INDEX ON odds_lines (prop_id, recorded_at DESC);
CREATE INDEX ON odds_lines (prop_id, bookmaker, recorded_at DESC);

CREATE INDEX ON picks (user_id);
CREATE INDEX ON picks (prop_id);
CREATE INDEX ON picks (outcome) WHERE outcome = 'pending';
