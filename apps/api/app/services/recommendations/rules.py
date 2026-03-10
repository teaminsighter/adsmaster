"""
AI Recommendation Rules - Comprehensive Rules for Google & Meta Ads

Rules detect issues and opportunities in ad accounts and generate
actionable recommendations with severity levels.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Callable, Dict, Any, Optional, List


class RuleType(str, Enum):
    # Google Ads rules
    PAUSE_KEYWORD = "pause_keyword"
    ADD_NEGATIVE = "add_negative"
    INCREASE_BUDGET = "increase_budget"
    FIX_TRACKING = "fix_tracking"
    REDUCE_BID = "reduce_bid"
    IMPROVE_QS = "improve_quality_score"

    # Meta Ads rules
    PAUSE_AD = "pause_ad"
    PAUSE_ADSET = "pause_adset"
    CREATIVE_FATIGUE = "creative_fatigue"
    AUDIENCE_OVERLAP = "audience_overlap"
    SCALE_ADSET = "scale_adset"
    REFRESH_CREATIVE = "refresh_creative"

    # Cross-platform rules
    BUDGET_ALLOCATION = "budget_allocation"
    ANOMALY_DETECTED = "anomaly_detected"


class Severity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    OPPORTUNITY = "opportunity"
    INFO = "info"


@dataclass
class Rule:
    """A detection rule that generates recommendations."""
    id: str
    name: str
    type: RuleType
    severity: Severity
    platform: str  # 'google', 'meta', or 'all'
    description_template: str
    impact_template: str

    def check(self, entity: Dict[str, Any]) -> bool:
        """Check if rule applies to entity. Override in subclasses."""
        raise NotImplementedError

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        """Calculate estimated monthly impact in dollars."""
        raise NotImplementedError

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get action options for this recommendation."""
        raise NotImplementedError


# =============================================================================
# Google Ads Rules
# =============================================================================

class WastingKeywordHighRule(Rule):
    """Detect keywords spending $50+ with 0 conversions in 7 days."""

    def __init__(self):
        super().__init__(
            id="wasting_keyword_high",
            name="High-spend wasting keyword",
            type=RuleType.PAUSE_KEYWORD,
            severity=Severity.WARNING,
            platform="google",
            description_template="Keyword '{keyword}' spent ${spend:.2f} with 0 conversions in the last 7 days",
            impact_template="Save ~${impact:.0f}/month by pausing"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        return (
            entity.get("spend_7d", 0) >= 50 and
            entity.get("conversions_7d", 0) == 0 and
            entity.get("status") == "ENABLED"
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        return entity.get("spend_7d", 0) * 4

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Conservative", "action": "reduce_bid_50", "description": "Reduce bid by 50%", "risk": "low"},
            {"id": 2, "label": "Recommended", "action": "pause", "description": "Pause keyword", "risk": "low"},
            {"id": 3, "label": "Aggressive", "action": "pause_and_negative", "description": "Pause and add as negative", "risk": "medium"},
        ]


class WastingKeywordMediumRule(Rule):
    """Detect keywords spending $25-50 with 0 conversions."""

    def __init__(self):
        super().__init__(
            id="wasting_keyword_medium",
            name="Medium-spend wasting keyword",
            type=RuleType.PAUSE_KEYWORD,
            severity=Severity.INFO,
            platform="google",
            description_template="Keyword '{keyword}' spent ${spend:.2f} with no conversions - consider pausing",
            impact_template="Potential savings: ${impact:.0f}/month"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        spend = entity.get("spend_7d", 0)
        return (
            25 <= spend < 50 and
            entity.get("conversions_7d", 0) == 0 and
            entity.get("status") == "ENABLED"
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        return entity.get("spend_7d", 0) * 4

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Monitor", "action": "monitor", "description": "Keep monitoring for 7 more days", "risk": "low"},
            {"id": 2, "label": "Reduce bid", "action": "reduce_bid_30", "description": "Reduce bid by 30%", "risk": "low"},
            {"id": 3, "label": "Pause", "action": "pause", "description": "Pause keyword", "risk": "low"},
        ]


class BudgetConstrainedRule(Rule):
    """Detect profitable campaigns limited by budget."""

    def __init__(self):
        super().__init__(
            id="budget_constrained",
            name="Campaign limited by budget",
            type=RuleType.INCREASE_BUDGET,
            severity=Severity.OPPORTUNITY,
            platform="all",
            description_template="Campaign '{campaign}' is profitable (ROAS {roas:.1f}x) but losing {is_lost:.0f}% impression share to budget",
            impact_template="Potential additional conversions: +{impact:.0f}/month"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        return (
            entity.get("impression_share_lost_to_budget", 0) >= 20 and
            entity.get("roas", 0) >= 2.0 and
            entity.get("status") == "ENABLED"
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        current_conv = entity.get("conversions_30d", 0)
        lost_pct = entity.get("impression_share_lost_to_budget", 0) / 100
        return current_conv * lost_pct

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Conservative", "action": "increase_budget_20", "description": "Increase budget by 20%", "risk": "low"},
            {"id": 2, "label": "Moderate", "action": "increase_budget_50", "description": "Increase budget by 50%", "risk": "medium"},
            {"id": 3, "label": "Aggressive", "action": "increase_budget_100", "description": "Double budget", "risk": "medium"},
        ]


class ConversionTrackingBrokenRule(Rule):
    """Detect campaigns that stopped tracking conversions."""

    def __init__(self):
        super().__init__(
            id="tracking_broken",
            name="Conversion tracking may be broken",
            type=RuleType.FIX_TRACKING,
            severity=Severity.CRITICAL,
            platform="all",
            description_template="Campaign '{campaign}' had {prev_conv} conversions last week but 0 this week despite {clicks} clicks",
            impact_template="Tracking issue - data unreliable"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        return (
            entity.get("conversions_7d", 0) == 0 and
            entity.get("conversions_prev_7d", 0) > 5 and
            entity.get("clicks_7d", 0) >= 100 and
            entity.get("status") == "ENABLED"
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        return 0

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Check tracking", "action": "check_tracking", "description": "Review conversion tracking setup", "risk": "low"},
            {"id": 2, "label": "Test conversion", "action": "test_conversion", "description": "Send test conversion", "risk": "low"},
        ]


class LowQualityScoreRule(Rule):
    """Detect keywords with low quality score and high spend."""

    def __init__(self):
        super().__init__(
            id="low_quality_score",
            name="Low quality score keyword",
            type=RuleType.REDUCE_BID,
            severity=Severity.WARNING,
            platform="google",
            description_template="Keyword '{keyword}' has quality score {qs}/10 and CPC is {cpc_pct:.0f}% above average",
            impact_template="Improve QS to reduce CPC by ~${impact:.0f}/month"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        return (
            entity.get("quality_score", 10) <= 5 and
            entity.get("spend_7d", 0) >= 20 and
            entity.get("status") == "ENABLED"
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        spend = entity.get("spend_7d", 0) * 4
        return spend * 0.2

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Improve landing page", "action": "improve_lp", "description": "Review landing page relevance", "risk": "low"},
            {"id": 2, "label": "Improve ad copy", "action": "improve_ad", "description": "Make ad more relevant to keyword", "risk": "low"},
            {"id": 3, "label": "Reduce bid", "action": "reduce_bid_20", "description": "Lower bid while improving QS", "risk": "low"},
        ]


# =============================================================================
# Meta Ads Rules
# =============================================================================

class MetaWastingAdRule(Rule):
    """Detect Meta ads spending with 0 conversions."""

    def __init__(self):
        super().__init__(
            id="meta_wasting_ad",
            name="Underperforming Meta ad",
            type=RuleType.PAUSE_AD,
            severity=Severity.WARNING,
            platform="meta",
            description_template="Ad '{ad_name}' spent ${spend:.2f} with 0 conversions in the last 7 days",
            impact_template="Save ~${impact:.0f}/month by pausing"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        return (
            entity.get("spend_7d", 0) >= 30 and
            entity.get("conversions_7d", 0) == 0 and
            entity.get("status") in ["ACTIVE", "ENABLED"]
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        return entity.get("spend_7d", 0) * 4

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Reduce budget", "action": "reduce_budget_50", "description": "Reduce ad set budget by 50%", "risk": "low"},
            {"id": 2, "label": "Pause ad", "action": "pause_ad", "description": "Pause this ad", "risk": "low"},
            {"id": 3, "label": "Replace creative", "action": "refresh_creative", "description": "Create new ad variation", "risk": "low"},
        ]


class MetaCreativeFatigueRule(Rule):
    """Detect ads with declining CTR indicating creative fatigue."""

    def __init__(self):
        super().__init__(
            id="meta_creative_fatigue",
            name="Creative fatigue detected",
            type=RuleType.CREATIVE_FATIGUE,
            severity=Severity.WARNING,
            platform="meta",
            description_template="Ad '{ad_name}' CTR dropped {ctr_drop:.0f}% vs last week (now {ctr:.2f}%)",
            impact_template="Refresh creative to recover performance"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        ctr_current = entity.get("ctr_7d", 0)
        ctr_prev = entity.get("ctr_prev_7d", 0)
        if ctr_prev == 0:
            return False

        ctr_drop = ((ctr_prev - ctr_current) / ctr_prev) * 100
        return (
            ctr_drop >= 30 and
            entity.get("impressions_7d", 0) >= 5000 and
            entity.get("status") in ["ACTIVE", "ENABLED"]
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        # Estimate lost conversions from CTR drop
        ctr_current = entity.get("ctr_7d", 0)
        ctr_prev = entity.get("ctr_prev_7d", 0)
        impressions = entity.get("impressions_7d", 0) * 4  # Monthly
        lost_clicks = impressions * ((ctr_prev - ctr_current) / 100)
        conv_rate = entity.get("conversion_rate", 0.02)
        return lost_clicks * conv_rate

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Create variation", "action": "create_variation", "description": "Create new ad with similar concept", "risk": "low"},
            {"id": 2, "label": "Refresh creative", "action": "refresh_all", "description": "Replace images/video entirely", "risk": "medium"},
            {"id": 3, "label": "Pause and replace", "action": "pause_replace", "description": "Pause ad and create new one", "risk": "medium"},
        ]


class MetaHighFrequencyRule(Rule):
    """Detect ad sets with high frequency (audience fatigue)."""

    def __init__(self):
        super().__init__(
            id="meta_high_frequency",
            name="High ad frequency (audience fatigue)",
            type=RuleType.PAUSE_ADSET,
            severity=Severity.WARNING,
            platform="meta",
            description_template="Ad set '{adset_name}' has frequency {frequency:.1f} - audience is oversaturated",
            impact_template="Expand audience or pause to prevent wasted spend"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        return (
            entity.get("frequency", 0) >= 4.0 and
            entity.get("status") in ["ACTIVE", "ENABLED"]
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        # Estimate wasted spend from high frequency
        spend = entity.get("spend_7d", 0) * 4
        frequency = entity.get("frequency", 1)
        # Excess frequency beyond 3 is likely wasted
        waste_pct = min(0.5, (frequency - 3) * 0.1)
        return spend * waste_pct

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Expand audience", "action": "expand_audience", "description": "Broaden targeting criteria", "risk": "low"},
            {"id": 2, "label": "Exclude recent viewers", "action": "exclude_engaged", "description": "Exclude users who engaged recently", "risk": "low"},
            {"id": 3, "label": "Pause ad set", "action": "pause_adset", "description": "Pause and let audience rest", "risk": "medium"},
        ]


class MetaLowROASRule(Rule):
    """Detect ad sets with ROAS below profitability threshold."""

    def __init__(self):
        super().__init__(
            id="meta_low_roas",
            name="Low ROAS ad set",
            type=RuleType.PAUSE_ADSET,
            severity=Severity.WARNING,
            platform="meta",
            description_template="Ad set '{adset_name}' has ROAS {roas:.2f}x (below {target_roas:.1f}x target)",
            impact_template="Save ~${impact:.0f}/month by pausing"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        target_roas = entity.get("target_roas", 2.0)
        return (
            entity.get("roas", 0) < target_roas and
            entity.get("spend_7d", 0) >= 50 and
            entity.get("status") in ["ACTIVE", "ENABLED"]
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        spend = entity.get("spend_7d", 0) * 4
        revenue = entity.get("revenue_7d", 0) * 4
        # Loss = spend that didn't generate enough revenue
        return max(0, spend - revenue)

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Reduce budget", "action": "reduce_budget_50", "description": "Reduce budget by 50%", "risk": "low"},
            {"id": 2, "label": "Change bidding", "action": "optimize_bidding", "description": "Switch to value-based bidding", "risk": "medium"},
            {"id": 3, "label": "Pause ad set", "action": "pause_adset", "description": "Pause underperforming ad set", "risk": "medium"},
        ]


class MetaScaleOpportunityRule(Rule):
    """Detect profitable ad sets that can be scaled."""

    def __init__(self):
        super().__init__(
            id="meta_scale_opportunity",
            name="Scale profitable ad set",
            type=RuleType.SCALE_ADSET,
            severity=Severity.OPPORTUNITY,
            platform="meta",
            description_template="Ad set '{adset_name}' has strong ROAS {roas:.2f}x - consider scaling",
            impact_template="Potential +{impact:.0f} additional conversions/month"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        target_roas = entity.get("target_roas", 2.0)
        return (
            entity.get("roas", 0) >= target_roas * 1.5 and  # 50% above target
            entity.get("conversions_7d", 0) >= 5 and
            entity.get("status") in ["ACTIVE", "ENABLED"]
        )

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        current_conv = entity.get("conversions_7d", 0) * 4
        # Estimate 30% more conversions with 50% budget increase
        return current_conv * 0.3

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Increase 20%", "action": "increase_budget_20", "description": "Increase budget by 20%", "risk": "low"},
            {"id": 2, "label": "Increase 50%", "action": "increase_budget_50", "description": "Increase budget by 50%", "risk": "medium"},
            {"id": 3, "label": "Create lookalike", "action": "create_lookalike", "description": "Create lookalike audience from converters", "risk": "low"},
        ]


class MetaAudienceOverlapRule(Rule):
    """Detect ad sets with overlapping audiences causing internal competition."""

    def __init__(self):
        super().__init__(
            id="meta_audience_overlap",
            name="Audience overlap detected",
            type=RuleType.AUDIENCE_OVERLAP,
            severity=Severity.INFO,
            platform="meta",
            description_template="Ad sets '{adset1}' and '{adset2}' have {overlap_pct:.0f}% audience overlap",
            impact_template="Consolidate to reduce internal competition"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        return entity.get("overlap_pct", 0) >= 30

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        # Estimate CPC inflation from overlap
        combined_spend = entity.get("combined_spend_7d", 0) * 4
        overlap_pct = entity.get("overlap_pct", 0) / 100
        return combined_spend * overlap_pct * 0.1  # ~10% CPC inflation

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Exclude overlap", "action": "exclude_overlap", "description": "Add exclusions to remove overlap", "risk": "low"},
            {"id": 2, "label": "Consolidate", "action": "consolidate_adsets", "description": "Merge ad sets into one", "risk": "medium"},
            {"id": 3, "label": "Ignore", "action": "dismiss", "description": "Overlap is intentional", "risk": "low"},
        ]


# =============================================================================
# Cross-Platform Rules
# =============================================================================

class SpendAnomalyRule(Rule):
    """Detect sudden spend spikes or drops."""

    def __init__(self):
        super().__init__(
            id="spend_anomaly",
            name="Unusual spend pattern detected",
            type=RuleType.ANOMALY_DETECTED,
            severity=Severity.WARNING,
            platform="all",
            description_template="Campaign '{campaign}' spend {direction} {change_pct:.0f}% vs 7-day average",
            impact_template="Investigate cause of spend anomaly"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        spend_today = entity.get("spend_today", 0)
        spend_avg = entity.get("spend_7d_avg", 0)
        if spend_avg == 0:
            return False

        change_pct = abs((spend_today - spend_avg) / spend_avg) * 100
        return change_pct >= 50

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        return abs(entity.get("spend_today", 0) - entity.get("spend_7d_avg", 0)) * 30

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Investigate", "action": "investigate", "description": "Review campaign settings and performance", "risk": "low"},
            {"id": 2, "label": "Set alert", "action": "set_alert", "description": "Set up spend alert threshold", "risk": "low"},
            {"id": 3, "label": "Pause campaign", "action": "pause_campaign", "description": "Pause while investigating", "risk": "medium"},
        ]


class ConversionDropRule(Rule):
    """Detect significant conversion drops."""

    def __init__(self):
        super().__init__(
            id="conversion_drop",
            name="Conversion drop detected",
            type=RuleType.ANOMALY_DETECTED,
            severity=Severity.CRITICAL,
            platform="all",
            description_template="Campaign '{campaign}' conversions dropped {drop_pct:.0f}% vs last week",
            impact_template="Lost ~{impact:.0f} conversions - investigate urgently"
        )

    def check(self, entity: Dict[str, Any]) -> bool:
        conv_current = entity.get("conversions_7d", 0)
        conv_prev = entity.get("conversions_prev_7d", 0)
        if conv_prev < 5:  # Need enough data
            return False

        drop_pct = ((conv_prev - conv_current) / conv_prev) * 100
        return drop_pct >= 40

    def calculate_impact(self, entity: Dict[str, Any]) -> float:
        return entity.get("conversions_prev_7d", 0) - entity.get("conversions_7d", 0)

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Check tracking", "action": "check_tracking", "description": "Verify conversion tracking is working", "risk": "low"},
            {"id": 2, "label": "Review changes", "action": "review_changes", "description": "Review recent campaign changes", "risk": "low"},
            {"id": 3, "label": "Revert changes", "action": "revert_changes", "description": "Revert to previous settings", "risk": "medium"},
        ]


# =============================================================================
# All Rules
# =============================================================================

RULES: List[Rule] = [
    # Google Ads
    WastingKeywordHighRule(),
    WastingKeywordMediumRule(),
    BudgetConstrainedRule(),
    ConversionTrackingBrokenRule(),
    LowQualityScoreRule(),

    # Meta Ads
    MetaWastingAdRule(),
    MetaCreativeFatigueRule(),
    MetaHighFrequencyRule(),
    MetaLowROASRule(),
    MetaScaleOpportunityRule(),
    MetaAudienceOverlapRule(),

    # Cross-platform
    SpendAnomalyRule(),
    ConversionDropRule(),
]

GOOGLE_RULES = [r for r in RULES if r.platform in ["google", "all"]]
META_RULES = [r for r in RULES if r.platform in ["meta", "all"]]


def get_rule_by_id(rule_id: str) -> Optional[Rule]:
    """Get a rule by its ID."""
    for rule in RULES:
        if rule.id == rule_id:
            return rule
    return None


def get_rules_for_platform(platform: str) -> List[Rule]:
    """Get rules for a specific platform."""
    if platform == "google":
        return GOOGLE_RULES
    elif platform == "meta":
        return META_RULES
    return RULES
