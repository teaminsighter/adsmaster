"""
Conversion Sync Coordinator

Orchestrates syncing offline conversions to multiple ad platforms (Meta CAPI, Google Ads).
Handles credential retrieval, platform routing, status updates, and logging.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal
from uuid import uuid4

from .meta_capi import MetaCAPISync, MetaCAPIEvent, MetaCAPIResult
from .google_offline import GoogleOfflineSync, GoogleOfflineEvent, GoogleOfflineResult


@dataclass
class SyncResult:
    """Result from syncing to one or more platforms."""
    conversion_id: str
    meta_result: Optional[MetaCAPIResult] = None
    google_result: Optional[GoogleOfflineResult] = None

    @property
    def success(self) -> bool:
        """True if all attempted syncs succeeded."""
        results = [r for r in [self.meta_result, self.google_result] if r]
        return all(r.success for r in results) if results else False

    @property
    def any_success(self) -> bool:
        """True if at least one sync succeeded."""
        results = [r for r in [self.meta_result, self.google_result] if r]
        return any(r.success for r in results) if results else False


@dataclass
class BatchSyncResult:
    """Result from batch syncing multiple conversions."""
    total: int = 0
    synced: int = 0
    failed: int = 0
    skipped: int = 0
    results: List[SyncResult] = field(default_factory=list)
    errors: List[Dict[str, Any]] = field(default_factory=list)


class ConversionSyncCoordinator:
    """
    Coordinates syncing offline conversions to ad platforms.

    Handles:
    - Platform routing based on available click IDs
    - Credential retrieval from database
    - Parallel sync to multiple platforms
    - Status updates and logging

    Usage:
        coordinator = ConversionSyncCoordinator(supabase_client)
        result = await coordinator.sync_conversion(
            conversion_id="xxx",
            org_id="yyy",
            platforms=["meta", "google"]
        )
    """

    def __init__(self, supabase_client):
        """
        Initialize the sync coordinator.

        Args:
            supabase_client: Supabase client for database operations
        """
        self.supabase = supabase_client

    async def get_platform_credentials(
        self,
        org_id: str,
        platform: Literal["google", "meta"],
        account_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Get platform credentials from database.

        Returns credentials dict with access_token and platform-specific fields.
        """
        try:
            # Query ad_accounts table for credentials
            query = self.supabase.table("ad_accounts").select("*").eq(
                "organization_id", org_id
            ).eq("platform", platform).eq("status", "active")

            if account_id:
                query = query.eq("id", account_id)

            result = query.limit(1).execute()

            if result.data and len(result.data) > 0:
                account = result.data[0]
                return {
                    "account_id": account.get("platform_account_id"),
                    "access_token": account.get("access_token"),
                    "refresh_token": account.get("refresh_token"),
                    # Meta-specific
                    "pixel_id": account.get("meta_pixel_id"),
                    # Google-specific
                    "customer_id": account.get("google_customer_id"),
                    "conversion_action_id": account.get("google_conversion_action_id"),
                    "developer_token": account.get("google_developer_token"),
                    "login_customer_id": account.get("google_login_customer_id"),
                }
            return None
        except Exception as e:
            print(f"Error fetching credentials: {e}")
            return None

    async def get_conversion(self, conversion_id: str, org_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversion record from database."""
        try:
            result = self.supabase.table("offline_conversions").select("*").eq(
                "id", conversion_id
            ).eq("organization_id", org_id).single().execute()
            return result.data
        except Exception as e:
            print(f"Error fetching conversion: {e}")
            return None

    async def update_sync_status(
        self,
        conversion_id: str,
        platform: Literal["meta", "google"],
        status: Literal["synced", "failed", "pending", "skipped"],
        error_message: Optional[str] = None,
        sync_id: Optional[str] = None,
    ):
        """Update the sync status for a conversion."""
        try:
            update_data = {
                f"{platform}_sync_status": status,
                f"{platform}_synced_at": datetime.now(timezone.utc).isoformat() if status == "synced" else None,
            }

            if error_message:
                update_data[f"{platform}_sync_error"] = error_message

            if sync_id:
                update_data[f"{platform}_sync_id"] = sync_id

            self.supabase.table("offline_conversions").update(update_data).eq(
                "id", conversion_id
            ).execute()
        except Exception as e:
            print(f"Error updating sync status: {e}")

    async def log_sync_attempt(
        self,
        conversion_id: str,
        org_id: str,
        platform: str,
        success: bool,
        request_payload: Optional[Dict] = None,
        response_data: Optional[Dict] = None,
        error_message: Optional[str] = None,
    ):
        """Log a sync attempt for audit purposes."""
        try:
            self.supabase.table("sync_logs").insert({
                "id": str(uuid4()),
                "organization_id": org_id,
                "conversion_id": conversion_id,
                "platform": platform,
                "success": success,
                "request_payload": request_payload,
                "response_data": response_data,
                "error_message": error_message,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            # Don't fail the sync if logging fails
            print(f"Error logging sync attempt: {e}")

    async def sync_to_meta(
        self,
        conversion: Dict[str, Any],
        credentials: Dict[str, Any],
        test_event_code: Optional[str] = None,
    ) -> MetaCAPIResult:
        """Sync a conversion to Meta CAPI."""
        sync, event = MetaCAPISync.from_conversion(
            conversion=conversion,
            pixel_id=credentials["pixel_id"],
            access_token=credentials["access_token"],
            test_event_code=test_event_code,
        )
        return await sync.send_event(event)

    async def sync_to_google(
        self,
        conversion: Dict[str, Any],
        credentials: Dict[str, Any],
    ) -> GoogleOfflineResult:
        """Sync a conversion to Google Ads."""
        sync, event = GoogleOfflineSync.from_conversion(
            conversion=conversion,
            customer_id=credentials["customer_id"],
            conversion_action_id=credentials["conversion_action_id"],
            access_token=credentials["access_token"],
            developer_token=credentials["developer_token"],
            login_customer_id=credentials.get("login_customer_id"),
        )
        return await sync.upload_conversion(event)

    def should_sync_to_platform(
        self,
        conversion: Dict[str, Any],
        platform: Literal["meta", "google"],
    ) -> bool:
        """
        Determine if a conversion should be synced to a platform.

        Rules:
        - Meta: Has fbclid OR fbc cookie OR email/phone (for enhanced matching)
        - Google: Has gclid OR email/phone (for enhanced conversions)
        """
        has_pii = bool(conversion.get("email") or conversion.get("phone"))

        if platform == "meta":
            return bool(
                conversion.get("fbclid") or
                conversion.get("fbc") or
                conversion.get("fbp") or
                has_pii
            )
        elif platform == "google":
            return bool(
                conversion.get("gclid") or
                has_pii
            )
        return False

    async def sync_conversion(
        self,
        conversion_id: str,
        org_id: str,
        platforms: Optional[List[Literal["meta", "google"]]] = None,
        force: bool = False,
        meta_test_event_code: Optional[str] = None,
    ) -> SyncResult:
        """
        Sync a single conversion to specified platforms.

        Args:
            conversion_id: ID of the conversion to sync
            org_id: Organization ID
            platforms: List of platforms to sync to (defaults to both)
            force: Force sync even if already synced
            meta_test_event_code: Optional Meta test event code

        Returns:
            SyncResult with outcomes for each platform
        """
        result = SyncResult(conversion_id=conversion_id)

        # Get conversion
        conversion = await self.get_conversion(conversion_id, org_id)
        if not conversion:
            return result

        # Default to both platforms
        if platforms is None:
            platforms = ["meta", "google"]

        # Sync to Meta
        if "meta" in platforms:
            current_status = conversion.get("meta_sync_status")
            if force or current_status not in ["synced"]:
                if self.should_sync_to_platform(conversion, "meta"):
                    credentials = await self.get_platform_credentials(org_id, "meta")
                    if credentials and credentials.get("pixel_id"):
                        try:
                            result.meta_result = await self.sync_to_meta(
                                conversion, credentials, meta_test_event_code
                            )
                            status = "synced" if result.meta_result.success else "failed"
                            await self.update_sync_status(
                                conversion_id, "meta", status,
                                error_message=result.meta_result.error_message,
                                sync_id=result.meta_result.fbtrace_id,
                            )
                            await self.log_sync_attempt(
                                conversion_id, org_id, "meta",
                                result.meta_result.success,
                                response_data={"fbtrace_id": result.meta_result.fbtrace_id},
                                error_message=result.meta_result.error_message,
                            )
                        except Exception as e:
                            result.meta_result = MetaCAPIResult(
                                success=False, error_message=str(e)
                            )
                            await self.update_sync_status(
                                conversion_id, "meta", "failed", error_message=str(e)
                            )
                    else:
                        # No credentials available
                        await self.update_sync_status(
                            conversion_id, "meta", "skipped",
                            error_message="No Meta credentials configured"
                        )
                else:
                    # No attribution data for Meta
                    await self.update_sync_status(
                        conversion_id, "meta", "skipped",
                        error_message="No Meta attribution data (fbclid/fbc/email)"
                    )

        # Sync to Google
        if "google" in platforms:
            current_status = conversion.get("google_sync_status")
            if force or current_status not in ["synced"]:
                if self.should_sync_to_platform(conversion, "google"):
                    credentials = await self.get_platform_credentials(org_id, "google")
                    if credentials and credentials.get("customer_id"):
                        try:
                            result.google_result = await self.sync_to_google(
                                conversion, credentials
                            )
                            status = "synced" if result.google_result.success else "failed"
                            await self.update_sync_status(
                                conversion_id, "google", status,
                                error_message=result.google_result.error_message,
                                sync_id=result.google_result.job_id,
                            )
                            await self.log_sync_attempt(
                                conversion_id, org_id, "google",
                                result.google_result.success,
                                response_data={"job_id": result.google_result.job_id},
                                error_message=result.google_result.error_message,
                            )
                        except Exception as e:
                            result.google_result = GoogleOfflineResult(
                                success=False, error_message=str(e)
                            )
                            await self.update_sync_status(
                                conversion_id, "google", "failed", error_message=str(e)
                            )
                    else:
                        await self.update_sync_status(
                            conversion_id, "google", "skipped",
                            error_message="No Google Ads credentials configured"
                        )
                else:
                    await self.update_sync_status(
                        conversion_id, "google", "skipped",
                        error_message="No Google attribution data (gclid/email)"
                    )

        return result

    async def sync_batch(
        self,
        conversion_ids: List[str],
        org_id: str,
        platforms: Optional[List[Literal["meta", "google"]]] = None,
        force: bool = False,
        concurrency: int = 10,
    ) -> BatchSyncResult:
        """
        Sync multiple conversions in parallel.

        Args:
            conversion_ids: List of conversion IDs to sync
            org_id: Organization ID
            platforms: Platforms to sync to
            force: Force re-sync even if already synced
            concurrency: Max parallel syncs

        Returns:
            BatchSyncResult with aggregate outcomes
        """
        batch_result = BatchSyncResult(total=len(conversion_ids))

        # Create semaphore for concurrency limiting
        semaphore = asyncio.Semaphore(concurrency)

        async def sync_with_limit(conv_id: str) -> SyncResult:
            async with semaphore:
                return await self.sync_conversion(
                    conv_id, org_id, platforms, force
                )

        # Run syncs in parallel with concurrency limit
        tasks = [sync_with_limit(cid) for cid in conversion_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                batch_result.failed += 1
                batch_result.errors.append({
                    "conversion_id": conversion_ids[i],
                    "error": str(result),
                })
            elif isinstance(result, SyncResult):
                batch_result.results.append(result)
                if result.success:
                    batch_result.synced += 1
                elif result.any_success:
                    batch_result.synced += 1  # Count partial success
                else:
                    batch_result.failed += 1

        return batch_result

    async def sync_pending(
        self,
        org_id: str,
        platform: Optional[Literal["meta", "google"]] = None,
        limit: int = 100,
    ) -> BatchSyncResult:
        """
        Sync all pending conversions for an organization.

        Args:
            org_id: Organization ID
            platform: Optional specific platform to sync
            limit: Max conversions to process

        Returns:
            BatchSyncResult
        """
        try:
            # Build query for pending conversions
            query = self.supabase.table("offline_conversions").select("id").eq(
                "organization_id", org_id
            )

            if platform == "meta":
                query = query.eq("meta_sync_status", "pending")
            elif platform == "google":
                query = query.eq("google_sync_status", "pending")
            else:
                # Either platform pending
                query = query.or_("meta_sync_status.eq.pending,google_sync_status.eq.pending")

            query = query.limit(limit)
            result = query.execute()

            if result.data:
                conversion_ids = [c["id"] for c in result.data]
                platforms = [platform] if platform else None
                return await self.sync_batch(conversion_ids, org_id, platforms)

            return BatchSyncResult()

        except Exception as e:
            return BatchSyncResult(errors=[{"error": str(e)}])
