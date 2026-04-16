-- Migration: 00015_products_ecommerce.sql
-- Description: Add products table for e-commerce conversion tracking
-- Created: 2026-04-13

-- ============================================================================
-- PRODUCTS TABLE
-- Individual products/line items within e-commerce conversions
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE CASCADE,

    -- Product Identification
    product_id VARCHAR(255) NOT NULL,       -- External product ID/SKU
    product_name VARCHAR(255),
    sku VARCHAR(100),

    -- Categorization
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),

    -- Pricing (in micros: 1 USD = 1,000,000 micros)
    quantity INTEGER DEFAULT 1,
    unit_price_micros BIGINT,
    total_price_micros BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Additional Info
    image_url TEXT,
    product_url TEXT,
    variant VARCHAR(255),                   -- Size, color, etc.

    -- Custom Data
    custom_data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_org_id ON products(organization_id);
CREATE INDEX idx_products_conversion_id ON products(conversion_id);
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_org_policy ON products
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- PRODUCT CATALOG TABLE
-- Master product catalog for quick lookups and analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Product Info
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255),
    sku VARCHAR(100),

    -- Categorization
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),

    -- Default Pricing
    default_price_micros BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Media
    image_url TEXT,
    product_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Stats (updated by triggers/jobs)
    total_sales INTEGER DEFAULT 0,
    total_revenue_micros BIGINT DEFAULT 0,
    last_sold_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT product_catalog_unique UNIQUE(organization_id, product_id)
);

-- Indexes
CREATE INDEX idx_product_catalog_org_id ON product_catalog(organization_id);
CREATE INDEX idx_product_catalog_category ON product_catalog(category);
CREATE INDEX idx_product_catalog_brand ON product_catalog(brand);
CREATE INDEX idx_product_catalog_total_sales ON product_catalog(total_sales DESC);

-- Enable RLS
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_catalog_org_policy ON product_catalog
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- UPDATE PRODUCT CATALOG STATS FUNCTION
-- Auto-updates catalog stats when products are added
-- ============================================================================
CREATE OR REPLACE FUNCTION update_product_catalog_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO product_catalog (
        organization_id,
        product_id,
        product_name,
        sku,
        category,
        subcategory,
        brand,
        default_price_micros,
        currency,
        image_url,
        product_url,
        total_sales,
        total_revenue_micros,
        last_sold_at
    )
    VALUES (
        NEW.organization_id,
        NEW.product_id,
        NEW.product_name,
        NEW.sku,
        NEW.category,
        NEW.subcategory,
        NEW.brand,
        NEW.unit_price_micros,
        NEW.currency,
        NEW.image_url,
        NEW.product_url,
        NEW.quantity,
        COALESCE(NEW.total_price_micros, NEW.unit_price_micros * NEW.quantity),
        NOW()
    )
    ON CONFLICT (organization_id, product_id) DO UPDATE SET
        product_name = COALESCE(EXCLUDED.product_name, product_catalog.product_name),
        category = COALESCE(EXCLUDED.category, product_catalog.category),
        subcategory = COALESCE(EXCLUDED.subcategory, product_catalog.subcategory),
        brand = COALESCE(EXCLUDED.brand, product_catalog.brand),
        total_sales = product_catalog.total_sales + EXCLUDED.total_sales,
        total_revenue_micros = product_catalog.total_revenue_micros + EXCLUDED.total_revenue_micros,
        last_sold_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_catalog
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_catalog_stats();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE products IS 'Individual products/line items within e-commerce conversions. Links to offline_conversions for order-level data.';
COMMENT ON TABLE product_catalog IS 'Master product catalog with aggregated sales stats. Auto-populated from products table.';
COMMENT ON COLUMN products.unit_price_micros IS 'Price per unit in micros (1 USD = 1,000,000 micros).';
COMMENT ON COLUMN products.total_price_micros IS 'Total line item price (quantity * unit_price) in micros.';
