-- ============================================================================
-- 001_core_users.sql
-- Core user management: users, organizations, and memberships
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE organization_type AS ENUM ('individual', 'business', 'agency');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Authentication
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- NULL if using OAuth only

    -- Profile
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(50),
    phone_verified BOOLEAN DEFAULT FALSE,

    -- Preferences
    timezone VARCHAR(100) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'en',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',

    -- Notification preferences
    notification_preferences JSONB DEFAULT '{
        "email_weekly_summary": true,
        "email_alerts": true,
        "email_recommendations": true,
        "whatsapp_alerts": false,
        "slack_alerts": false,
        "in_app_sounds": true
    }'::jsonb,

    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE, -- for URLs: app.example.com/org/slug
    type organization_type NOT NULL DEFAULT 'individual',

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7), -- hex color

    -- Contact
    billing_email VARCHAR(255),
    support_email VARCHAR(255),
    website VARCHAR(255),

    -- Address (for invoicing)
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2), -- ISO 3166-1 alpha-2

    -- White-label settings (for agencies)
    white_label_settings JSONB DEFAULT '{
        "enabled": false,
        "custom_domain": null,
        "logo_url": null,
        "favicon_url": null,
        "primary_color": null,
        "secondary_color": null,
        "email_from_name": null,
        "email_from_address": null,
        "hide_powered_by": false
    }'::jsonb,

    -- Settings
    settings JSONB DEFAULT '{
        "default_currency": "USD",
        "default_timezone": "UTC",
        "require_2fa": false,
        "allowed_domains": [],
        "ip_whitelist": []
    }'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================================================

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role
    role member_role NOT NULL DEFAULT 'member',

    -- Invitation
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(organization_id, user_id)
);

-- ============================================================================
-- ORGANIZATION INVITATIONS TABLE
-- ============================================================================

CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Invitation details
    email VARCHAR(255) NOT NULL,
    role member_role NOT NULL DEFAULT 'member',

    -- Token for accepting invitation
    token VARCHAR(255) NOT NULL UNIQUE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, revoked
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER SESSIONS TABLE (for JWT refresh tokens)
-- ============================================================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session info
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB DEFAULT '{}'::jsonb, -- user agent, IP, etc.
    ip_address INET,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_last_activity ON users(last_activity_at DESC);

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE is_active = TRUE;

-- Organization members
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(organization_id, role);

-- Invitations
CREATE INDEX idx_org_invitations_org ON organization_invitations(organization_id);
CREATE INDEX idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX idx_org_invitations_pending ON organization_invitations(organization_id, status)
    WHERE status = 'pending';

-- Sessions
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_invitations_updated_at
    BEFORE UPDATE ON organization_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to create a new organization and set the creator as owner
CREATE OR REPLACE FUNCTION create_organization_with_owner(
    p_user_id UUID,
    p_org_name VARCHAR(255),
    p_org_type organization_type DEFAULT 'individual'
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Create organization
    INSERT INTO organizations (name, type)
    VALUES (p_org_name, p_org_type)
    RETURNING id INTO v_org_id;

    -- Add user as owner
    INSERT INTO organization_members (organization_id, user_id, role, accepted_at)
    VALUES (v_org_id, p_user_id, 'owner', NOW());

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has minimum role in organization
CREATE OR REPLACE FUNCTION user_has_org_role(
    p_user_id UUID,
    p_org_id UUID,
    p_min_role member_role
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role member_role;
    v_role_hierarchy INTEGER;
    v_min_hierarchy INTEGER;
BEGIN
    -- Get user's role
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_org_id
      AND is_active = TRUE;

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Define role hierarchy (higher = more permissions)
    v_role_hierarchy := CASE v_user_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 1
    END;

    v_min_hierarchy := CASE p_min_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 1
    END;

    RETURN v_role_hierarchy >= v_min_hierarchy;
END;
$$ LANGUAGE plpgsql;
