"""
Automations API Endpoints

Provides endpoints for:
- CRUD operations on automation rules
- Triggering automation execution
- Viewing execution history
- Undoing executions
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
import json

from ..services.supabase_client import get_supabase_client
from ..services.automation_service import AutomationService, AutomationScheduler
from .user_auth import get_current_user


router = APIRouter(prefix="/api/v1/automations", tags=["Automations"])


def _to_str(val):
    """Convert UUID/datetime to string."""
    if val is None:
        return None
    return str(val)


# =============================================================================
# Request/Response Models
# =============================================================================

class ConditionConfig(BaseModel):
    """Configuration for rule conditions."""
    min_spend_7d: Optional[float] = None
    min_conversions_7d: Optional[float] = None
    max_cpa: Optional[float] = None
    min_roas: Optional[float] = None
    status_is: Optional[str] = None
    budget_below_percent: Optional[float] = None


class ActionConfig(BaseModel):
    """Configuration for rule actions."""
    type: Literal["increase_budget", "decrease_budget", "pause_campaign", "enable_campaign"]
    percentage: Optional[float] = None  # For budget changes


class CreateRuleRequest(BaseModel):
    name: str
    description: Optional[str] = None
    ad_account_id: Optional[str] = None  # If None, applies to all accounts
    rule_type: str
    conditions: Dict[str, Any]
    actions: Dict[str, Any]
    schedule: Literal["hourly", "daily", "weekly"] = "daily"
    is_active: bool = True


class UpdateRuleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    actions: Optional[Dict[str, Any]] = None
    schedule: Optional[Literal["hourly", "daily", "weekly"]] = None
    is_active: Optional[bool] = None


class RuleResponse(BaseModel):
    id: str
    organization_id: str
    ad_account_id: Optional[str]
    name: str
    description: Optional[str]
    rule_type: str
    conditions: Dict[str, Any]
    actions: Dict[str, Any]
    schedule: str
    is_active: bool
    last_run_at: Optional[str]
    next_run_at: Optional[str]
    created_at: str


class ExecutionResponse(BaseModel):
    id: str
    rule_id: str
    campaign_id: Optional[str]
    campaign_name: Optional[str]
    status: str
    action_taken: Optional[str]
    error_message: Optional[str]
    executed_at: str
    undone_at: Optional[str]
    can_undo: bool


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/rules", response_model=List[RuleResponse])
async def list_rules(
    ad_account_id: Optional[str] = Query(None, description="Filter by ad account"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: dict = Depends(get_current_user),
):
    """List all automation rules for the organization."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    query = supabase.table("automation_rules").select("*")

    if organization_id:
        query = query.eq("organization_id", organization_id)
    if ad_account_id:
        query = query.eq("ad_account_id", ad_account_id)
    if is_active is not None:
        query = query.eq("is_active", is_active)

    result = query.order("created_at", desc=True).execute()

    return [
        RuleResponse(
            id=_to_str(r["id"]),
            organization_id=_to_str(r["organization_id"]),
            ad_account_id=_to_str(r.get("ad_account_id")),
            name=r["name"],
            description=r.get("description"),
            rule_type=r["rule_type"],
            conditions=r.get("conditions") or {},
            actions=r.get("actions") or {},
            schedule=r.get("schedule", "daily"),
            is_active=r.get("is_active", True),
            last_run_at=_to_str(r.get("last_run_at")),
            next_run_at=_to_str(r.get("next_run_at")),
            created_at=_to_str(r.get("created_at")) or "",
        )
        for r in (result.data or [])
    ]


@router.post("/rules", response_model=RuleResponse)
async def create_rule(
    request: CreateRuleRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new automation rule."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify ad account belongs to organization if specified
    if request.ad_account_id:
        account = supabase.table("ad_accounts").select("id").eq(
            "id", request.ad_account_id
        ).eq("organization_id", organization_id).execute()

        if not account.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    rule_data = {
        "organization_id": organization_id,
        "ad_account_id": request.ad_account_id,
        "name": request.name,
        "description": request.description,
        "rule_type": request.rule_type,
        "conditions": request.conditions,
        "actions": request.actions,
        "schedule": request.schedule,
        "is_active": request.is_active,
    }

    result = supabase.table("automation_rules").insert(rule_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create rule")

    r = result.data[0]
    return RuleResponse(
        id=_to_str(r["id"]),
        organization_id=_to_str(r["organization_id"]),
        ad_account_id=_to_str(r.get("ad_account_id")),
        name=r["name"],
        description=r.get("description"),
        rule_type=r["rule_type"],
        conditions=r.get("conditions") or {},
        actions=r.get("actions") or {},
        schedule=r.get("schedule", "daily"),
        is_active=r.get("is_active", True),
        last_run_at=_to_str(r.get("last_run_at")),
        next_run_at=_to_str(r.get("next_run_at")),
        created_at=_to_str(r.get("created_at")) or "",
    )


@router.get("/rules/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific automation rule."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    result = supabase.table("automation_rules").select("*").eq(
        "id", rule_id
    ).eq("organization_id", organization_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Rule not found")

    r = result.data[0]
    return RuleResponse(
        id=_to_str(r["id"]),
        organization_id=_to_str(r["organization_id"]),
        ad_account_id=_to_str(r.get("ad_account_id")),
        name=r["name"],
        description=r.get("description"),
        rule_type=r["rule_type"],
        conditions=r.get("conditions") or {},
        actions=r.get("actions") or {},
        schedule=r.get("schedule", "daily"),
        is_active=r.get("is_active", True),
        last_run_at=_to_str(r.get("last_run_at")),
        next_run_at=_to_str(r.get("next_run_at")),
        created_at=_to_str(r.get("created_at")) or "",
    )


@router.patch("/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: str,
    request: UpdateRuleRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update an automation rule."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify rule exists and belongs to organization
    existing = supabase.table("automation_rules").select("id").eq(
        "id", rule_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Build update data
    update_data = {}
    if request.name is not None:
        update_data["name"] = request.name
    if request.description is not None:
        update_data["description"] = request.description
    if request.conditions is not None:
        update_data["conditions"] = request.conditions
    if request.actions is not None:
        update_data["actions"] = request.actions
    if request.schedule is not None:
        update_data["schedule"] = request.schedule
    if request.is_active is not None:
        update_data["is_active"] = request.is_active

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("automation_rules").update(update_data).eq(
        "id", rule_id
    ).execute()

    r = result.data[0]
    return RuleResponse(
        id=_to_str(r["id"]),
        organization_id=_to_str(r["organization_id"]),
        ad_account_id=_to_str(r.get("ad_account_id")),
        name=r["name"],
        description=r.get("description"),
        rule_type=r["rule_type"],
        conditions=r.get("conditions") or {},
        actions=r.get("actions") or {},
        schedule=r.get("schedule", "daily"),
        is_active=r.get("is_active", True),
        last_run_at=_to_str(r.get("last_run_at")),
        next_run_at=_to_str(r.get("next_run_at")),
        created_at=_to_str(r.get("created_at")) or "",
    )


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an automation rule."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify rule exists and belongs to organization
    existing = supabase.table("automation_rules").select("id").eq(
        "id", rule_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Rule not found")

    supabase.table("automation_rules").delete().eq("id", rule_id).execute()

    return {"success": True, "message": "Rule deleted"}


@router.post("/rules/{rule_id}/execute")
async def execute_rule(
    rule_id: str,
    campaign_id: str = Query(..., description="Campaign to execute rule on"),
    current_user: dict = Depends(get_current_user),
):
    """
    Manually execute an automation rule on a specific campaign.

    Uses idempotency to prevent double-execution.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify rule exists and belongs to organization
    rule = supabase.table("automation_rules").select("*").eq(
        "id", rule_id
    ).eq("organization_id", organization_id).execute()

    if not rule.data:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Verify campaign exists
    campaign = supabase.table("campaigns").select(
        "id, ad_accounts(organization_id)"
    ).eq("id", campaign_id).execute()

    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign_org = campaign.data[0].get("ad_accounts", {}).get("organization_id")
    if campaign_org != organization_id:
        raise HTTPException(status_code=403, detail="Campaign not in your organization")

    # Execute rule
    service = AutomationService()
    result = await service.execute_rule(rule_id, campaign_id)

    if result is None:
        return {
            "success": False,
            "message": "Rule already executed in this window (idempotency protection)",
        }

    if result.get("status") == "skipped":
        return {
            "success": True,
            "skipped": True,
            "message": f"Rule skipped: {result.get('reason')}",
        }

    return {
        "success": True,
        "action_taken": result.get("action_taken"),
        "before_state": result.get("before_state"),
        "after_state": result.get("after_state"),
    }


@router.get("/executions", response_model=List[ExecutionResponse])
async def list_executions(
    rule_id: Optional[str] = Query(None, description="Filter by rule ID"),
    campaign_id: Optional[str] = Query(None, description="Filter by campaign ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List automation execution history."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Get executions with campaign info
    query = supabase.table("automation_executions").select(
        "*, campaigns(name, ad_accounts(organization_id)), automation_rules(organization_id)"
    )

    if rule_id:
        query = query.eq("rule_id", rule_id)
    if campaign_id:
        query = query.eq("campaign_id", campaign_id)
    if status:
        query = query.eq("status", status)

    result = query.order("executed_at", desc=True).limit(limit).execute()

    # Filter by organization
    executions = []
    now = datetime.utcnow()

    for e in (result.data or []):
        # Check organization access via campaign or rule
        campaign = e.get("campaigns") or {}
        account = campaign.get("ad_accounts") or {}
        rule = e.get("automation_rules") or {}

        e_org = account.get("organization_id") or rule.get("organization_id")
        if e_org != organization_id:
            continue

        # Check if can still undo (within 24 hours)
        executed_at = e.get("executed_at", "")
        can_undo = False
        if e.get("status") == "success" and not e.get("undone_at") and executed_at:
            try:
                executed_dt = datetime.fromisoformat(executed_at.replace("Z", "+00:00"))
                hours_since = (now.replace(tzinfo=executed_dt.tzinfo) - executed_dt).total_seconds() / 3600
                can_undo = hours_since < 24
            except:
                pass

        executions.append(ExecutionResponse(
            id=e["id"],
            rule_id=e["rule_id"],
            campaign_id=e.get("campaign_id"),
            campaign_name=campaign.get("name"),
            status=e.get("status", "unknown"),
            action_taken=e.get("action_taken"),
            error_message=e.get("error_message"),
            executed_at=executed_at,
            undone_at=e.get("undone_at"),
            can_undo=can_undo,
        ))

    return executions


@router.post("/executions/{execution_id}/undo")
async def undo_execution(
    execution_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Undo an automation execution.

    Only available within 24 hours of execution.
    """
    organization_id = current_user.get("organization_id")

    service = AutomationService()
    result = await service.undo_execution(execution_id, organization_id)

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Failed to undo execution")
        )

    return result


@router.post("/run-scheduled")
async def run_scheduled_rules(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Trigger scheduled automation rules (admin only).

    This is typically called by a cron job or Cloud Scheduler.
    """
    # Check if user is admin (you may want to add proper admin check)
    user_role = current_user.get("role")
    if user_role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    scheduler = AutomationScheduler()
    result = await scheduler.run_due_rules()

    return {
        "success": True,
        "rules_checked": result.get("rules_checked"),
        "rules_executed": result.get("rules_executed"),
        "campaigns_affected": result.get("campaigns_affected"),
        "errors": result.get("errors"),
    }
