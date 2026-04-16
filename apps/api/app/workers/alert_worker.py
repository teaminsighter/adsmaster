"""
Alert Worker

Background worker for checking alerts and updating goal progress.
Runs on a schedule to evaluate alert conditions and trigger notifications.
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.services.supabase_client import get_supabase_client
from app.services.alert_service import AlertService


class AlertWorker:
    """
    Background worker for alert processing.

    Responsibilities:
    - Check alert conditions based on frequency (hourly, daily)
    - Update goal progress
    - Update budget pacing
    - Reset daily counters at midnight
    """

    def __init__(self):
        self.supabase = get_supabase_client()
        self.alert_service = AlertService()

    async def run_hourly_checks(self):
        """
        Run checks for alerts with hourly frequency.
        Should be scheduled to run every hour.
        """
        print(f"[{datetime.utcnow()}] Running hourly alert checks...")

        # Get all active hourly alerts
        result = self.supabase.table("ad_alerts").select("*").eq("is_active", True).eq("check_frequency", "hourly").execute()

        alerts = result.data or []
        print(f"Found {len(alerts)} hourly alerts to check")

        triggered_count = 0
        for alert in alerts:
            try:
                triggered = await self._check_single_alert(alert)
                if triggered:
                    triggered_count += 1
            except Exception as e:
                print(f"Error checking alert {alert['id']}: {e}")

        print(f"Hourly check complete. {triggered_count} alerts triggered.")

    async def run_daily_checks(self):
        """
        Run checks for alerts with daily frequency.
        Should be scheduled to run once per day.
        """
        print(f"[{datetime.utcnow()}] Running daily alert checks...")

        # Get all active daily alerts
        result = self.supabase.table("ad_alerts").select("*").eq("is_active", True).eq("check_frequency", "daily").execute()

        alerts = result.data or []
        print(f"Found {len(alerts)} daily alerts to check")

        triggered_count = 0
        for alert in alerts:
            try:
                triggered = await self._check_single_alert(alert)
                if triggered:
                    triggered_count += 1
            except Exception as e:
                print(f"Error checking alert {alert['id']}: {e}")

        print(f"Daily check complete. {triggered_count} alerts triggered.")

        # Also reset daily counters
        await self.reset_daily_counters()

    async def _check_single_alert(self, alert: Dict[str, Any]) -> bool:
        """
        Check a single alert and trigger if conditions are met.

        Returns:
            bool: True if alert was triggered
        """
        org_id = alert["organization_id"]
        metric = alert["metric"]
        time_window = alert.get("time_window", "day")

        # Get current and previous metric values
        current_value, previous_value = await self.alert_service.get_metric_value(
            metric=metric,
            org_id=org_id,
            ad_account_id=alert.get("ad_account_id"),
            platform=alert.get("platform"),
            time_window=time_window
        )

        # Check the alert
        history_record = await self.alert_service.check_alert(
            alert=alert,
            current_value=current_value,
            previous_value=previous_value
        )

        if history_record:
            # Send notifications
            await self.alert_service.send_notifications(alert, history_record)
            return True

        # Update last_checked_at even if not triggered
        self.supabase.table("ad_alerts").update({
            "last_checked_at": datetime.utcnow().isoformat()
        }).eq("id", alert["id"]).execute()

        return False

    async def update_all_goals(self):
        """
        Update progress for all active goals.
        Should be run periodically (e.g., every hour).
        """
        print(f"[{datetime.utcnow()}] Updating goal progress...")

        today = datetime.utcnow().date()

        # Get all active goals that are within their period
        result = self.supabase.table("ad_goals").select("id").eq("is_active", True).lte("period_start", today.isoformat()).gte("period_end", today.isoformat()).execute()

        goals = result.data or []
        print(f"Found {len(goals)} active goals to update")

        for goal in goals:
            try:
                await self.alert_service.update_goal_progress(goal["id"])
            except Exception as e:
                print(f"Error updating goal {goal['id']}: {e}")

        print("Goal update complete.")

    async def update_all_budget_pacing(self):
        """
        Update all budget pacing records for the current month.
        Should be run periodically (e.g., every hour).
        """
        print(f"[{datetime.utcnow()}] Updating budget pacing...")

        current_period = datetime.utcnow().strftime("%Y-%m")

        result = self.supabase.table("budget_pacing").select("id").eq("period", current_period).execute()

        pacing_records = result.data or []
        print(f"Found {len(pacing_records)} budget pacing records to update")

        alerts_to_send = []
        for record in pacing_records:
            try:
                should_alert = await self.alert_service.update_budget_pacing(record["id"])
                if should_alert:
                    alerts_to_send.append(record["id"])
            except Exception as e:
                print(f"Error updating budget pacing {record['id']}: {e}")

        # Send budget alerts
        for pacing_id in alerts_to_send:
            await self._send_budget_alert(pacing_id)

        print(f"Budget pacing update complete. {len(alerts_to_send)} budget alerts triggered.")

    async def _send_budget_alert(self, pacing_id: str):
        """
        Send notification for budget threshold alert.
        """
        result = self.supabase.table("budget_pacing").select("*").eq("id", pacing_id).execute()
        if not result.data:
            return

        pacing = result.data[0]

        # Get org settings for notification preferences
        org_result = self.supabase.table("organizations").select("name").eq("id", pacing["organization_id"]).execute()

        org_name = org_result.data[0]["name"] if org_result.data else "Unknown"

        # Format values
        spent_pct = (pacing["total_spent_micros"] / pacing["monthly_budget_micros"] * 100) if pacing["monthly_budget_micros"] > 0 else 0
        spent_str = f"${pacing['total_spent_micros'] / 1_000_000:,.2f}"
        budget_str = f"${pacing['monthly_budget_micros'] / 1_000_000:,.2f}"

        print(f"Budget alert: {org_name} - {pacing.get('name', 'Overall')} at {spent_pct:.1f}% ({spent_str} of {budget_str})")

        # TODO: Send email/slack notifications for budget alerts

    async def reset_daily_counters(self):
        """
        Reset daily alert counters.
        Should be run once per day at midnight.
        """
        print(f"[{datetime.utcnow()}] Resetting daily alert counters...")

        await self.alert_service.reset_daily_counters()

        print("Daily counters reset complete.")

    async def cleanup_old_history(self, days: int = 90):
        """
        Clean up old alert history records.
        Should be run periodically (e.g., weekly).
        """
        print(f"[{datetime.utcnow()}] Cleaning up alert history older than {days} days...")

        cutoff = datetime.utcnow() - timedelta(days=days)

        # Delete old resolved alerts
        result = self.supabase.table("alert_history").delete().eq("resolved", True).lt("triggered_at", cutoff.isoformat()).execute()

        deleted_count = len(result.data) if result.data else 0
        print(f"Deleted {deleted_count} old alert history records.")


async def run_worker():
    """
    Main worker entry point.
    Runs the appropriate checks based on current time.
    """
    worker = AlertWorker()

    now = datetime.utcnow()
    hour = now.hour

    # Always update goals and budget pacing
    await worker.update_all_goals()
    await worker.update_all_budget_pacing()

    # Run hourly alert checks
    await worker.run_hourly_checks()

    # Run daily checks at midnight UTC
    if hour == 0:
        await worker.run_daily_checks()

    # Run cleanup weekly (Sunday at midnight)
    if hour == 0 and now.weekday() == 6:
        await worker.cleanup_old_history()


if __name__ == "__main__":
    # For manual testing
    asyncio.run(run_worker())
