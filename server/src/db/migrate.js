require('dotenv').config()
const db = require('./index')

const SQL = `

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (self-referential for reports_to)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','ceo','director','staff')),
  title VARCHAR(150),
  team_id INTEGER REFERENCES teams(id),
  reports_to INTEGER REFERENCES users(id),
  part_time BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BHAG (org-level big goal — single active row)
CREATE TABLE IF NOT EXISTS bhag (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_value NUMERIC,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC,
  as_of_date DATE,
  last_updated_by INTEGER REFERENCES users(id),
  external_source VARCHAR(50),
  is_manual_override BOOLEAN DEFAULT FALSE,
  manual_override_by INTEGER REFERENCES users(id),
  manual_override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BHAG value history
CREATE TABLE IF NOT EXISTS bhag_history (
  id SERIAL PRIMARY KEY,
  bhag_id INTEGER NOT NULL REFERENCES bhag(id),
  value NUMERIC NOT NULL,
  source VARCHAR(20) DEFAULT 'api' CHECK (source IN ('api','manual')),
  recorded_by INTEGER REFERENCES users(id),
  note TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team WIGs
CREATE TABLE IF NOT EXISTS wigs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  team_id INTEGER REFERENCES teams(id),
  wig_type VARCHAR(20) DEFAULT 'numeric' CHECK (wig_type IN ('numeric','percentage','milestone')),
  start_value NUMERIC,
  target_value NUMERIC,
  current_value NUMERIC,
  milestone_status VARCHAR(20) CHECK (milestone_status IN ('not_started','in_progress','achieved')),
  as_of_date DATE,
  last_updated_by INTEGER REFERENCES users(id),
  external_source VARCHAR(50),
  is_manual_override BOOLEAN DEFAULT FALSE,
  manual_override_by INTEGER REFERENCES users(id),
  manual_override_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WIG value history
CREATE TABLE IF NOT EXISTS wig_history (
  id SERIAL PRIMARY KEY,
  wig_id INTEGER NOT NULL REFERENCES wigs(id),
  value NUMERIC,
  milestone_status VARCHAR(20),
  source VARCHAR(20) DEFAULT 'api' CHECK (source IN ('api','manual')),
  recorded_by INTEGER REFERENCES users(id),
  note TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Measures
CREATE TABLE IF NOT EXISTS lead_measures (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  wig_id INTEGER REFERENCES wigs(id),
  team_id INTEGER REFERENCES teams(id),
  frequency VARCHAR(20) DEFAULT 'weekly',
  status_type VARCHAR(20) DEFAULT 'text' CHECK (status_type IN ('numeric','text','boolean')),
  active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead measure weekly entries
CREATE TABLE IF NOT EXISTS lead_measure_entries (
  id SERIAL PRIMARY KEY,
  lead_measure_id INTEGER NOT NULL REFERENCES lead_measures(id),
  week_start DATE NOT NULL,
  value_numeric NUMERIC,
  value_text TEXT,
  value_boolean BOOLEAN,
  notes TEXT,
  submitted_by INTEGER REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_measure_id, week_start)
);

-- To-Dos
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  due_date DATE,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  team_id INTEGER REFERENCES teams(id),
  wig_id INTEGER REFERENCES wigs(id),
  meeting_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues (IDS workflow)
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  logged_by INTEGER REFERENCES users(id),
  team_id INTEGER REFERENCES teams(id),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_discussion','resolved')),
  stage VARCHAR(20) DEFAULT 'identify' CHECK (stage IN ('identify','discuss','solve')),
  identify_notes TEXT,
  discuss_notes TEXT,
  solve_notes TEXT,
  resolution_notes TEXT,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  meeting_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id),
  type VARCHAR(20) DEFAULT 'weekly' CHECK (type IN ('weekly','quarterly','annual')),
  title VARCHAR(255),
  scheduled_date TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  agenda JSONB DEFAULT '[]',
  notes TEXT,
  recap JSONB,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting participants
CREATE TABLE IF NOT EXISTS meeting_participants (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(meeting_id, user_id)
);

-- Add FK from todos/issues to meetings (after meetings table exists)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS meeting_id_fk INTEGER REFERENCES meetings(id);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS meeting_id_fk INTEGER REFERENCES meetings(id);

-- Vision document (versioned — each save creates a new row)
CREATE TABLE IF NOT EXISTS vision (
  id SERIAL PRIMARY KEY,
  core_values TEXT,
  core_focus TEXT,
  bhag_text TEXT,
  marketing_strategy TEXT,
  three_year_picture TEXT,
  one_year_plan TEXT,
  quarterly_priorities TEXT,
  version INTEGER DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quarterly Reviews
CREATE TABLE IF NOT EXISTS quarterly_reviews (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES users(id),
  supervisor_id INTEGER NOT NULL REFERENCES users(id),
  quarter VARCHAR(2) NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  year INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','employee_submitted','supervisor_submitted','complete')),
  employee_section JSONB,
  supervisor_section JSONB,
  employee_submitted_at TIMESTAMPTZ,
  supervisor_submitted_at TIMESTAMPTZ,
  employee_signature VARCHAR(255),
  supervisor_signature VARCHAR(255),
  employee_signed_at TIMESTAMPTZ,
  supervisor_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, quarter, year)
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly check-ins
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week_start DATE NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- External integration sync status
CREATE TABLE IF NOT EXISTS integration_status (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) UNIQUE NOT NULL,
  last_successful_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ,
  last_value NUMERIC,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);
CREATE INDEX IF NOT EXISTS idx_wigs_team ON wigs(team_id);
CREATE INDEX IF NOT EXISTS idx_lead_measures_assigned ON lead_measures(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_measures_team ON lead_measures(team_id);
CREATE INDEX IF NOT EXISTS idx_todos_assigned ON todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_issues_team ON issues(team_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_user ON weekly_checkins(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_quarterly_reviews_employee ON quarterly_reviews(employee_id);
`

async function migrate() {
  console.log('Running migrations…')
  await db.query(SQL)
  console.log('Migrations complete.')
}

module.exports = { migrate }

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch((err) => { console.error('Migration failed:', err); process.exit(1) })
}
