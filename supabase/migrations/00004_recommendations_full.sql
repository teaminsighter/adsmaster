-- Migration: Add missing columns to recommendations table for full API support
-- ============================================================================

-- Add missing columns to recommendations table
ALTER TABLE recommendations
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50), -- 'keyword', 'campaign', 'ad_group'
    ADD COLUMN IF NOT EXISTS entity_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS impact_summary TEXT,
    ADD COLUMN IF NOT EXISTS applied_option_id INT,
    ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dismiss_reason TEXT;

-- Create index for organization lookup
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON recommendations(organization_id, status);

-- Add RLS policy for service role bypass (drop if exists, then create)
DROP POLICY IF EXISTS "Service role can manage recommendations" ON recommendations;
CREATE POLICY "Service role can manage recommendations"
    ON recommendations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
