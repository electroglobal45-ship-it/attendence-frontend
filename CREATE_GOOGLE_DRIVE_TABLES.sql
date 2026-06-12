-- ═══════════════════════════════════════════════════════════
-- Google Drive Integration - Database Schema
-- ═══════════════════════════════════════════════════════════

-- Table 1: Store Google OAuth tokens per user
CREATE TABLE IF NOT EXISTS google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  google_email VARCHAR(255), -- User's Google account email
  scope TEXT, -- OAuth scopes granted
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_google_drive_tokens_user_id ON google_drive_tokens(user_id);
CREATE INDEX idx_google_drive_tokens_expiry ON google_drive_tokens(token_expiry);

-- Table 2: Track private file shares (ONLY sender and receiver can see)
CREATE TABLE IF NOT EXISTS drive_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- File information
  file_id VARCHAR(255) NOT NULL, -- Google Drive file ID
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(100), -- MIME type
  file_size BIGINT, -- Size in bytes
  file_url TEXT, -- Google Drive web view URL
  thumbnail_url TEXT, -- Preview thumbnail
  
  -- Sharing details
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(20) DEFAULT 'reader', -- reader, commenter, writer
  
  -- Privacy & tracking
  message TEXT, -- Optional message when sharing
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  is_folder BOOLEAN DEFAULT FALSE,
  parent_folder_id VARCHAR(255), -- For organization
  
  -- Ensure one share per file per user pair
  UNIQUE(file_id, shared_by, shared_with)
);

-- Indexes for fast queries
CREATE INDEX idx_drive_shares_shared_with ON drive_shares(shared_with);
CREATE INDEX idx_drive_shares_shared_by ON drive_shares(shared_by);
CREATE INDEX idx_drive_shares_file_id ON drive_shares(file_id);
CREATE INDEX idx_drive_shares_viewed ON drive_shares(viewed);

-- Table 3: Track user's Drive activity (optional - for analytics)
CREATE TABLE IF NOT EXISTS drive_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- upload, download, share, delete, view
  file_id VARCHAR(255),
  file_name VARCHAR(500),
  details JSONB, -- Additional action details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_drive_activity_user_id ON drive_activity(user_id);
CREATE INDEX idx_drive_activity_created_at ON drive_activity(created_at DESC);
CREATE INDEX idx_drive_activity_action ON drive_activity(action);

-- Comments for documentation
COMMENT ON TABLE google_drive_tokens IS 'Stores OAuth tokens for Google Drive integration per user';
COMMENT ON TABLE drive_shares IS 'Tracks private file sharing between employees (only sender and receiver can see)';
COMMENT ON TABLE drive_activity IS 'Logs Drive actions for analytics and audit trail';

COMMENT ON COLUMN drive_shares.permission IS 'reader (view/download), commenter (view/comment), writer (view/edit)';
COMMENT ON COLUMN google_drive_tokens.token_expiry IS 'When access token expires (typically 1 hour)';

-- ═══════════════════════════════════════════════════════════
-- Run this SQL in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════
