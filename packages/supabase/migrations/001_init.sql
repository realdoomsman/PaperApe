-- PaperApe Database Schema
-- Supabase PostgreSQL Migration

-- ─── Enable Extensions ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ──────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  privy_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL DEFAULT 'Anon Ape',
  avatar_url TEXT,
  paper_balance NUMERIC(20, 9) NOT NULL DEFAULT 100.0, -- SOL with lamport precision
  total_pnl NUMERIC(20, 9) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_privy_id ON users(privy_id);

-- ─── Positions ──────────────────────────────────────────
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL DEFAULT '',
  token_name TEXT NOT NULL DEFAULT '',
  token_image TEXT,
  entry_price NUMERIC(30, 18) NOT NULL,        -- price per token in SOL
  amount_sol NUMERIC(20, 9) NOT NULL,           -- SOL invested
  tokens_bought NUMERIC(30, 9) NOT NULL,        -- total tokens received
  tokens_remaining NUMERIC(30, 9) NOT NULL,     -- tokens still held
  current_price NUMERIC(30, 18) NOT NULL DEFAULT 0,
  current_value NUMERIC(20, 9) NOT NULL DEFAULT 0,
  pnl_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
  pnl_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  is_moon_bag BOOLEAN NOT NULL DEFAULT FALSE,
  is_rugged BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'rugged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_token ON positions(token_address);
CREATE INDEX idx_positions_user_status ON positions(user_id, status);

-- ─── Trades ─────────────────────────────────────────────
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell', 'sell_init')),
  amount_sol NUMERIC(20, 9) NOT NULL,
  amount_tokens NUMERIC(30, 9) NOT NULL,
  execution_price NUMERIC(30, 18) NOT NULL,     -- price after slippage
  market_price NUMERIC(30, 18) NOT NULL,         -- price before slippage
  slippage_applied NUMERIC(8, 4) NOT NULL,       -- percentage
  fee_applied NUMERIC(20, 9) NOT NULL,           -- SOL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_position_id ON trades(position_id);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);

-- ─── Leaderboard Cache ──────────────────────────────────
CREATE TABLE leaderboard_cache (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Anon Ape',
  avatar_url TEXT,
  weekly_pnl NUMERIC(20, 9) NOT NULL DEFAULT 0,
  monthly_pnl NUMERIC(20, 9) NOT NULL DEFAULT 0,
  total_pnl NUMERIC(20, 9) NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_weekly ON leaderboard_cache(weekly_pnl DESC);
CREATE INDEX idx_leaderboard_monthly ON leaderboard_cache(monthly_pnl DESC);

-- ─── Row Level Security ─────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own row
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = privy_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = privy_id);

-- Service role can do everything (for backend API)
CREATE POLICY "Service role full access users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access positions" ON positions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access trades" ON trades
  FOR ALL USING (auth.role() = 'service_role');

-- Users can read their own positions/trades
CREATE POLICY "Users can view own positions" ON positions
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE privy_id = auth.uid()::text));

CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE privy_id = auth.uid()::text));

-- Leaderboard is readable by all authenticated users
CREATE POLICY "Leaderboard readable by all" ON leaderboard_cache
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role full access leaderboard" ON leaderboard_cache
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Realtime ───────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;

-- ─── Updated At Trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leaderboard_updated_at
  BEFORE UPDATE ON leaderboard_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Leaderboard Refresh Function ───────────────────────
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  INSERT INTO leaderboard_cache (user_id, username, avatar_url, weekly_pnl, monthly_pnl, total_pnl, total_trades, win_rate)
  SELECT
    u.id,
    u.username,
    u.avatar_url,
    COALESCE(weekly.pnl, 0) as weekly_pnl,
    COALESCE(monthly.pnl, 0) as monthly_pnl,
    u.total_pnl,
    COALESCE(stats.total_trades, 0) as total_trades,
    COALESCE(stats.win_rate, 0) as win_rate
  FROM users u
  LEFT JOIN (
    SELECT user_id, SUM(pnl_sol) as pnl
    FROM positions
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY user_id
  ) weekly ON weekly.user_id = u.id
  LEFT JOIN (
    SELECT user_id, SUM(pnl_sol) as pnl
    FROM positions
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY user_id
  ) monthly ON monthly.user_id = u.id
  LEFT JOIN (
    SELECT
      user_id,
      COUNT(*) as total_trades,
      ROUND(
        COUNT(*) FILTER (WHERE pnl_sol > 0)::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
      ) as win_rate
    FROM positions
    WHERE status IN ('closed', 'rugged')
    GROUP BY user_id
  ) stats ON stats.user_id = u.id
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    weekly_pnl = EXCLUDED.weekly_pnl,
    monthly_pnl = EXCLUDED.monthly_pnl,
    total_pnl = EXCLUDED.total_pnl,
    total_trades = EXCLUDED.total_trades,
    win_rate = EXCLUDED.win_rate;
END;
$$ LANGUAGE plpgsql;
