"""Product Analytics API - E-commerce product performance tracking.

Provides product-level analytics including:
- Top selling products
- Category performance
- Product revenue trends
- Inventory insights (if connected)
- Product attribution
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/analytics/products", tags=["Product Analytics"])


# ============================================================================
# Models
# ============================================================================

class ProductSummary(BaseModel):
    """Product performance summary."""
    product_id: str
    product_name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    quantity_sold: int = 0
    revenue_micros: int = 0
    orders: int = 0
    avg_price_micros: int = 0
    revenue_pct: float = 0.0


class CategorySummary(BaseModel):
    """Category performance summary."""
    category: str
    subcategory: Optional[str] = None
    products_count: int = 0
    quantity_sold: int = 0
    revenue_micros: int = 0
    orders: int = 0
    avg_order_value_micros: int = 0
    top_product: Optional[str] = None


class BrandSummary(BaseModel):
    """Brand performance summary."""
    brand: str
    products_count: int = 0
    quantity_sold: int = 0
    revenue_micros: int = 0
    orders: int = 0
    market_share_pct: float = 0.0


class ProductTrend(BaseModel):
    """Product trend data point."""
    date: str
    product_id: str
    product_name: str
    quantity: int = 0
    revenue_micros: int = 0


class ProductOverview(BaseModel):
    """Product analytics overview."""
    date_from: str
    date_to: str
    total_products_sold: int
    total_quantity: int
    total_revenue_micros: int
    avg_order_value_micros: int
    top_products: List[ProductSummary]
    top_categories: List[CategorySummary]
    top_brands: List[BrandSummary]


class CatalogProduct(BaseModel):
    """Product from catalog."""
    id: str
    product_id: str
    product_name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    default_price_micros: Optional[int] = None
    image_url: Optional[str] = None
    is_active: bool = True
    total_sales: int = 0
    total_revenue_micros: int = 0
    last_sold_at: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

def format_micros(micros: int) -> str:
    """Format micros to currency string."""
    return f"${micros / 1_000_000:,.2f}"


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/overview", response_model=ProductOverview)
async def get_product_overview(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
):
    """Get comprehensive product analytics overview."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get products from sales
    query = supabase.table("products").select(
        "product_id, product_name, sku, category, subcategory, brand, "
        "quantity, total_price_micros, image_url, created_at"
    ).eq("organization_id", org_id).gte(
        "created_at", f"{date_from}T00:00:00Z"
    ).lte("created_at", f"{date_to}T23:59:59Z")

    if category:
        query = query.eq("category", category)
    if brand:
        query = query.eq("brand", brand)

    result = query.execute()
    products_data = result.data or []

    # Aggregate by product
    product_stats: Dict[str, Dict] = defaultdict(lambda: {
        "name": "", "sku": None, "category": None, "brand": None, "image": None,
        "quantity": 0, "revenue": 0, "orders": 0
    })

    category_stats: Dict[str, Dict] = defaultdict(lambda: {
        "subcategory": None, "products": set(), "quantity": 0, "revenue": 0, "orders": 0
    })

    brand_stats: Dict[str, Dict] = defaultdict(lambda: {
        "products": set(), "quantity": 0, "revenue": 0, "orders": 0
    })

    total_revenue = 0
    total_quantity = 0
    order_ids = set()

    for p in products_data:
        pid = p.get("product_id", "unknown")
        qty = p.get("quantity", 1)
        rev = p.get("total_price_micros", 0)

        product_stats[pid]["name"] = p.get("product_name", pid)
        product_stats[pid]["sku"] = p.get("sku")
        product_stats[pid]["category"] = p.get("category")
        product_stats[pid]["brand"] = p.get("brand")
        product_stats[pid]["image"] = p.get("image_url")
        product_stats[pid]["quantity"] += qty
        product_stats[pid]["revenue"] += rev
        product_stats[pid]["orders"] += 1

        cat = p.get("category") or "Uncategorized"
        category_stats[cat]["subcategory"] = p.get("subcategory")
        category_stats[cat]["products"].add(pid)
        category_stats[cat]["quantity"] += qty
        category_stats[cat]["revenue"] += rev
        category_stats[cat]["orders"] += 1

        br = p.get("brand") or "Unknown"
        brand_stats[br]["products"].add(pid)
        brand_stats[br]["quantity"] += qty
        brand_stats[br]["revenue"] += rev
        brand_stats[br]["orders"] += 1

        total_revenue += rev
        total_quantity += qty

    # Build top products
    top_products = []
    for pid, stats in sorted(product_stats.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]:
        top_products.append(ProductSummary(
            product_id=pid,
            product_name=stats["name"],
            sku=stats["sku"],
            category=stats["category"],
            brand=stats["brand"],
            image_url=stats["image"],
            quantity_sold=stats["quantity"],
            revenue_micros=stats["revenue"],
            orders=stats["orders"],
            avg_price_micros=int(stats["revenue"] / stats["quantity"]) if stats["quantity"] > 0 else 0,
            revenue_pct=round(stats["revenue"] / max(total_revenue, 1) * 100, 1),
        ))

    # Build top categories
    top_categories = []
    for cat, stats in sorted(category_stats.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]:
        # Find top product in category
        cat_products = [(pid, product_stats[pid]) for pid in stats["products"]]
        top_prod = max(cat_products, key=lambda x: x[1]["revenue"])[1]["name"] if cat_products else None

        top_categories.append(CategorySummary(
            category=cat,
            subcategory=stats["subcategory"],
            products_count=len(stats["products"]),
            quantity_sold=stats["quantity"],
            revenue_micros=stats["revenue"],
            orders=stats["orders"],
            avg_order_value_micros=int(stats["revenue"] / stats["orders"]) if stats["orders"] > 0 else 0,
            top_product=top_prod,
        ))

    # Build top brands
    top_brands = []
    for br, stats in sorted(brand_stats.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]:
        top_brands.append(BrandSummary(
            brand=br,
            products_count=len(stats["products"]),
            quantity_sold=stats["quantity"],
            revenue_micros=stats["revenue"],
            orders=stats["orders"],
            market_share_pct=round(stats["revenue"] / max(total_revenue, 1) * 100, 1),
        ))

    # Calculate totals
    total_products = len(product_stats)
    total_orders = sum(s["orders"] for s in product_stats.values())
    avg_order_value = int(total_revenue / total_orders) if total_orders > 0 else 0

    return ProductOverview(
        date_from=date_from,
        date_to=date_to,
        total_products_sold=total_products,
        total_quantity=total_quantity,
        total_revenue_micros=total_revenue,
        avg_order_value_micros=avg_order_value,
        top_products=top_products,
        top_categories=top_categories,
        top_brands=top_brands,
    )


@router.get("/list")
async def list_products(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("revenue", description="Sort by: revenue, quantity, orders, name"),
    sort_dir: str = Query("desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all products with performance data."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get products
    query = supabase.table("products").select(
        "product_id, product_name, sku, category, brand, quantity, total_price_micros, image_url"
    ).eq("organization_id", org_id).gte(
        "created_at", f"{date_from}T00:00:00Z"
    ).lte("created_at", f"{date_to}T23:59:59Z")

    if category:
        query = query.eq("category", category)
    if brand:
        query = query.eq("brand", brand)
    if search:
        query = query.or_(
            f"product_name.ilike.%{search}%,sku.ilike.%{search}%"
        )

    result = query.execute()

    # Aggregate
    product_stats: Dict[str, Dict] = defaultdict(lambda: {
        "name": "", "sku": None, "category": None, "brand": None, "image": None,
        "quantity": 0, "revenue": 0, "orders": 0
    })

    for p in result.data or []:
        pid = p.get("product_id", "unknown")
        product_stats[pid]["name"] = p.get("product_name", pid)
        product_stats[pid]["sku"] = p.get("sku")
        product_stats[pid]["category"] = p.get("category")
        product_stats[pid]["brand"] = p.get("brand")
        product_stats[pid]["image"] = p.get("image_url")
        product_stats[pid]["quantity"] += p.get("quantity", 1)
        product_stats[pid]["revenue"] += p.get("total_price_micros", 0)
        product_stats[pid]["orders"] += 1

    # Convert to list
    products = []
    total_revenue = sum(s["revenue"] for s in product_stats.values())

    for pid, stats in product_stats.items():
        products.append({
            "product_id": pid,
            "product_name": stats["name"],
            "sku": stats["sku"],
            "category": stats["category"],
            "brand": stats["brand"],
            "image_url": stats["image"],
            "quantity_sold": stats["quantity"],
            "revenue_micros": stats["revenue"],
            "orders": stats["orders"],
            "avg_price_micros": int(stats["revenue"] / stats["quantity"]) if stats["quantity"] > 0 else 0,
            "revenue_pct": round(stats["revenue"] / max(total_revenue, 1) * 100, 1),
        })

    # Sort
    sort_keys = {
        "revenue": "revenue_micros",
        "quantity": "quantity_sold",
        "orders": "orders",
        "name": "product_name",
    }
    sort_key = sort_keys.get(sort_by, "revenue_micros")
    products.sort(key=lambda x: x[sort_key], reverse=(sort_dir.lower() == "desc"))

    total = len(products)
    products = products[offset:offset + limit]

    return {
        "products": products,
        "total": total,
        "limit": limit,
        "offset": offset,
        "summary": {
            "total_products": total,
            "total_revenue_micros": total_revenue,
            "total_quantity": sum(p["quantity_sold"] for p in products),
        },
    }


@router.get("/categories")
async def get_categories(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Get category breakdown."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    result = supabase.table("products").select(
        "product_id, category, subcategory, quantity, total_price_micros"
    ).eq("organization_id", org_id).gte(
        "created_at", f"{date_from}T00:00:00Z"
    ).lte("created_at", f"{date_to}T23:59:59Z").execute()

    # Aggregate
    category_stats: Dict[str, Dict] = defaultdict(lambda: {
        "subcategories": defaultdict(lambda: {"quantity": 0, "revenue": 0, "products": set()}),
        "quantity": 0, "revenue": 0, "products": set()
    })

    for p in result.data or []:
        cat = p.get("category") or "Uncategorized"
        subcat = p.get("subcategory") or "Other"

        category_stats[cat]["quantity"] += p.get("quantity", 1)
        category_stats[cat]["revenue"] += p.get("total_price_micros", 0)
        category_stats[cat]["products"].add(p.get("product_id"))

        category_stats[cat]["subcategories"][subcat]["quantity"] += p.get("quantity", 1)
        category_stats[cat]["subcategories"][subcat]["revenue"] += p.get("total_price_micros", 0)
        category_stats[cat]["subcategories"][subcat]["products"].add(p.get("product_id"))

    total_revenue = sum(s["revenue"] for s in category_stats.values())

    categories = []
    for cat, stats in sorted(category_stats.items(), key=lambda x: x[1]["revenue"], reverse=True):
        subcategories = []
        for subcat, sub_stats in sorted(stats["subcategories"].items(), key=lambda x: x[1]["revenue"], reverse=True):
            subcategories.append({
                "name": subcat,
                "quantity": sub_stats["quantity"],
                "revenue_micros": sub_stats["revenue"],
                "products_count": len(sub_stats["products"]),
            })

        categories.append({
            "category": cat,
            "quantity": stats["quantity"],
            "revenue_micros": stats["revenue"],
            "revenue_pct": round(stats["revenue"] / max(total_revenue, 1) * 100, 1),
            "products_count": len(stats["products"]),
            "subcategories": subcategories,
        })

    return {
        "date_from": date_from,
        "date_to": date_to,
        "categories": categories,
        "total_categories": len(categories),
        "total_revenue_micros": total_revenue,
    }


@router.get("/trends")
async def get_product_trends(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    product_ids: Optional[str] = Query(None, description="Comma-separated product IDs"),
    granularity: str = Query("day", description="Granularity: day, week, month"),
):
    """Get product sales trends over time."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    query = supabase.table("products").select(
        "product_id, product_name, quantity, total_price_micros, created_at"
    ).eq("organization_id", org_id).gte(
        "created_at", f"{date_from}T00:00:00Z"
    ).lte("created_at", f"{date_to}T23:59:59Z")

    if product_ids:
        query = query.in_("product_id", product_ids.split(","))

    result = query.execute()

    # Aggregate by date and product
    trends: Dict[str, Dict[str, Dict]] = defaultdict(lambda: defaultdict(lambda: {
        "name": "", "quantity": 0, "revenue": 0
    }))

    for p in result.data or []:
        created = p.get("created_at", "")[:10]  # YYYY-MM-DD
        pid = p.get("product_id", "unknown")

        if granularity == "week":
            dt = datetime.fromisoformat(created)
            created = (dt - timedelta(days=dt.weekday())).strftime("%Y-%m-%d")
        elif granularity == "month":
            created = created[:7] + "-01"

        trends[created][pid]["name"] = p.get("product_name", pid)
        trends[created][pid]["quantity"] += p.get("quantity", 1)
        trends[created][pid]["revenue"] += p.get("total_price_micros", 0)

    # Build trend data
    trend_data = []
    for date in sorted(trends.keys()):
        for pid, stats in trends[date].items():
            trend_data.append({
                "date": date,
                "product_id": pid,
                "product_name": stats["name"],
                "quantity": stats["quantity"],
                "revenue_micros": stats["revenue"],
            })

    # Daily totals
    daily_totals = []
    for date in sorted(trends.keys()):
        daily_totals.append({
            "date": date,
            "quantity": sum(s["quantity"] for s in trends[date].values()),
            "revenue_micros": sum(s["revenue"] for s in trends[date].values()),
        })

    return {
        "date_from": date_from,
        "date_to": date_to,
        "granularity": granularity,
        "by_product": trend_data,
        "daily_totals": daily_totals,
    }


@router.get("/catalog")
async def get_product_catalog(
    user: dict = Depends(get_current_user),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get product catalog with sales stats."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    query = supabase.table("product_catalog").select(
        "*", count="exact"
    ).eq("organization_id", org_id)

    if search:
        query = query.or_(
            f"product_name.ilike.%{search}%,sku.ilike.%{search}%,product_id.ilike.%{search}%"
        )
    if category:
        query = query.eq("category", category)
    if brand:
        query = query.eq("brand", brand)
    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.order("total_revenue_micros", desc=True).range(offset, offset + limit - 1)

    result = query.execute()

    products = [CatalogProduct(**p) for p in result.data or []]

    return {
        "products": products,
        "total": result.count or len(products),
        "limit": limit,
        "offset": offset,
    }


@router.get("/{product_id}")
async def get_product_detail(
    product_id: str,
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Get detailed analytics for a specific product."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get sales data
    sales_result = supabase.table("products").select(
        "product_name, sku, category, brand, quantity, unit_price_micros, "
        "total_price_micros, variant, image_url, created_at"
    ).eq("organization_id", org_id).eq("product_id", product_id).gte(
        "created_at", f"{date_from}T00:00:00Z"
    ).lte("created_at", f"{date_to}T23:59:59Z").execute()

    sales = sales_result.data or []

    if not sales:
        # Try catalog
        catalog_result = supabase.table("product_catalog").select("*").eq(
            "organization_id", org_id
        ).eq("product_id", product_id).maybe_single().execute()

        if not catalog_result.data:
            raise HTTPException(status_code=404, detail="Product not found")

        return {
            "product_id": product_id,
            "product_name": catalog_result.data.get("product_name"),
            "sku": catalog_result.data.get("sku"),
            "category": catalog_result.data.get("category"),
            "brand": catalog_result.data.get("brand"),
            "image_url": catalog_result.data.get("image_url"),
            "total_quantity": 0,
            "total_revenue_micros": 0,
            "total_orders": 0,
            "avg_price_micros": catalog_result.data.get("default_price_micros", 0),
            "variants": [],
            "daily_sales": [],
        }

    # Aggregate
    total_quantity = sum(s.get("quantity", 1) for s in sales)
    total_revenue = sum(s.get("total_price_micros", 0) for s in sales)

    # Variant breakdown
    variant_stats: Dict[str, Dict] = defaultdict(lambda: {"quantity": 0, "revenue": 0})
    for s in sales:
        var = s.get("variant") or "Default"
        variant_stats[var]["quantity"] += s.get("quantity", 1)
        variant_stats[var]["revenue"] += s.get("total_price_micros", 0)

    variants = [{"variant": k, **v} for k, v in variant_stats.items()]
    variants.sort(key=lambda x: x["revenue"], reverse=True)

    # Daily sales
    daily_stats: Dict[str, Dict] = defaultdict(lambda: {"quantity": 0, "revenue": 0})
    for s in sales:
        date = s.get("created_at", "")[:10]
        daily_stats[date]["quantity"] += s.get("quantity", 1)
        daily_stats[date]["revenue"] += s.get("total_price_micros", 0)

    daily_sales = [{"date": k, **v} for k, v in sorted(daily_stats.items())]

    first_sale = sales[0] if sales else {}

    return {
        "product_id": product_id,
        "product_name": first_sale.get("product_name", product_id),
        "sku": first_sale.get("sku"),
        "category": first_sale.get("category"),
        "brand": first_sale.get("brand"),
        "image_url": first_sale.get("image_url"),
        "total_quantity": total_quantity,
        "total_revenue_micros": total_revenue,
        "total_orders": len(sales),
        "avg_price_micros": int(total_revenue / total_quantity) if total_quantity > 0 else 0,
        "variants": variants,
        "daily_sales": daily_sales,
        "date_from": date_from,
        "date_to": date_to,
    }
