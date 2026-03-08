"""
Google Ads Adapter Factory

Returns the correct adapter version for an account.
Supports per-org feature flags for safe rollout of new API versions.
"""

from enum import Enum
from typing import Optional

from .adapters.base import GoogleAdsAdapterBase
from .adapters.v23_1 import GoogleAdsAdapterV23_1


class AdapterVersion(str, Enum):
    V23_1 = "v23.1"
    # V24 = "v24"  # Add when ready


# Default version for all accounts
DEFAULT_VERSION = AdapterVersion.V23_1

# Per-org overrides for testing new versions
# In production, this would be stored in database
ORG_VERSION_OVERRIDES: dict[str, AdapterVersion] = {
    # "org_123": AdapterVersion.V24,  # Test org on new version
}


def get_adapter(
    refresh_token: str,
    customer_id: str,
    org_id: Optional[str] = None,
) -> GoogleAdsAdapterBase:
    """
    Get the appropriate adapter for an account.

    Args:
        refresh_token: OAuth refresh token for the account
        customer_id: Google Ads customer ID
        org_id: Optional organization ID for version override lookup

    Returns:
        GoogleAdsAdapterBase implementation for the appropriate version
    """
    # Check for org-specific version override
    version = DEFAULT_VERSION
    if org_id and org_id in ORG_VERSION_OVERRIDES:
        version = ORG_VERSION_OVERRIDES[org_id]

    # Return appropriate adapter
    if version == AdapterVersion.V23_1:
        return GoogleAdsAdapterV23_1(refresh_token, customer_id)
    # elif version == AdapterVersion.V24:
    #     return GoogleAdsAdapterV24(refresh_token, customer_id)
    else:
        # Fallback to default
        return GoogleAdsAdapterV23_1(refresh_token, customer_id)


async def get_adapter_for_account(account_id: str) -> GoogleAdsAdapterBase:
    """
    Get adapter for an account by looking up credentials from database.

    This is the main entry point used by services.
    """
    # TODO: Fetch account credentials from Supabase
    # account = await supabase.table("ad_accounts").select("*").eq("id", account_id).single()
    # return get_adapter(
    #     refresh_token=account["refresh_token"],
    #     customer_id=account["external_account_id"],
    #     org_id=account["organization_id"]
    # )
    raise NotImplementedError("Database lookup not yet implemented")
