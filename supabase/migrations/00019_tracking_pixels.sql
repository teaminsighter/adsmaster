-- Migration: 00019_tracking_pixels.sql
-- Description: Add tracking pixel configurations (Meta Pixel, GA4, Google Ads, TikTok, LinkedIn)
-- Created: 2026-04-13

-- ============================================================================
-- TRACKING PIXELS TABLE
-- Configuration for ad platform pixels and server-side APIs
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracking_pixels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ================================
    -- META (FACEBOOK) PIXEL
    -- ================================
    -- Primary Pixel
    meta_pixel_id VARCHAR(50),              -- e.g., '1234567890'
    meta_access_token TEXT,                 -- Long-lived access token for CAPI
    meta_test_event_code VARCHAR(50),       -- For testing (e.g., 'TEST12345')

    -- Additional Pixels (for agencies managing multiple pixels)
    meta_pixel_id_2 VARCHAR(50),
    meta_pixel_id_3 VARCHAR(50),

    -- Meta Settings
    enable_meta_pixel BOOLEAN DEFAULT false,
    enable_meta_capi BOOLEAN DEFAULT false,  -- Conversions API
    meta_capi_dedup BOOLEAN DEFAULT true,    -- Deduplicate browser + server events

    -- ================================
    -- GOOGLE ANALYTICS 4
    -- ================================
    ga4_measurement_id VARCHAR(50),         -- e.g., 'G-XXXXXXXXXX'
    ga4_api_secret VARCHAR(100),            -- For Measurement Protocol (server-side)

    enable_ga4 BOOLEAN DEFAULT false,
    enable_ga4_server_side BOOLEAN DEFAULT false,

    -- ================================
    -- GOOGLE ADS
    -- ================================
    google_ads_id VARCHAR(50),              -- e.g., 'AW-1234567890'
    google_ads_conversion_label VARCHAR(100),  -- Default conversion label

    -- Per-event conversion labels
    google_ads_labels JSONB DEFAULT '{
        "lead": null,
        "purchase": null,
        "signup": null,
        "add_to_cart": null,
        "initiate_checkout": null,
        "contact": null
    }',

    enable_google_ads BOOLEAN DEFAULT false,
    enable_google_enhanced_conversions BOOLEAN DEFAULT true,

    -- ================================
    -- TIKTOK PIXEL
    -- ================================
    tiktok_pixel_id VARCHAR(50),
    tiktok_access_token TEXT,               -- For Events API (server-side)

    enable_tiktok BOOLEAN DEFAULT false,
    enable_tiktok_server_side BOOLEAN DEFAULT false,

    -- ================================
    -- LINKEDIN INSIGHT TAG
    -- ================================
    linkedin_partner_id VARCHAR(50),
    linkedin_conversion_ids JSONB DEFAULT '{}',  -- {event_type: conversion_id}

    enable_linkedin BOOLEAN DEFAULT false,

    -- ================================
    -- PINTEREST TAG
    -- ================================
    pinterest_tag_id VARCHAR(50),
    pinterest_access_token TEXT,

    enable_pinterest BOOLEAN DEFAULT false,

    -- ================================
    -- MICROSOFT ADS (UET TAG)
    -- ================================
    microsoft_uet_id VARCHAR(50),           -- UET Tag ID
    microsoft_conversion_goals JSONB DEFAULT '{}',  -- {event_type: goal_id}

    enable_microsoft BOOLEAN DEFAULT false,

    -- ================================
    -- EVENT MAPPING
    -- ================================
    -- Map internal event types to platform-specific events
    event_mapping JSONB DEFAULT '{
        "lead": {"meta": "Lead", "ga4": "generate_lead", "google_ads": true, "tiktok": "SubmitForm"},
        "purchase": {"meta": "Purchase", "ga4": "purchase", "google_ads": true, "tiktok": "CompletePayment"},
        "signup": {"meta": "CompleteRegistration", "ga4": "sign_up", "google_ads": true, "tiktok": "CompleteRegistration"},
        "add_to_cart": {"meta": "AddToCart", "ga4": "add_to_cart", "google_ads": false, "tiktok": "AddToCart"},
        "initiate_checkout": {"meta": "InitiateCheckout", "ga4": "begin_checkout", "google_ads": false, "tiktok": "InitiateCheckout"},
        "contact": {"meta": "Contact", "ga4": "contact", "google_ads": true, "tiktok": "Contact"},
        "phone_call": {"meta": "Contact", "ga4": "contact", "google_ads": true, "tiktok": "Contact"},
        "form_submit": {"meta": "Lead", "ga4": "generate_lead", "google_ads": true, "tiktok": "SubmitForm"},
        "page_view": {"meta": "PageView", "ga4": "page_view", "google_ads": false, "tiktok": "ViewContent"},
        "view_content": {"meta": "ViewContent", "ga4": "view_item", "google_ads": false, "tiktok": "ViewContent"},
        "search": {"meta": "Search", "ga4": "search", "google_ads": false, "tiktok": "Search"},
        "add_payment_info": {"meta": "AddPaymentInfo", "ga4": "add_payment_info", "google_ads": false, "tiktok": "AddPaymentInfo"},
        "subscribe": {"meta": "Subscribe", "ga4": "sign_up", "google_ads": true, "tiktok": "Subscribe"}
    }',

    -- ================================
    -- SITE CONFIGURATION
    -- ================================
    -- Site type determines default event capture behavior
    site_type VARCHAR(50) DEFAULT 'leadgen',  -- leadgen, ecommerce, ecommerce_leadgen, saas
    ecommerce_platform VARCHAR(50),           -- woocommerce, shopify, magento, bigcommerce, custom

    -- ================================
    -- ADVANCED SETTINGS
    -- ================================
    -- Privacy & Consent
    respect_dnt BOOLEAN DEFAULT false,        -- Respect Do Not Track header
    require_consent BOOLEAN DEFAULT false,    -- Require cookie consent before tracking
    consent_mode VARCHAR(20) DEFAULT 'granted',  -- granted, denied, pending

    -- Data Enhancement
    enhanced_conversions BOOLEAN DEFAULT true,  -- Send hashed PII for better matching
    auto_capture_forms BOOLEAN DEFAULT true,    -- Auto-capture form submissions
    auto_capture_clicks BOOLEAN DEFAULT true,   -- Auto-capture button/link clicks
    auto_capture_ecommerce BOOLEAN DEFAULT true,  -- Auto-capture dataLayer events

    -- Debug
    debug_mode BOOLEAN DEFAULT false,           -- Console log all pixel fires

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One config per organization
    CONSTRAINT tracking_pixels_org_unique UNIQUE(organization_id)
);

-- Indexes
CREATE INDEX idx_tracking_pixels_org_id ON tracking_pixels(organization_id);

-- Enable RLS
ALTER TABLE tracking_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY tracking_pixels_org_policy ON tracking_pixels
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- PIXEL FIRE LOGS TABLE
-- Debug log of pixel fires (optional, for debugging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pixel_fire_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Event Info
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255),
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,

    -- Pixels Fired
    platforms_fired JSONB DEFAULT '[]',     -- ['meta', 'ga4', 'google_ads']

    -- Request/Response (for debugging)
    request_payload JSONB,
    response_status INTEGER,
    response_body TEXT,

    -- Status
    status VARCHAR(20) NOT NULL,            -- success, partial, failed
    error_message TEXT,

    -- Timing
    fired_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER
);

-- Indexes
CREATE INDEX idx_pixel_fire_logs_org_id ON pixel_fire_logs(organization_id);
CREATE INDEX idx_pixel_fire_logs_fired_at ON pixel_fire_logs(fired_at DESC);
CREATE INDEX idx_pixel_fire_logs_status ON pixel_fire_logs(status);

-- Retention: Auto-delete after 7 days (should be done via cron job)
COMMENT ON TABLE pixel_fire_logs IS 'Debug log of pixel fires. Retain for 7 days maximum.';

-- Enable RLS
ALTER TABLE pixel_fire_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pixel_fire_logs_org_policy ON pixel_fire_logs
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE tracking_pixels IS 'Configuration for all tracking pixels (Meta, GA4, Google Ads, TikTok, LinkedIn, Microsoft).';
COMMENT ON COLUMN tracking_pixels.meta_access_token IS 'Long-lived access token for Meta Conversions API. Refresh every 60 days.';
COMMENT ON COLUMN tracking_pixels.event_mapping IS 'Maps internal event types to platform-specific event names.';
COMMENT ON COLUMN tracking_pixels.site_type IS 'leadgen: forms/clicks, ecommerce: purchases/carts, ecommerce_leadgen: both, saas: trials/signups';
COMMENT ON COLUMN tracking_pixels.enhanced_conversions IS 'Send hashed PII (email, phone) for better cross-device attribution.';
