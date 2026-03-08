"""
Sync Worker

Background worker that syncs data from ad platforms to the database.
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import Optional

from ..services.supabase_client import get_supabase_client
from ..integrations.google_ads.adapter_factory import get_adapter


async def run_account_sync(
    account_id: str,
    sync_id: str,
    sync_type: str = "full",
):
    """
    Run a full sync for an ad account.

    This is called as a background task from the /sync/trigger endpoint.

    Args:
        account_id: The ad_accounts.id to sync
        sync_id: The sync_logs.id for this sync run
        sync_type: "full", "incremental", or "metrics_only"
    """
    supabase = get_supabase_client()

    stats = {
        "campaigns_synced": 0,
        "ad_groups_synced": 0,
        "keywords_synced": 0,
        "metrics_synced": 0,
    }

    try:
        # Get account details
        account = supabase.table("ad_accounts").select(
            "*, ad_platforms(name)"
        ).eq("id", account_id).execute()

        if not account.data:
            raise Exception("Account not found")

        account_data = account.data[0]
        platform = account_data.get("ad_platforms", {}).get("name")

        if platform == "google_ads":
            stats = await sync_google_ads_account(account_data, sync_type)
        elif platform == "meta_ads":
            # Meta sync will be implemented in Sprint 5
            raise NotImplementedError("Meta sync not yet implemented")
        else:
            raise Exception(f"Unknown platform: {platform}")

        # Update sync log - success
        supabase.table("sync_logs").update({
            "status": "success",
            "completed_at": datetime.utcnow().isoformat(),
            **stats,
        }).eq("id", sync_id).execute()

        # Update account last_sync
        supabase.table("ad_accounts").update({
            "last_sync_at": datetime.utcnow().isoformat(),
            "last_sync_status": "success",
        }).eq("id", account_id).execute()

    except Exception as e:
        # Update sync log - failed
        supabase.table("sync_logs").update({
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
            "error_message": str(e),
            **stats,
        }).eq("id", sync_id).execute()

        # Update account
        supabase.table("ad_accounts").update({
            "last_sync_status": "failed",
        }).eq("id", account_id).execute()

        raise


async def sync_google_ads_account(
    account_data: dict,
    sync_type: str,
) -> dict:
    """
    Sync a Google Ads account.

    Args:
        account_data: Account record from database
        sync_type: Type of sync to perform

    Returns:
        Dict with sync statistics
    """
    supabase = get_supabase_client()

    # Get adapter
    adapter = get_adapter(
        refresh_token=account_data["refresh_token"],
        customer_id=account_data["external_account_id"],
        org_id=account_data["organization_id"],
    )

    stats = {
        "campaigns_synced": 0,
        "ad_groups_synced": 0,
        "keywords_synced": 0,
        "metrics_synced": 0,
    }

    account_id = account_data["id"]

    # 1. Sync campaigns
    if sync_type in ["full", "incremental"]:
        campaigns = await adapter.get_campaigns()

        for campaign in campaigns:
            # Upsert campaign
            existing = supabase.table("campaigns").select("id").eq(
                "ad_account_id", account_id
            ).eq("external_campaign_id", campaign.id).execute()

            campaign_data = {
                "ad_account_id": account_id,
                "external_campaign_id": campaign.id,
                "name": campaign.name,
                "status": campaign.status.value,
                "campaign_type": campaign.campaign_type.value,
                "budget_micros": campaign.budget_micros,
                "currency_code": campaign.currency_code,
                "start_date": campaign.start_date.isoformat() if campaign.start_date else None,
                "end_date": campaign.end_date.isoformat() if campaign.end_date else None,
            }

            if existing.data:
                supabase.table("campaigns").update(campaign_data).eq(
                    "id", existing.data[0]["id"]
                ).execute()
            else:
                supabase.table("campaigns").insert(campaign_data).execute()

            stats["campaigns_synced"] += 1

    # 2. Sync metrics (last 30 days)
    if sync_type in ["full", "metrics_only"]:
        # Get all campaign IDs
        campaigns_result = supabase.table("campaigns").select(
            "id, external_campaign_id"
        ).eq("ad_account_id", account_id).execute()

        date_from = date.today() - timedelta(days=30)
        date_to = date.today()

        for campaign in campaigns_result.data:
            metrics = await adapter.get_campaign_metrics(
                campaign["external_campaign_id"],
                date_from,
                date_to,
            )

            for metric in metrics:
                # Upsert daily metric
                existing = supabase.table("metrics_daily").select("id").eq(
                    "campaign_id", campaign["id"]
                ).eq("metric_date", metric.date.isoformat()).execute()

                metric_data = {
                    "ad_account_id": account_id,
                    "campaign_id": campaign["id"],
                    "metric_date": metric.date.isoformat(),
                    "impressions": metric.impressions,
                    "clicks": metric.clicks,
                    "cost_micros": metric.cost_micros,
                    "conversions": metric.conversions,
                    "conversion_value_micros": metric.conversion_value_micros,
                    "ctr": metric.ctr,
                    "avg_cpc_micros": metric.avg_cpc_micros,
                    "avg_cpa_micros": metric.avg_cpa_micros,
                    "roas": metric.roas,
                }

                if existing.data:
                    supabase.table("metrics_daily").update(metric_data).eq(
                        "id", existing.data[0]["id"]
                    ).execute()
                else:
                    supabase.table("metrics_daily").insert(metric_data).execute()

                stats["metrics_synced"] += 1

    # 3. Sync PMax network breakdown (for PMax campaigns)
    pmax_campaigns = supabase.table("campaigns").select(
        "id, external_campaign_id"
    ).eq("ad_account_id", account_id).eq(
        "campaign_type", "PERFORMANCE_MAX"
    ).execute()

    for campaign in pmax_campaigns.data:
        try:
            breakdown = await adapter.get_pmax_network_breakdown(
                campaign["external_campaign_id"],
                date.today() - timedelta(days=30),
                date.today(),
            )

            for network_data in breakdown:
                # Store as separate metrics_daily rows with network_type
                supabase.table("metrics_daily").upsert({
                    "ad_account_id": account_id,
                    "campaign_id": campaign["id"],
                    "metric_date": date.today().isoformat(),
                    "network_type": network_data.network_type.value,
                    "impressions": network_data.impressions,
                    "clicks": network_data.clicks,
                    "cost_micros": network_data.cost_micros,
                    "conversions": network_data.conversions,
                }, on_conflict="ad_account_id,campaign_id,ad_group_id,keyword_id,metric_date,network_type").execute()

        except Exception:
            # PMax breakdown might not be available for all campaigns
            pass

    return stats


async def sync_keywords_for_campaign(
    adapter,
    account_id: str,
    campaign_id: str,
) -> int:
    """
    Sync keywords for a specific campaign.

    Returns count of keywords synced.
    """
    supabase = get_supabase_client()

    # Get ad groups first
    ad_groups = supabase.table("ad_groups").select(
        "id, external_ad_group_id"
    ).eq("campaign_id", campaign_id).execute()

    count = 0

    for ad_group in ad_groups.data:
        keywords = await adapter.get_keywords(ad_group["external_ad_group_id"])

        for keyword in keywords:
            existing = supabase.table("keywords").select("id").eq(
                "ad_group_id", ad_group["id"]
            ).eq("external_keyword_id", keyword.id).execute()

            keyword_data = {
                "ad_group_id": ad_group["id"],
                "external_keyword_id": keyword.id,
                "text": keyword.text,
                "match_type": keyword.match_type,
                "status": keyword.status,
                "quality_score": keyword.quality_score,
                "cpc_bid_micros": keyword.cpc_bid_micros,
            }

            if existing.data:
                supabase.table("keywords").update(keyword_data).eq(
                    "id", existing.data[0]["id"]
                ).execute()
            else:
                supabase.table("keywords").insert(keyword_data).execute()

            count += 1

    return count
