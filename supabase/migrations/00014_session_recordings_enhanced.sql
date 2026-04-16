-- Migration: 00014_session_recordings_enhanced.sql
-- Description: Enhance session recordings with rrweb-specific fields and analytics
-- Created: 2026-04-13

-- ============================================================================
-- ENHANCE SESSION RECORDINGS TABLE
-- Add rrweb-specific fields for better session analysis
-- ============================================================================

-- Add new columns to session_recordings
ALTER TABLE session_recordings
ADD COLUMN IF NOT EXISTS page_url TEXT,
ADD COLUMN IF NOT EXISTS page_title VARCHAR(500),
ADD COLUMN IF NOT EXISTS browser VARCHAR(100),
ADD COLUMN IF NOT EXISTS os VARCHAR(100),
ADD COLUMN IF NOT EXISTS screen_width INTEGER,
ADD COLUMN IF NOT EXISTS screen_height INTEGER,
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS rage_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dead_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS console_errors JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS has_conversion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_session_rec_email ON session_recordings(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_rec_has_conversion ON session_recordings(has_conversion) WHERE has_conversion = true;
CREATE INDEX IF NOT EXISTS idx_session_rec_is_starred ON session_recordings(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_session_rec_rage_clicks ON session_recordings(rage_clicks DESC) WHERE rage_clicks > 0;

-- ============================================================================
-- SESSION RECORDING EVENTS TABLE
-- For storing large recordings in chunks (better performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recording_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES session_recordings(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    events JSONB NOT NULL,
    events_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT session_recording_chunks_unique UNIQUE(recording_id, chunk_index)
);

CREATE INDEX idx_session_chunks_recording_id ON session_recording_chunks(recording_id);

-- Enable RLS
ALTER TABLE session_recording_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_recording_chunks_policy ON session_recording_chunks
    FOR ALL USING (recording_id IN (
        SELECT id FROM session_recordings WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- SESSION RECORDING MARKERS TABLE
-- For marking specific moments in recordings (conversions, errors, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recording_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES session_recordings(id) ON DELETE CASCADE,

    -- Marker Info
    marker_type VARCHAR(50) NOT NULL,  -- conversion, error, rage_click, dead_click, form_submit, custom
    label VARCHAR(255),
    timestamp_ms INTEGER NOT NULL,     -- Milliseconds from recording start

    -- Associated data
    event_data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_markers_recording_id ON session_recording_markers(recording_id);
CREATE INDEX idx_session_markers_type ON session_recording_markers(marker_type);

-- Enable RLS
ALTER TABLE session_recording_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_recording_markers_policy ON session_recording_markers
    FOR ALL USING (recording_id IN (
        SELECT id FROM session_recordings WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- RECORDING SETTINGS TABLE
-- Per-org settings for session recording
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recording_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Recording Settings
    is_enabled BOOLEAN DEFAULT true,
    sample_rate INTEGER DEFAULT 100,            -- Percentage of sessions to record (1-100)
    max_duration_seconds INTEGER DEFAULT 1800,  -- 30 minutes default

    -- Privacy Settings
    mask_all_inputs BOOLEAN DEFAULT true,
    mask_text_content BOOLEAN DEFAULT false,
    block_selectors JSONB DEFAULT '[]',         -- CSS selectors to block

    -- Capture Settings
    capture_console BOOLEAN DEFAULT true,
    capture_network BOOLEAN DEFAULT false,
    capture_mouse_moves BOOLEAN DEFAULT true,

    -- Retention
    retention_days INTEGER DEFAULT 30,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT session_recording_settings_org_unique UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE session_recording_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_recording_settings_policy ON session_recording_settings
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE session_recording_chunks IS 'Stores large session recordings in chunks for better performance. Each chunk contains a subset of rrweb events.';
COMMENT ON TABLE session_recording_markers IS 'Marks specific moments in session recordings for quick navigation (conversions, errors, rage clicks).';
COMMENT ON TABLE session_recording_settings IS 'Per-organization settings for session recording behavior and privacy.';
COMMENT ON COLUMN session_recordings.rage_clicks IS 'Count of rapid repeated clicks on same element (indicates user frustration).';
COMMENT ON COLUMN session_recordings.dead_clicks IS 'Count of clicks that had no effect (on non-interactive elements).';
