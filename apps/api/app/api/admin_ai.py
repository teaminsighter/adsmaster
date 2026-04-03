"""
Admin AI & ML Control API
Routes for AI model configuration, prompts, recommendation rules, and cost budgets
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.supabase_client import get_supabase_client
from app.api.admin import get_current_admin

router = APIRouter(prefix="/admin/ai", tags=["Admin - AI & ML"])


# ============================================================================
# Request/Response Models
# ============================================================================

class AIModelConfigCreate(BaseModel):
    feature: str
    provider: str
    model_name: str
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 1.0
    frequency_penalty: float = 0
    presence_penalty: float = 0
    fallback_provider: Optional[str] = None
    fallback_model: Optional[str] = None
    is_active: bool = True
    priority: int = 0


class AIModelConfigUpdate(BaseModel):
    provider: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    fallback_provider: Optional[str] = None
    fallback_model: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None


class AIPromptCreate(BaseModel):
    name: str
    feature: str
    system_prompt: str
    user_prompt_template: Optional[str] = None
    is_active: bool = True
    is_production: bool = False


class AIPromptUpdate(BaseModel):
    system_prompt: Optional[str] = None
    user_prompt_template: Optional[str] = None
    is_active: Optional[bool] = None
    is_production: Optional[bool] = None


class RuleConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = None
    priority: Optional[int] = None
    thresholds: Optional[dict] = None
    min_confidence_score: Optional[float] = None
    require_approval: Optional[bool] = None
    applies_to_plans: Optional[List[str]] = None
    applies_to_platforms: Optional[List[str]] = None


class AIBudgetCreate(BaseModel):
    scope_type: str
    scope_id: Optional[str] = None
    daily_budget_usd: Optional[float] = None
    monthly_budget_usd: Optional[float] = None
    alert_at_percentage: int = 80
    action_at_limit: str = "alert"


class AIBudgetUpdate(BaseModel):
    daily_budget_usd: Optional[float] = None
    monthly_budget_usd: Optional[float] = None
    alert_at_percentage: Optional[int] = None
    action_at_limit: Optional[str] = None


class TestPromptRequest(BaseModel):
    prompt_id: str
    test_input: str
    model_override: Optional[str] = None


# ============================================================================
# AI Overview
# ============================================================================

@router.get("/overview")
async def get_ai_overview(
    admin: dict = Depends(get_current_admin)
):
    """Get AI usage overview"""
    supabase = get_supabase_client()
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # Today's usage
    today_usage = supabase.table("ai_usage_logs").select(
        "provider, input_tokens, output_tokens, cost_usd"
    ).gte("created_at", today_start.isoformat()).execute()

    # Week's usage
    week_usage = supabase.table("ai_usage_logs").select(
        "input_tokens, output_tokens, cost_usd"
    ).gte("created_at", week_start.isoformat()).execute()

    # Month's usage
    month_usage = supabase.table("ai_usage_logs").select(
        "input_tokens, output_tokens, cost_usd"
    ).gte("created_at", month_start.isoformat()).execute()

    def aggregate(data):
        requests = len(data or [])
        tokens = sum((d.get("input_tokens", 0) + d.get("output_tokens", 0)) for d in (data or []))
        cost = sum(float(d.get("cost_usd", 0) or 0) for d in (data or []))
        return {"requests": requests, "tokens": tokens, "cost": round(cost, 2)}

    today_stats = aggregate(today_usage.data)
    week_stats = aggregate(week_usage.data)
    month_stats = aggregate(month_usage.data)

    # By provider (today)
    providers = {}
    for log in (today_usage.data or []):
        provider = log.get("provider", "unknown")
        if provider not in providers:
            providers[provider] = {"requests": 0, "tokens": 0, "cost": 0}
        providers[provider]["requests"] += 1
        providers[provider]["tokens"] += (log.get("input_tokens", 0) + log.get("output_tokens", 0))
        providers[provider]["cost"] += float(log.get("cost_usd", 0) or 0)

    return {
        "today": today_stats,
        "week": week_stats,
        "month": month_stats,
        "by_provider": providers,
        "timestamp": now.isoformat()
    }


# ============================================================================
# Model Configuration
# ============================================================================

@router.get("/models")
async def get_ai_models(
    feature: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get all AI model configurations"""
    supabase = get_supabase_client()

    query = supabase.table("ai_model_configs").select("*")
    if feature:
        query = query.eq("feature", feature)

    result = query.order("feature").order("priority", desc=True).execute()

    return {"models": result.data or []}


@router.post("/models")
async def create_ai_model_config(
    data: AIModelConfigCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create new AI model configuration"""
    supabase = get_supabase_client()

    insert_data = data.model_dump()
    insert_data["created_by"] = admin["id"]

    result = supabase.table("ai_model_configs").insert(insert_data).execute()

    return {"success": True, "model": result.data[0] if result.data else None}


@router.patch("/models/{model_id}")
async def update_ai_model_config(
    model_id: str,
    data: AIModelConfigUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Update AI model configuration"""
    supabase = get_supabase_client()

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("ai_model_configs").update(update_data).eq("id", model_id).execute()

    return {"success": True, "model": result.data[0] if result.data else None}


@router.delete("/models/{model_id}")
async def delete_ai_model_config(
    model_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Delete AI model configuration"""
    supabase = get_supabase_client()

    supabase.table("ai_model_configs").delete().eq("id", model_id).execute()

    return {"success": True, "message": "Model configuration deleted"}


# ============================================================================
# Prompts Management
# ============================================================================

@router.get("/prompts")
async def get_ai_prompts(
    feature: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get all AI prompts"""
    supabase = get_supabase_client()

    query = supabase.table("ai_prompts").select("*")
    if feature:
        query = query.eq("feature", feature)

    result = query.order("feature").order("name").execute()

    return {"prompts": result.data or []}


@router.get("/prompts/{prompt_id}")
async def get_ai_prompt(
    prompt_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get single AI prompt with history"""
    supabase = get_supabase_client()

    prompt = supabase.table("ai_prompts").select("*").eq("id", prompt_id).single().execute()
    if not prompt.data:
        raise HTTPException(status_code=404, detail="Prompt not found")

    history = supabase.table("ai_prompts_history").select("*").eq(
        "prompt_id", prompt_id
    ).order("version", desc=True).execute()

    return {"prompt": prompt.data, "history": history.data or []}


@router.post("/prompts")
async def create_ai_prompt(
    data: AIPromptCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create new AI prompt"""
    supabase = get_supabase_client()

    insert_data = data.model_dump()
    insert_data["created_by"] = admin["id"]
    insert_data["version"] = 1

    result = supabase.table("ai_prompts").insert(insert_data).execute()

    return {"success": True, "prompt": result.data[0] if result.data else None}


@router.patch("/prompts/{prompt_id}")
async def update_ai_prompt(
    prompt_id: str,
    data: AIPromptUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Update AI prompt (creates history entry)"""
    supabase = get_supabase_client()

    # Get current prompt
    current = supabase.table("ai_prompts").select("*").eq("id", prompt_id).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Save to history
    history_data = {
        "prompt_id": prompt_id,
        "version": current.data["version"],
        "system_prompt": current.data["system_prompt"],
        "user_prompt_template": current.data.get("user_prompt_template"),
        "changed_by": admin["id"]
    }
    supabase.table("ai_prompts_history").insert(history_data).execute()

    # Update prompt
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["version"] = current.data["version"] + 1

    result = supabase.table("ai_prompts").update(update_data).eq("id", prompt_id).execute()

    return {"success": True, "prompt": result.data[0] if result.data else None}


@router.get("/prompts/{prompt_id}/history")
async def get_prompt_history(
    prompt_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get prompt version history"""
    supabase = get_supabase_client()

    result = supabase.table("ai_prompts_history").select("*").eq(
        "prompt_id", prompt_id
    ).order("version", desc=True).execute()

    return {"history": result.data or []}


@router.post("/prompts/{prompt_id}/rollback/{version}")
async def rollback_prompt(
    prompt_id: str,
    version: int,
    admin: dict = Depends(get_current_admin)
):
    """Rollback prompt to previous version"""
    supabase = get_supabase_client()

    # Get historical version
    history = supabase.table("ai_prompts_history").select("*").eq(
        "prompt_id", prompt_id
    ).eq("version", version).single().execute()

    if not history.data:
        raise HTTPException(status_code=404, detail="Version not found")

    # Get current version number
    current = supabase.table("ai_prompts").select("version").eq("id", prompt_id).single().execute()

    # Save current to history first
    current_prompt = supabase.table("ai_prompts").select("*").eq("id", prompt_id).single().execute()
    history_data = {
        "prompt_id": prompt_id,
        "version": current_prompt.data["version"],
        "system_prompt": current_prompt.data["system_prompt"],
        "user_prompt_template": current_prompt.data.get("user_prompt_template"),
        "changed_by": admin["id"]
    }
    supabase.table("ai_prompts_history").insert(history_data).execute()

    # Update with old version
    update_data = {
        "system_prompt": history.data["system_prompt"],
        "user_prompt_template": history.data.get("user_prompt_template"),
        "version": current.data["version"] + 1
    }
    supabase.table("ai_prompts").update(update_data).eq("id", prompt_id).execute()

    return {"success": True, "message": f"Rolled back to version {version}"}


# ============================================================================
# Recommendation Rules
# ============================================================================

@router.get("/recommendation-rules")
async def get_recommendation_rules(
    rule_type: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get all recommendation rule configurations"""
    supabase = get_supabase_client()

    query = supabase.table("recommendation_rules_config").select("*")
    if rule_type:
        query = query.eq("rule_type", rule_type)

    result = query.order("priority", desc=True).execute()

    return {"rules": result.data or []}


@router.patch("/recommendation-rules/{rule_id}")
async def update_recommendation_rule(
    rule_id: str,
    data: RuleConfigUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Update recommendation rule configuration"""
    supabase = get_supabase_client()

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("recommendation_rules_config").update(update_data).eq("id", rule_id).execute()

    return {"success": True, "rule": result.data[0] if result.data else None}


@router.post("/recommendation-rules/{rule_id}/toggle")
async def toggle_recommendation_rule(
    rule_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Toggle recommendation rule enabled/disabled"""
    supabase = get_supabase_client()

    # Get current state
    current = supabase.table("recommendation_rules_config").select("is_enabled").eq("id", rule_id).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Rule not found")

    new_state = not current.data["is_enabled"]
    supabase.table("recommendation_rules_config").update({"is_enabled": new_state}).eq("id", rule_id).execute()

    return {"success": True, "is_enabled": new_state}


# ============================================================================
# Cost Budgets
# ============================================================================

@router.get("/budgets")
async def get_ai_budgets(
    admin: dict = Depends(get_current_admin)
):
    """Get AI cost budgets"""
    supabase = get_supabase_client()

    result = supabase.table("ai_cost_budgets").select("*").order("scope_type").execute()

    return {"budgets": result.data or []}


@router.post("/budgets")
async def create_ai_budget(
    data: AIBudgetCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create AI cost budget"""
    supabase = get_supabase_client()

    result = supabase.table("ai_cost_budgets").insert(data.model_dump()).execute()

    return {"success": True, "budget": result.data[0] if result.data else None}


@router.patch("/budgets/{budget_id}")
async def update_ai_budget(
    budget_id: str,
    data: AIBudgetUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Update AI cost budget"""
    supabase = get_supabase_client()

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("ai_cost_budgets").update(update_data).eq("id", budget_id).execute()

    return {"success": True, "budget": result.data[0] if result.data else None}


@router.delete("/budgets/{budget_id}")
async def delete_ai_budget(
    budget_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Delete AI cost budget"""
    supabase = get_supabase_client()

    supabase.table("ai_cost_budgets").delete().eq("id", budget_id).execute()

    return {"success": True, "message": "Budget deleted"}


# ============================================================================
# AI Usage by Feature
# ============================================================================

@router.get("/usage-by-feature")
async def get_ai_usage_by_feature(
    days: int = Query(default=7, le=30),
    admin: dict = Depends(get_current_admin)
):
    """Get AI usage breakdown by feature"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    result = supabase.table("ai_usage_logs").select(
        "endpoint, input_tokens, output_tokens, cost_usd"
    ).gte("created_at", start_date.isoformat()).execute()

    features = {}
    for log in (result.data or []):
        feature = log.get("endpoint", "unknown")
        if feature not in features:
            features[feature] = {"requests": 0, "tokens": 0, "cost": 0}
        features[feature]["requests"] += 1
        features[feature]["tokens"] += (log.get("input_tokens", 0) + log.get("output_tokens", 0))
        features[feature]["cost"] += float(log.get("cost_usd", 0) or 0)

    result_list = []
    for feature, data in sorted(features.items(), key=lambda x: x[1]["cost"], reverse=True):
        result_list.append({
            "feature": feature,
            "requests": data["requests"],
            "tokens": data["tokens"],
            "cost": round(data["cost"], 2)
        })

    return {"features": result_list, "period_days": days}


# ============================================================================
# Daily Cost Chart
# ============================================================================

@router.get("/cost-chart")
async def get_ai_cost_chart(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get daily AI cost for chart"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    result = supabase.table("ai_usage_logs").select(
        "created_at, cost_usd"
    ).gte("created_at", start_date.isoformat()).execute()

    daily = {}
    for log in (result.data or []):
        date = log["created_at"][:10]
        daily[date] = daily.get(date, 0) + float(log.get("cost_usd", 0) or 0)

    chart_data = []
    current = start_date.date()
    end = datetime.utcnow().date()
    while current <= end:
        date_str = current.isoformat()
        chart_data.append({
            "date": date_str,
            "cost": round(daily.get(date_str, 0), 2)
        })
        current += timedelta(days=1)

    return {"data": chart_data, "period_days": days}


# ============================================================================
# Test Prompt (Playground)
# ============================================================================

@router.post("/test-prompt")
async def test_prompt(
    data: TestPromptRequest,
    admin: dict = Depends(get_current_admin)
):
    """Test a prompt with sample input"""
    supabase = get_supabase_client()

    # Get prompt
    prompt = supabase.table("ai_prompts").select("*").eq("id", data.prompt_id).single().execute()
    if not prompt.data:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # In real implementation, would call AI provider
    # For now, return mock response
    return {
        "success": True,
        "prompt_name": prompt.data["name"],
        "system_prompt": prompt.data["system_prompt"],
        "user_input": data.test_input,
        "response": f"[Mock AI Response to: {data.test_input[:100]}...]",
        "tokens_used": 150,
        "latency_ms": 450
    }
