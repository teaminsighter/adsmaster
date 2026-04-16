"""
Alert Service

Handles alert evaluation, triggering, and notifications.
Updated to match new single-metric schema.
"""
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import httpx

from app.services.supabase_client import get_supabase_client


class AlertCondition:
    """Alert condition evaluator."""

    ABOVE = "above"
    BELOW = "below"
    INCREASES_BY = "increases_by"
    DECREASES_BY = "decreases_by"
    EQUALS = "equals"

    @staticmethod
    def evaluate(
        condition: str,
        current_value: float,
        threshold: float,
        previous_value: Optional[float] = None
    ) -> tuple[bool, Optional[float]]:
        """
        Evaluate if alert condition is met.

        Returns:
            tuple: (triggered: bool, change_percentage: Optional[float])
        """
        change_pct = None

        if condition == AlertCondition.ABOVE:
            triggered = current_value > threshold

        elif condition == AlertCondition.BELOW:
            triggered = current_value < threshold

        elif condition == AlertCondition.INCREASES_BY:
            if previous_value is None or previous_value == 0:
                triggered = False
            else:
                change_pct = ((current_value - previous_value) / previous_value * 100)
                triggered = change_pct >= threshold

        elif condition == AlertCondition.DECREASES_BY:
            if previous_value is None or previous_value == 0:
                triggered = False
            else:
                change_pct = ((previous_value - current_value) / previous_value * 100)
                triggered = change_pct >= threshold

        elif condition == AlertCondition.EQUALS:
            triggered = abs(current_value - threshold) < 0.001

        else:
            triggered = False

        return triggered, change_pct


class AlertService:
    """Service for managing and sending alerts."""

    def __init__(self):
        self.supabase = get_supabase_client()

    def _parse_notification_channels(self, data) -> List[str]:
        """Parse notification channels from database."""
        if isinstance(data, list):
            return data
        if isinstance(data, str):
            try:
                return json.loads(data)
            except:
                return ["email", "in_app"]
        return ["email", "in_app"]

    def _format_value(self, metric: str, value: float) -> str:
        """Format metric value for display."""
        if metric in ["spend", "revenue", "cpa", "cpl"]:
            return f"${value / 1_000_000:.2f}"
        elif metric in ["ctr"]:
            return f"{value:.2f}%"
        elif metric in ["roas"]:
            return f"{value:.2f}x"
        else:
            return f"{value:,.0f}"

    def _determine_severity(self, condition: str, metric: str, threshold: float, actual: float) -> str:
        """Determine alert severity based on how far over/under threshold."""
        if condition in ["above", "increases_by"]:
            ratio = actual / threshold if threshold > 0 else 1
            if ratio > 1.5:
                return "critical"
            elif ratio > 1.2:
                return "warning"
            return "info"
        elif condition in ["below", "decreases_by"]:
            ratio = threshold / actual if actual > 0 else 2
            if ratio > 1.5:
                return "critical"
            elif ratio > 1.2:
                return "warning"
            return "info"
        return "warning"

    def _generate_message(self, alert: Dict, current_value: float, previous_value: Optional[float]) -> str:
        """Generate alert message."""
        metric = alert["metric"]
        condition = alert["condition"]
        threshold = float(alert["threshold"])

        threshold_str = self._format_value(metric, threshold)
        actual_str = self._format_value(metric, current_value)

        if condition == "above":
            return f"{metric.upper()} ({actual_str}) exceeded threshold of {threshold_str}"
        elif condition == "below":
            return f"{metric.upper()} ({actual_str}) dropped below threshold of {threshold_str}"
        elif condition == "increases_by":
            change = ((current_value - previous_value) / previous_value * 100) if previous_value else 0
            return f"{metric.upper()} increased by {change:.1f}% (threshold: {threshold:.1f}%)"
        elif condition == "decreases_by":
            change = ((previous_value - current_value) / previous_value * 100) if previous_value else 0
            return f"{metric.upper()} decreased by {change:.1f}% (threshold: {threshold:.1f}%)"
        else:
            return f"{metric.upper()} alert triggered: {actual_str}"

    async def check_alert(
        self,
        alert: Dict[str, Any],
        current_value: float,
        previous_value: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Check if an alert should be triggered.

        Args:
            alert: Alert rule from database
            current_value: Current metric value
            previous_value: Previous period value (for comparison alerts)

        Returns:
            Alert history record if triggered, None otherwise
        """
        alert_id = alert["id"]
        org_id = alert["organization_id"]

        # Check if alert is active and not muted
        if not alert.get("is_active", True):
            return None

        if alert.get("is_muted", False):
            muted_until = alert.get("muted_until")
            if muted_until:
                try:
                    muted_dt = datetime.fromisoformat(str(muted_until).replace("Z", "+00:00"))
                    if datetime.utcnow() < muted_dt.replace(tzinfo=None):
                        return None
                except:
                    pass

        # Check cooldown (in minutes)
        last_triggered = alert.get("last_triggered_at")
        if last_triggered:
            try:
                last_dt = datetime.fromisoformat(str(last_triggered).replace("Z", "+00:00"))
                cooldown_minutes = alert.get("cooldown_minutes", 60)
                if datetime.utcnow() < last_dt.replace(tzinfo=None) + timedelta(minutes=cooldown_minutes):
                    return None
            except:
                pass

        # Check max alerts per day
        alerts_today = alert.get("alerts_today", 0)
        max_per_day = alert.get("max_alerts_per_day", 10)
        if alerts_today >= max_per_day:
            return None

        # Evaluate condition
        triggered, change_pct = AlertCondition.evaluate(
            condition=alert["condition"],
            current_value=current_value,
            threshold=float(alert["threshold"]),
            previous_value=previous_value
        )

        if not triggered:
            return None

        # Determine severity and generate message
        severity = self._determine_severity(
            alert["condition"],
            alert["metric"],
            float(alert["threshold"]),
            current_value
        )
        message = self._generate_message(alert, current_value, previous_value)
        notification_channels = self._parse_notification_channels(alert.get("notification_channels"))

        # Create alert history record
        history_data = {
            "alert_id": alert_id,
            "organization_id": org_id,
            "alert_name": alert["name"],
            "metric": alert["metric"],
            "condition": alert["condition"],
            "threshold": float(alert["threshold"]),
            "triggered_value": current_value,
            "previous_value": previous_value,
            "change_pct": change_pct,
            "severity": severity,
            "message": message,
            "notification_channels": json.dumps(notification_channels),
            "notification_sent": False,
            "triggered_at": datetime.utcnow().isoformat()
        }

        # Insert alert history
        result = self.supabase.table("alert_history").insert(history_data).execute()

        if not result.data:
            return None

        history_record = result.data[0]

        # Update alert stats
        self.supabase.table("ad_alerts").update({
            "last_checked_at": datetime.utcnow().isoformat(),
            "last_triggered_at": datetime.utcnow().isoformat(),
            "alerts_today": alerts_today + 1,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", alert_id).execute()

        return history_record

    async def send_notifications(
        self,
        alert: Dict[str, Any],
        history_record: Dict[str, Any]
    ):
        """Send notifications for a triggered alert."""
        history_id = history_record["id"]
        channels = self._parse_notification_channels(alert.get("notification_channels"))

        notification_sent = False

        # Email notification
        if "email" in channels:
            try:
                await self._send_email_notification(alert, history_record)
                notification_sent = True
            except Exception as e:
                print(f"Failed to send email notification: {e}")

        # Slack notification
        if "slack" in channels:
            webhook_url = alert.get("slack_webhook_url")
            if webhook_url:
                try:
                    await self._send_slack_notification(alert, history_record, webhook_url)
                    notification_sent = True
                except Exception as e:
                    print(f"Failed to send Slack notification: {e}")

        # In-app is always sent (stored in history)
        if "in_app" in channels:
            notification_sent = True

        # Update history record
        self.supabase.table("alert_history").update({
            "notification_sent": notification_sent
        }).eq("id", history_id).execute()

    async def _send_email_notification(
        self,
        alert: Dict[str, Any],
        history: Dict[str, Any]
    ):
        """Send email notification."""
        try:
            from app.services.email_service import EmailService
            email_service = EmailService()

            subject = f"[Alert] {alert['name']}"
            body = f"""
Alert: {alert['name']}
{'-' * 40}

{history.get('message', '')}

Metric: {history['metric'].upper()}
Triggered Value: {self._format_value(history['metric'], history['triggered_value'])}
Threshold: {self._format_value(history['metric'], history['threshold'])}
Severity: {history.get('severity', 'warning').upper()}

Triggered at: {history['triggered_at']}

---
Manage alerts in AdsMaster: /settings/goals
            """

            # Get organization users for notification
            org_id = alert["organization_id"]
            users_result = self.supabase.table("users").select("email").eq("organization_id", org_id).execute()

            for user in users_result.data or []:
                email = user.get("email")
                if email:
                    await email_service.send_email(
                        to_email=email,
                        subject=subject,
                        html_content=f"<pre>{body}</pre>",
                        text_content=body
                    )
        except Exception as e:
            print(f"Email notification error: {e}")

    async def _send_slack_notification(
        self,
        alert: Dict[str, Any],
        history: Dict[str, Any],
        webhook_url: str
    ):
        """Send Slack notification."""
        severity = history.get("severity", "warning")
        color = "#EF4444" if severity == "critical" else "#F59E0B" if severity == "warning" else "#3B82F6"

        slack_message = {
            "attachments": [
                {
                    "color": color,
                    "title": f":warning: Alert: {alert['name']}",
                    "text": history.get("message", ""),
                    "fields": [
                        {
                            "title": "Metric",
                            "value": history["metric"].upper(),
                            "short": True
                        },
                        {
                            "title": "Severity",
                            "value": severity.upper(),
                            "short": True
                        },
                        {
                            "title": "Value",
                            "value": self._format_value(history["metric"], history["triggered_value"]),
                            "short": True
                        },
                        {
                            "title": "Threshold",
                            "value": self._format_value(history["metric"], history["threshold"]),
                            "short": True
                        }
                    ],
                    "footer": "AdsMaster Alerts",
                    "ts": int(datetime.utcnow().timestamp())
                }
            ]
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=slack_message,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()

    async def get_metric_value(
        self,
        metric: str,
        org_id: str,
        ad_account_id: Optional[str] = None,
        platform: Optional[str] = None,
        time_window: str = "day"
    ) -> tuple[float, Optional[float]]:
        """
        Get current and previous metric values for comparison.

        Returns:
            tuple: (current_value, previous_value)
        """
        now = datetime.utcnow()

        if time_window == "hour":
            current_start = now - timedelta(hours=1)
            previous_start = now - timedelta(hours=2)
            previous_end = now - timedelta(hours=1)
        elif time_window == "day":
            current_start = now - timedelta(days=1)
            previous_start = now - timedelta(days=2)
            previous_end = now - timedelta(days=1)
        elif time_window == "week":
            current_start = now - timedelta(weeks=1)
            previous_start = now - timedelta(weeks=2)
            previous_end = now - timedelta(weeks=1)
        else:  # month
            current_start = now - timedelta(days=30)
            previous_start = now - timedelta(days=60)
            previous_end = now - timedelta(days=30)

        # Query daily metrics
        def build_query(start_date, end_date=None):
            query = self.supabase.table("daily_metrics").select(
                "spend_micros, revenue_micros, conversions, impressions, clicks"
            ).eq("organization_id", org_id)

            if ad_account_id:
                query = query.eq("ad_account_id", ad_account_id)
            if platform:
                query = query.eq("platform", platform)

            query = query.gte("date", start_date.date().isoformat())
            if end_date:
                query = query.lt("date", end_date.date().isoformat())

            return query

        current_result = build_query(current_start).execute()
        previous_result = build_query(previous_start, previous_end).execute()

        def aggregate(data: List[Dict]) -> Dict[str, float]:
            totals = {"spend": 0, "revenue": 0, "conversions": 0, "impressions": 0, "clicks": 0}
            for row in data or []:
                totals["spend"] += row.get("spend_micros", 0)
                totals["revenue"] += row.get("revenue_micros", 0)
                totals["conversions"] += row.get("conversions", 0)
                totals["impressions"] += row.get("impressions", 0)
                totals["clicks"] += row.get("clicks", 0)
            return totals

        current = aggregate(current_result.data)
        previous = aggregate(previous_result.data)

        def get_metric(totals: Dict[str, float], metric_name: str) -> float:
            if metric_name == "spend":
                return totals["spend"]
            elif metric_name == "revenue":
                return totals["revenue"]
            elif metric_name == "conversions":
                return totals["conversions"]
            elif metric_name == "impressions":
                return totals["impressions"]
            elif metric_name == "clicks":
                return totals["clicks"]
            elif metric_name == "roas":
                return totals["revenue"] / totals["spend"] if totals["spend"] > 0 else 0
            elif metric_name == "ctr":
                return (totals["clicks"] / totals["impressions"] * 100) if totals["impressions"] > 0 else 0
            elif metric_name == "cpa":
                return totals["spend"] / totals["conversions"] if totals["conversions"] > 0 else 0
            elif metric_name == "cpl":
                return totals["spend"] / totals["conversions"] if totals["conversions"] > 0 else 0
            return 0

        return get_metric(current, metric), get_metric(previous, metric)

    async def reset_daily_counters(self):
        """Reset alerts_today counter for all alerts. Should be called daily at midnight."""
        self.supabase.table("ad_alerts").update({
            "alerts_today": 0,
            "updated_at": datetime.utcnow().isoformat()
        }).neq("alerts_today", 0).execute()

    async def update_goal_progress(self, goal_id: str):
        """Update progress for a goal using single-metric design."""
        result = self.supabase.table("ad_goals").select("*").eq("id", goal_id).execute()
        if not result.data:
            return

        goal = result.data[0]
        org_id = goal["organization_id"]
        metric = goal["metric"]
        target_value = float(goal.get("target_value", 0))
        period_start = goal["period_start"]
        period_end = goal["period_end"]

        # Query daily metrics
        query = self.supabase.table("daily_metrics").select(
            "spend_micros, revenue_micros, conversions, impressions, clicks"
        ).eq("organization_id", org_id).gte("date", period_start).lte("date", period_end)

        if goal.get("ad_account_id"):
            query = query.eq("ad_account_id", goal["ad_account_id"])
        if goal.get("platform"):
            query = query.eq("platform", goal["platform"])

        metrics_result = query.execute()
        data = metrics_result.data or []

        # Aggregate based on metric type
        totals = {
            "spend": sum(row.get("spend_micros", 0) for row in data),
            "revenue": sum(row.get("revenue_micros", 0) for row in data),
            "conversions": sum(row.get("conversions", 0) for row in data),
            "impressions": sum(row.get("impressions", 0) for row in data),
            "clicks": sum(row.get("clicks", 0) for row in data)
        }

        # Get current value based on metric
        if metric == "spend":
            current_value = totals["spend"]
        elif metric == "revenue":
            current_value = totals["revenue"]
        elif metric == "conversions":
            current_value = totals["conversions"]
        elif metric == "impressions":
            current_value = totals["impressions"]
        elif metric == "clicks":
            current_value = totals["clicks"]
        elif metric == "roas":
            current_value = totals["revenue"] / totals["spend"] if totals["spend"] > 0 else 0
        elif metric == "ctr":
            current_value = (totals["clicks"] / totals["impressions"] * 100) if totals["impressions"] > 0 else 0
        elif metric == "cpa":
            current_value = totals["spend"] / totals["conversions"] if totals["conversions"] > 0 else 0
        elif metric == "leads":
            current_value = totals["conversions"]  # Using conversions as leads
        else:
            current_value = 0

        # Calculate progress
        progress_pct = (current_value / target_value * 100) if target_value > 0 else 0

        # Calculate status
        today = datetime.utcnow().date()
        start_date = datetime.fromisoformat(str(period_start)).date() if isinstance(period_start, str) else period_start
        end_date = datetime.fromisoformat(str(period_end)).date() if isinstance(period_end, str) else period_end

        days_total = (end_date - start_date).days + 1
        days_elapsed = max(0, min((today - start_date).days + 1, days_total))
        time_pct = (days_elapsed / days_total * 100) if days_total > 0 else 0

        if progress_pct >= 100:
            status = "achieved"
        elif progress_pct >= time_pct * 0.9:
            status = "on_track"
        elif progress_pct >= time_pct * 0.7:
            status = "at_risk"
        elif progress_pct > 0:
            status = "behind"
        elif days_elapsed > 0:
            status = "in_progress"
        else:
            status = "not_started"

        # Update goal
        self.supabase.table("ad_goals").update({
            "current_value": current_value,
            "progress_pct": round(progress_pct, 2),
            "status": status,
            "last_updated_at": datetime.utcnow().isoformat()
        }).eq("id", goal_id).execute()

    async def update_budget_pacing(self, pacing_id: str) -> bool:
        """Update budget pacing calculations. Returns True if alert should be sent."""
        import calendar

        result = self.supabase.table("budget_pacing").select("*").eq("id", pacing_id).execute()
        if not result.data:
            return False

        pacing = result.data[0]
        org_id = pacing["organization_id"]
        period = pacing["period"]

        year, month = map(int, period.split("-"))
        days_in_month = calendar.monthrange(year, month)[1]

        today = datetime.utcnow().date()
        period_start = datetime(year, month, 1).date()
        period_end = datetime(year, month, days_in_month).date()

        days_elapsed = max(0, min((today - period_start).days + 1, days_in_month))
        days_remaining = max(0, (period_end - today).days)

        # Get actual spend
        query = self.supabase.table("daily_metrics").select("spend_micros").eq(
            "organization_id", org_id
        ).gte("date", period_start.isoformat()).lte("date", today.isoformat())

        if pacing.get("ad_account_id"):
            query = query.eq("ad_account_id", pacing["ad_account_id"])
        if pacing.get("platform"):
            query = query.eq("platform", pacing["platform"])

        spend_result = query.execute()
        total_spent = sum(row.get("spend_micros", 0) for row in spend_result.data or [])

        # Calculate metrics
        monthly_budget = pacing["monthly_budget_micros"]
        daily_target = monthly_budget // days_in_month if days_in_month > 0 else 0
        ideal_pacing_pct = (days_elapsed / days_in_month * 100) if days_in_month > 0 else 0
        current_pacing_pct = (total_spent / monthly_budget * 100) if monthly_budget > 0 else 0
        avg_daily = total_spent // days_elapsed if days_elapsed > 0 else 0
        projected = avg_daily * days_in_month

        # Determine status
        ratio = current_pacing_pct / ideal_pacing_pct if ideal_pacing_pct > 0 else 1
        if ratio > 1.3:
            status = "critical_over"
        elif ratio > 1.1:
            status = "over_pace"
        elif ratio < 0.7:
            status = "under_pace"
        elif ratio < 0.9:
            status = "under_pace"
        else:
            status = "on_track"

        # Check alert threshold
        threshold = pacing.get("alert_threshold_pct", 80)
        should_alert = current_pacing_pct >= threshold and not pacing.get("alert_sent", False)

        update_data = {
            "total_spent_micros": total_spent,
            "daily_target_micros": daily_target,
            "current_pacing_pct": round(current_pacing_pct, 2),
            "ideal_pacing_pct": round(ideal_pacing_pct, 2),
            "days_remaining": days_remaining,
            "projected_spend_micros": projected,
            "status": status,
            "last_updated_at": datetime.utcnow().isoformat()
        }

        if should_alert:
            update_data["alert_sent"] = True

        self.supabase.table("budget_pacing").update(update_data).eq("id", pacing_id).execute()

        return should_alert
