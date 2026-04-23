-- Codence initial schema migration
-- Source of truth: src/server/lib/schema.ts

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT,
  preferences TEXT,
  active_learnspace_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learnspaces (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  config TEXT,
  active_tag TEXT,
  interview_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY NOT NULL,
  learnspace_id TEXT NOT NULL REFERENCES learnspaces(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  learnspace_id TEXT NOT NULL REFERENCES learnspaces(id),
  title TEXT NOT NULL,
  content TEXT,
  skill_ids TEXT,
  tags TEXT,
  difficulty TEXT NOT NULL,
  source TEXT NOT NULL,
  parent_item_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  learnspace_id TEXT NOT NULL REFERENCES learnspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  status TEXT NOT NULL,
  current_step TEXT,
  step_interactions TEXT,
  messages TEXT,
  coach_runtime_state TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY NOT NULL,
  learnspace_id TEXT NOT NULL REFERENCES learnspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  session_id TEXT REFERENCES sessions(id),
  outcome TEXT,
  work_snapshot TEXT,
  test_results TEXT,
  llm_evaluation TEXT,
  coaching_metadata TEXT,
  attempt_features TEXT,
  disputed INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS queue (
  id TEXT PRIMARY KEY NOT NULL,
  learnspace_id TEXT NOT NULL REFERENCES learnspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  skill_id TEXT NOT NULL REFERENCES skills(id),
  interval_days REAL NOT NULL,
  ease_factor REAL NOT NULL,
  due_date TEXT,
  round INTEGER NOT NULL DEFAULT 0,
  last_outcome TEXT,
  skip_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_confidence (
  learnspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0.0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  clean_solves INTEGER NOT NULL DEFAULT 0,
  assisted_solves INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TEXT,
  trend TEXT,
  PRIMARY KEY (learnspace_id, user_id, skill_id)
);
