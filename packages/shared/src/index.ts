export interface Sport {
  id: string;
  name: string;
  slug: string;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  sport_id: string;
}

export interface Prop {
  id: string;
  player: Player;
  sport: Sport;
  stat_category: string;
  line_value: number;
  game_date: string;
  created_at: string;
}

export interface OddsLine {
  id: string;
  prop_id: string;
  bookmaker: string;
  line_value: number;
  over_odds: number;
  under_odds: number;
  recorded_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export type PickSelection = 'over' | 'under';

export type PickOutcome = 'hit' | 'miss' | 'pending';

export interface Pick {
  id: string;
  user_id: string;
  prop_id: string;
  selection: PickSelection;
  line_at_pick: number;
  confidence: 1 | 2 | 3 | 4 | 5;
  outcome: PickOutcome;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}
