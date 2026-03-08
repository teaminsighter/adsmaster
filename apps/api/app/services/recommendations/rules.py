"""
AI Recommendation Rules - First 5 Rules for MVP

Rules detect issues and opportunities in ad accounts and generate
actionable recommendations with severity levels.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Callable, Dict, Any, Optional, List


class RuleType(str, Enum):
    PAUSE_KEYWORD = "pause_keyword"
    ADD_NEGATIVE = "add_negative"
    INCREASE_BUDGET = "increase_budget"
    FIX_TRACKING = "fix_tracking"
    REDUCE_BID = "reduce_bid"


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


class WastingKeywordHighRule(Rule):
    """Detect keywords spending $50+ with 0 conversions in 7 days."""

    def __init__(self):
        super().__init__(
            id="wasting_keyword_high",
            name="High-spend wasting keyword",
            type=RuleType.PAUSE_KEYWORD,
            severity=Severity.WARNING,
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
        # Project 7-day spend to monthly
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
        # Estimate additional conversions from lost impression share
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
        # No direct dollar impact, but critical
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
        # Estimate savings if QS improved (QS 5->7 can reduce CPC ~20%)
        spend = entity.get("spend_7d", 0) * 4  # Monthly
        return spend * 0.2

    def get_options(self, entity: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {"id": 1, "label": "Improve landing page", "action": "improve_lp", "description": "Review landing page relevance", "risk": "low"},
            {"id": 2, "label": "Improve ad copy", "action": "improve_ad", "description": "Make ad more relevant to keyword", "risk": "low"},
            {"id": 3, "label": "Reduce bid", "action": "reduce_bid_20", "description": "Lower bid while improving QS", "risk": "low"},
        ]


# All rules for MVP
RULES: List[Rule] = [
    WastingKeywordHighRule(),
    WastingKeywordMediumRule(),
    BudgetConstrainedRule(),
    ConversionTrackingBrokenRule(),
    LowQualityScoreRule(),
]


def get_rule_by_id(rule_id: str) -> Optional[Rule]:
    """Get a rule by its ID."""
    for rule in RULES:
        if rule.id == rule_id:
            return rule
    return None
