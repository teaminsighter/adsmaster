-- =====================================================
-- Migration: 00022_domains_cname.sql
-- Description: First-party domains with CNAME verification
-- =====================================================

-- First-party domains for tracking (bypass ad blockers)
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Domain configuration
    domain VARCHAR(255) NOT NULL,              -- e.g., "track.example.com"
    root_domain VARCHAR(255) NOT NULL,         -- e.g., "example.com"
    subdomain VARCHAR(100) NOT NULL,           -- e.g., "track"

    -- Verification
    verification_code VARCHAR(64) NOT NULL,    -- Random code for TXT record verification
    cname_target VARCHAR(255) NOT NULL,        -- Our CNAME target, e.g., "cname.adsmaster.io"

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, verifying, verified, failed, expired
    verification_method VARCHAR(20) NOT NULL DEFAULT 'cname',  -- cname, txt, http

    -- SSL/TLS
    ssl_status VARCHAR(20) DEFAULT 'pending',  -- pending, provisioning, active, failed
    ssl_certificate_id VARCHAR(100),           -- Reference to SSL cert (e.g., Cloudflare cert ID)
    ssl_expires_at TIMESTAMPTZ,

    -- Verification attempts
    last_verification_attempt TIMESTAMPTZ,
    verification_attempts INT DEFAULT 0,
    last_verification_error TEXT,
    verified_at TIMESTAMPTZ,

    -- Usage tracking
    is_active BOOLEAN DEFAULT false,           -- Only verified domains can be active
    request_count BIGINT DEFAULT 0,            -- Total requests through this domain
    last_request_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT domains_domain_unique UNIQUE (domain),
    CONSTRAINT domains_status_check CHECK (status IN ('pending', 'verifying', 'verified', 'failed', 'expired')),
    CONSTRAINT domains_ssl_status_check CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')),
    CONSTRAINT domains_verification_method_check CHECK (verification_method IN ('cname', 'txt', 'http'))
);

-- Indexes for domains
CREATE INDEX IF NOT EXISTS idx_domains_org ON domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_root_domain ON domains(root_domain);
CREATE INDEX IF NOT EXISTS idx_domains_verification_code ON domains(verification_code);

-- Domain verification history
CREATE TABLE IF NOT EXISTS domain_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,

    -- Verification details
    verification_type VARCHAR(20) NOT NULL,    -- cname, txt, http
    status VARCHAR(20) NOT NULL,               -- success, failed, timeout

    -- DNS records found
    dns_records JSONB,                         -- Array of DNS records checked
    expected_value VARCHAR(500),
    actual_value VARCHAR(500),

    -- Error details
    error_code VARCHAR(50),
    error_message TEXT,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_domain ON domain_verification_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_status ON domain_verification_logs(status);
CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_created ON domain_verification_logs(created_at DESC);

-- Domain DNS configuration templates
CREATE TABLE IF NOT EXISTS domain_dns_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template info
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,             -- cloudflare, godaddy, namecheap, route53, etc.

    -- Instructions
    instructions JSONB NOT NULL,               -- Step-by-step setup instructions
    example_records JSONB NOT NULL,            -- Example DNS records

    -- Provider-specific
    provider_docs_url VARCHAR(500),
    estimated_propagation_minutes INT DEFAULT 60,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common DNS provider templates
INSERT INTO domain_dns_templates (name, provider, instructions, example_records, provider_docs_url, estimated_propagation_minutes) VALUES
('Cloudflare', 'cloudflare',
 '[
   {"step": 1, "title": "Log in to Cloudflare", "description": "Go to dash.cloudflare.com and select your domain"},
   {"step": 2, "title": "Go to DNS settings", "description": "Click on DNS in the left sidebar"},
   {"step": 3, "title": "Add CNAME record", "description": "Click Add Record, select CNAME type"},
   {"step": 4, "title": "Configure the record", "description": "Set Name to your subdomain and Target to our CNAME target"},
   {"step": 5, "title": "Disable proxy (important)", "description": "Click the orange cloud to turn it gray (DNS only)"},
   {"step": 6, "title": "Save", "description": "Click Save to add the record"}
 ]'::jsonb,
 '{"type": "CNAME", "name": "track", "target": "cname.adsmaster.io", "ttl": "Auto", "proxy": false}'::jsonb,
 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
 5
),
('GoDaddy', 'godaddy',
 '[
   {"step": 1, "title": "Log in to GoDaddy", "description": "Go to godaddy.com and sign in to your account"},
   {"step": 2, "title": "Go to DNS Management", "description": "Click My Products, then DNS next to your domain"},
   {"step": 3, "title": "Add CNAME record", "description": "Scroll to Records section and click Add"},
   {"step": 4, "title": "Configure the record", "description": "Select CNAME, enter your subdomain as Host and our target as Points to"},
   {"step": 5, "title": "Save", "description": "Click Save to add the record"}
 ]'::jsonb,
 '{"type": "CNAME", "host": "track", "points_to": "cname.adsmaster.io", "ttl": "1 Hour"}'::jsonb,
 'https://www.godaddy.com/help/add-a-cname-record-19236',
 60
),
('Namecheap', 'namecheap',
 '[
   {"step": 1, "title": "Log in to Namecheap", "description": "Go to namecheap.com and sign in"},
   {"step": 2, "title": "Go to Domain List", "description": "Click Domain List in the left sidebar"},
   {"step": 3, "title": "Manage DNS", "description": "Click Manage next to your domain, then Advanced DNS"},
   {"step": 4, "title": "Add CNAME record", "description": "Click Add New Record, select CNAME"},
   {"step": 5, "title": "Configure the record", "description": "Enter subdomain as Host and our target as Target"},
   {"step": 6, "title": "Save", "description": "Click the checkmark to save"}
 ]'::jsonb,
 '{"type": "CNAME", "host": "track", "target": "cname.adsmaster.io", "ttl": "Automatic"}'::jsonb,
 'https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/',
 30
),
('AWS Route 53', 'route53',
 '[
   {"step": 1, "title": "Open Route 53 Console", "description": "Go to AWS Console and navigate to Route 53"},
   {"step": 2, "title": "Select Hosted Zone", "description": "Click Hosted zones, then select your domain"},
   {"step": 3, "title": "Create Record", "description": "Click Create record"},
   {"step": 4, "title": "Configure CNAME", "description": "Enter subdomain, select CNAME, enter our target"},
   {"step": 5, "title": "Create", "description": "Click Create records"}
 ]'::jsonb,
 '{"type": "CNAME", "record_name": "track.example.com", "value": "cname.adsmaster.io", "ttl": 300}'::jsonb,
 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html',
 60
),
('Google Domains / Cloud DNS', 'google',
 '[
   {"step": 1, "title": "Open Google Domains", "description": "Go to domains.google.com and select your domain"},
   {"step": 2, "title": "Go to DNS", "description": "Click DNS in the left menu"},
   {"step": 3, "title": "Manage custom records", "description": "Scroll to Custom records section"},
   {"step": 4, "title": "Create CNAME", "description": "Click Manage custom records, then Create new record"},
   {"step": 5, "title": "Configure", "description": "Enter subdomain, select CNAME, enter our target"},
   {"step": 6, "title": "Save", "description": "Click Save"}
 ]'::jsonb,
 '{"type": "CNAME", "host_name": "track", "data": "cname.adsmaster.io", "ttl": "1H"}'::jsonb,
 'https://support.google.com/domains/answer/3290350',
 60
),
('Other / Generic', 'other',
 '[
   {"step": 1, "title": "Access DNS settings", "description": "Log in to your domain registrar or DNS provider"},
   {"step": 2, "title": "Find DNS management", "description": "Look for DNS, Zone Editor, or DNS Management"},
   {"step": 3, "title": "Add a new record", "description": "Find the option to add a new DNS record"},
   {"step": 4, "title": "Select CNAME type", "description": "Choose CNAME as the record type"},
   {"step": 5, "title": "Enter subdomain", "description": "In the Name/Host field, enter your chosen subdomain (e.g., track)"},
   {"step": 6, "title": "Enter target", "description": "In the Value/Target field, enter our CNAME target"},
   {"step": 7, "title": "Save", "description": "Save the record and wait for DNS propagation"}
 ]'::jsonb,
 '{"type": "CNAME", "name": "[subdomain]", "value": "cname.adsmaster.io", "ttl": "3600 or Auto"}'::jsonb,
 null,
 120
)
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domains
CREATE POLICY "domains_org_isolation" ON domains
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- RLS Policies for verification logs
CREATE POLICY "domain_verification_logs_org_isolation" ON domain_verification_logs
    FOR ALL USING (
        domain_id IN (
            SELECT id FROM domains WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Function to generate verification code
CREATE OR REPLACE FUNCTION generate_domain_verification_code()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to extract root domain and subdomain
CREATE OR REPLACE FUNCTION parse_domain(full_domain VARCHAR)
RETURNS TABLE(root_domain VARCHAR, subdomain VARCHAR) AS $$
DECLARE
    parts TEXT[];
    num_parts INT;
BEGIN
    parts := string_to_array(full_domain, '.');
    num_parts := array_length(parts, 1);

    IF num_parts <= 2 THEN
        -- e.g., "example.com" -> root: "example.com", subdomain: ""
        RETURN QUERY SELECT full_domain::VARCHAR, ''::VARCHAR;
    ELSE
        -- e.g., "track.example.com" -> root: "example.com", subdomain: "track"
        RETURN QUERY SELECT
            (parts[num_parts - 1] || '.' || parts[num_parts])::VARCHAR,
            array_to_string(parts[1:num_parts-2], '.')::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domains_updated_at_trigger
    BEFORE UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION update_domains_updated_at();

-- Add domain limit to subscription tiers (reference comment)
-- Free: 0 domains
-- Starter: 0 domains
-- Growth: 1 domain
-- Agency: 5 domains
-- Enterprise: Unlimited

COMMENT ON TABLE domains IS 'First-party tracking domains with CNAME verification for bypassing ad blockers';
COMMENT ON TABLE domain_verification_logs IS 'History of domain verification attempts';
COMMENT ON TABLE domain_dns_templates IS 'DNS setup instructions for common providers';
