"""CSV Conversion Import API with duplicate detection and templates."""

import csv
import io
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/conversions/import", tags=["Conversion Import"])


# ============================================================================
# Models
# ============================================================================

class ColumnMapping(BaseModel):
    """Mapping from CSV column to conversion field."""
    csv_column: str
    target_field: str


class ImportConfig(BaseModel):
    """Configuration for CSV import."""
    column_mappings: List[ColumnMapping]
    date_format: str = Field(default="%Y-%m-%d %H:%M:%S")
    skip_duplicates: bool = Field(default=True)
    duplicate_check_fields: List[str] = Field(default=["email", "occurred_at", "conversion_type"])
    default_conversion_type: str = Field(default="lead")
    default_source: str = Field(default="csv")
    default_currency: str = Field(default="USD")


class ImportPreviewRow(BaseModel):
    """Preview of a single row to be imported."""
    row_number: int
    data: Dict[str, Any]
    is_duplicate: bool
    duplicate_reason: Optional[str] = None
    validation_errors: List[str] = []


class ImportPreviewResponse(BaseModel):
    """Response from import preview."""
    total_rows: int
    valid_rows: int
    duplicate_rows: int
    error_rows: int
    preview: List[ImportPreviewRow]
    detected_columns: List[str]
    suggested_mappings: Dict[str, str]


class ImportResult(BaseModel):
    """Result of import operation."""
    status: str
    total_rows: int
    imported: int
    skipped_duplicates: int
    failed: int
    errors: List[Dict[str, Any]] = []


class ConversionTemplate(BaseModel):
    """Template for quick conversion creation."""
    id: str
    name: str
    description: Optional[str] = None
    conversion_type: str
    default_value: Optional[float] = None
    currency: str = "USD"
    custom_fields: Dict[str, Any] = {}
    is_default: bool = False


class TemplateCreate(BaseModel):
    """Request to create a template."""
    name: str
    description: Optional[str] = None
    conversion_type: str
    default_value: Optional[float] = None
    currency: str = "USD"
    custom_fields: Dict[str, Any] = {}


# ============================================================================
# Field Mapping Suggestions
# ============================================================================

# Common CSV column names mapped to target fields
COLUMN_SUGGESTIONS = {
    # Email variations
    "email": "email",
    "email_address": "email",
    "e-mail": "email",
    "emailaddress": "email",
    "user_email": "email",
    "customer_email": "email",

    # Phone variations
    "phone": "phone",
    "phone_number": "phone",
    "phonenumber": "phone",
    "telephone": "phone",
    "mobile": "phone",
    "cell": "phone",

    # Name variations
    "first_name": "first_name",
    "firstname": "first_name",
    "first": "first_name",
    "fname": "first_name",
    "given_name": "first_name",
    "last_name": "last_name",
    "lastname": "last_name",
    "last": "last_name",
    "lname": "last_name",
    "surname": "last_name",
    "family_name": "last_name",
    "name": "first_name",  # Full name goes to first_name
    "full_name": "first_name",

    # Value variations
    "value": "value",
    "amount": "value",
    "total": "value",
    "revenue": "value",
    "price": "value",
    "order_value": "value",
    "transaction_value": "value",
    "purchase_amount": "value",

    # Date variations
    "date": "occurred_at",
    "occurred_at": "occurred_at",
    "conversion_date": "occurred_at",
    "created_at": "occurred_at",
    "timestamp": "occurred_at",
    "datetime": "occurred_at",
    "purchase_date": "occurred_at",
    "order_date": "occurred_at",

    # Type variations
    "type": "conversion_type",
    "conversion_type": "conversion_type",
    "event_type": "conversion_type",
    "action": "conversion_type",

    # Click IDs
    "gclid": "gclid",
    "google_click_id": "gclid",
    "fbclid": "fbclid",
    "facebook_click_id": "fbclid",
    "gbraid": "gbraid",
    "wbraid": "wbraid",

    # UTM
    "utm_source": "utm_source",
    "source": "utm_source",
    "utm_medium": "utm_medium",
    "medium": "utm_medium",
    "utm_campaign": "utm_campaign",
    "campaign": "utm_campaign",

    # Order
    "order_id": "order_id",
    "orderid": "order_id",
    "transaction_id": "order_id",
    "invoice_id": "order_id",

    # External ID
    "external_id": "external_id",
    "externalid": "external_id",
    "crm_id": "external_id",
    "customer_id": "external_id",
    "lead_id": "external_id",
}


def normalize_column_name(name: str) -> str:
    """Normalize column name for matching."""
    return name.lower().strip().replace(" ", "_").replace("-", "_")


def suggest_mappings(columns: List[str]) -> Dict[str, str]:
    """Suggest field mappings based on column names."""
    suggestions = {}
    for col in columns:
        normalized = normalize_column_name(col)
        if normalized in COLUMN_SUGGESTIONS:
            suggestions[col] = COLUMN_SUGGESTIONS[normalized]
    return suggestions


def generate_row_hash(row: Dict[str, Any], fields: List[str]) -> str:
    """Generate hash for duplicate detection."""
    values = []
    for field in sorted(fields):
        val = row.get(field, "")
        if val is not None:
            values.append(str(val).lower().strip())
    combined = "|".join(values)
    return hashlib.md5(combined.encode()).hexdigest()


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    skip_duplicates: bool = Query(True),
    max_preview: int = Query(20, ge=1, le=100),
):
    """Preview CSV import without actually importing.

    Returns detected columns, suggested mappings, and preview of rows
    including duplicate detection.
    """
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Read CSV
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except:
            raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(text))
    columns = reader.fieldnames or []

    if not columns:
        raise HTTPException(status_code=400, detail="No columns found in CSV")

    # Suggest mappings
    suggested = suggest_mappings(columns)

    # Load existing conversions for duplicate checking
    existing_hashes = set()
    if skip_duplicates:
        existing = supabase.table("offline_conversions").select(
            "email, occurred_at, conversion_type"
        ).eq("organization_id", org_id).execute()

        for conv in existing.data:
            h = generate_row_hash(conv, ["email", "occurred_at", "conversion_type"])
            existing_hashes.add(h)

    # Preview rows
    preview = []
    total_rows = 0
    valid_rows = 0
    duplicate_rows = 0
    error_rows = 0

    for i, row in enumerate(reader):
        total_rows += 1

        # Apply suggested mappings for preview
        mapped_data = {}
        for csv_col, target_field in suggested.items():
            if csv_col in row:
                mapped_data[target_field] = row[csv_col]

        # Keep original columns too
        for col, val in row.items():
            if col not in suggested:
                mapped_data[col] = val

        # Validation errors
        errors = []
        if not mapped_data.get("email") and not mapped_data.get("phone"):
            errors.append("Missing email or phone")

        # Duplicate check
        is_duplicate = False
        duplicate_reason = None
        if skip_duplicates and mapped_data.get("email"):
            h = generate_row_hash({
                "email": mapped_data.get("email"),
                "occurred_at": mapped_data.get("occurred_at", datetime.now(timezone.utc).isoformat()),
                "conversion_type": mapped_data.get("conversion_type", "lead"),
            }, ["email", "occurred_at", "conversion_type"])

            if h in existing_hashes:
                is_duplicate = True
                duplicate_reason = "Matching email, date, and type already exists"

        # Categorize
        if is_duplicate:
            duplicate_rows += 1
        elif errors:
            error_rows += 1
        else:
            valid_rows += 1

        # Add to preview
        if i < max_preview:
            preview.append(ImportPreviewRow(
                row_number=i + 1,
                data=mapped_data,
                is_duplicate=is_duplicate,
                duplicate_reason=duplicate_reason,
                validation_errors=errors,
            ))

    return ImportPreviewResponse(
        total_rows=total_rows,
        valid_rows=valid_rows,
        duplicate_rows=duplicate_rows,
        error_rows=error_rows,
        preview=preview,
        detected_columns=columns,
        suggested_mappings=suggested,
    )


@router.post("/execute", response_model=ImportResult)
async def execute_import(
    file: UploadFile = File(...),
    config: str = Query(..., description="JSON-encoded ImportConfig"),
    user: dict = Depends(get_current_user),
):
    """Execute CSV import with provided configuration."""
    import json

    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Parse config
    try:
        config_data = json.loads(config)
        import_config = ImportConfig(**config_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid config: {str(e)}")

    # Read CSV
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    # Build column mapping dict
    mappings = {m.csv_column: m.target_field for m in import_config.column_mappings}

    # Load existing hashes for duplicate detection
    existing_hashes = set()
    if import_config.skip_duplicates:
        existing = supabase.table("offline_conversions").select(
            ",".join(import_config.duplicate_check_fields)
        ).eq("organization_id", org_id).execute()

        for conv in existing.data:
            h = generate_row_hash(conv, import_config.duplicate_check_fields)
            existing_hashes.add(h)

    # Process rows
    now = datetime.now(timezone.utc).isoformat()
    imported = 0
    skipped = 0
    failed = 0
    errors = []

    for i, row in enumerate(reader):
        try:
            # Map columns
            mapped = {}
            for csv_col, val in row.items():
                if csv_col in mappings:
                    mapped[mappings[csv_col]] = val

            # Validate required fields
            if not mapped.get("email") and not mapped.get("phone"):
                errors.append({"row": i + 1, "error": "Missing email or phone"})
                failed += 1
                continue

            # Parse value
            value_micros = 0
            if mapped.get("value"):
                try:
                    value = float(str(mapped["value"]).replace("$", "").replace(",", "").strip())
                    value_micros = int(value * 1_000_000)
                except:
                    pass

            # Parse date
            occurred_at = now
            if mapped.get("occurred_at"):
                try:
                    dt = datetime.strptime(mapped["occurred_at"], import_config.date_format)
                    occurred_at = dt.replace(tzinfo=timezone.utc).isoformat()
                except:
                    try:
                        # Try ISO format
                        occurred_at = mapped["occurred_at"]
                    except:
                        pass

            # Build conversion data
            conversion_type = mapped.get("conversion_type", import_config.default_conversion_type)

            # Check for duplicates
            if import_config.skip_duplicates:
                check_data = {
                    field: mapped.get(field) or (occurred_at if field == "occurred_at" else conversion_type if field == "conversion_type" else None)
                    for field in import_config.duplicate_check_fields
                }
                h = generate_row_hash(check_data, import_config.duplicate_check_fields)
                if h in existing_hashes:
                    skipped += 1
                    continue
                existing_hashes.add(h)

            # Create conversion
            conversion = {
                "id": str(uuid4()),
                "organization_id": org_id,
                "email": mapped.get("email", "").lower().strip() if mapped.get("email") else None,
                "phone": mapped.get("phone", "").strip() if mapped.get("phone") else None,
                "first_name": mapped.get("first_name"),
                "last_name": mapped.get("last_name"),
                "conversion_type": conversion_type,
                "conversion_name": mapped.get("conversion_name"),
                "value_micros": value_micros,
                "currency": mapped.get("currency", import_config.default_currency),
                "quantity": 1,
                "order_id": mapped.get("order_id"),
                "gclid": mapped.get("gclid"),
                "fbclid": mapped.get("fbclid"),
                "gbraid": mapped.get("gbraid"),
                "wbraid": mapped.get("wbraid"),
                "utm_source": mapped.get("utm_source"),
                "utm_medium": mapped.get("utm_medium"),
                "utm_campaign": mapped.get("utm_campaign"),
                "source": import_config.default_source,
                "source_name": file.filename,
                "external_id": mapped.get("external_id"),
                "lead_status": "new",
                "custom_data": {},
                "occurred_at": occurred_at,
                "created_at": now,
                "updated_at": now,
            }

            supabase.table("offline_conversions").insert(conversion).execute()
            imported += 1

        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})
            failed += 1
            if failed > 100:
                break  # Stop after too many errors

    return ImportResult(
        status="success" if imported > 0 else "failed",
        total_rows=imported + skipped + failed,
        imported=imported,
        skipped_duplicates=skipped,
        failed=failed,
        errors=errors[:50],  # Return first 50 errors
    )


@router.get("/sample-csv")
async def download_sample_csv():
    """Download a sample CSV file for import."""
    csv_content = """email,first_name,last_name,phone,value,conversion_type,date,gclid,fbclid,utm_source,utm_campaign
john@example.com,John,Doe,+1234567890,99.99,purchase,2024-01-15 10:30:00,EAIaIQ...,fb.1.123...,google,winter_sale
jane@example.com,Jane,Smith,+1987654321,149.99,lead,2024-01-16 14:45:00,,,facebook,retargeting
bob@example.com,Bob,Johnson,,299.99,signup,2024-01-17 09:15:00,EAIaIQ...,,google,brand"""

    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sample_conversions.csv"}
    )


# ============================================================================
# Conversion Templates
# ============================================================================

@router.get("/templates", response_model=List[ConversionTemplate])
async def list_templates(
    user: dict = Depends(get_current_user),
):
    """List conversion templates for quick creation."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    result = supabase.table("conversion_templates").select("*").eq(
        "organization_id", org_id
    ).order("name").execute()

    templates = [ConversionTemplate(**t) for t in result.data]

    # Add default templates if none exist
    if not templates:
        defaults = [
            ConversionTemplate(
                id="default_lead",
                name="New Lead",
                description="Standard lead capture",
                conversion_type="lead",
                default_value=None,
                is_default=True,
            ),
            ConversionTemplate(
                id="default_purchase",
                name="Purchase",
                description="E-commerce purchase",
                conversion_type="purchase",
                default_value=None,
                is_default=True,
            ),
            ConversionTemplate(
                id="default_signup",
                name="Sign Up",
                description="Account registration",
                conversion_type="signup",
                default_value=None,
                is_default=True,
            ),
            ConversionTemplate(
                id="default_demo",
                name="Demo Request",
                description="Demo or consultation request",
                conversion_type="lead",
                default_value=500.0,
                is_default=True,
            ),
            ConversionTemplate(
                id="default_download",
                name="Content Download",
                description="Whitepaper, ebook, or resource download",
                conversion_type="lead",
                default_value=50.0,
                is_default=True,
            ),
        ]
        return defaults

    return templates


@router.post("/templates", response_model=ConversionTemplate)
async def create_template(
    data: TemplateCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new conversion template."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    now = datetime.now(timezone.utc).isoformat()

    template = {
        "id": str(uuid4()),
        "organization_id": org_id,
        "name": data.name,
        "description": data.description,
        "conversion_type": data.conversion_type,
        "default_value": int(data.default_value * 1_000_000) if data.default_value else None,
        "currency": data.currency,
        "custom_fields": data.custom_fields,
        "is_default": False,
        "created_at": now,
        "updated_at": now,
    }

    result = supabase.table("conversion_templates").insert(template).execute()

    return ConversionTemplate(**result.data[0])


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a conversion template."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Don't allow deleting default templates
    if template_id.startswith("default_"):
        raise HTTPException(status_code=400, detail="Cannot delete default templates")

    existing = supabase.table("conversion_templates").select("id").eq(
        "organization_id", org_id
    ).eq("id", template_id).maybe_single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Template not found")

    supabase.table("conversion_templates").delete().eq("id", template_id).execute()

    return {"status": "success", "message": "Template deleted"}


# ============================================================================
# Import History
# ============================================================================

@router.get("/history")
async def get_import_history(
    user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
):
    """Get history of recent imports."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Get conversions grouped by source_name for CSV imports
    result = supabase.table("offline_conversions").select(
        "source_name, created_at, id"
    ).eq("organization_id", org_id).eq("source", "csv").order(
        "created_at", desc=True
    ).limit(1000).execute()

    # Group by source_name (filename)
    imports = {}
    for conv in result.data:
        name = conv.get("source_name") or "Unknown"
        if name not in imports:
            imports[name] = {
                "filename": name,
                "count": 0,
                "first_import": conv["created_at"],
                "last_import": conv["created_at"],
            }
        imports[name]["count"] += 1
        if conv["created_at"] > imports[name]["last_import"]:
            imports[name]["last_import"] = conv["created_at"]

    # Sort by last import and limit
    history = sorted(imports.values(), key=lambda x: x["last_import"], reverse=True)[:limit]

    return {"imports": history}
