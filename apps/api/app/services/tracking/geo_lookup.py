"""IP geolocation lookup service."""

import os
from dataclasses import dataclass
from typing import Optional
import httpx


@dataclass
class GeoInfo:
    """Geographic information from IP lookup."""
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    timezone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# Private/reserved IP ranges
PRIVATE_IP_PREFIXES = (
    '10.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
    '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.', '192.168.', '127.', '0.', '::1',
    'localhost', 'fe80:', 'fc00:', 'fd00:',
)


def is_private_ip(ip: str) -> bool:
    """Check if IP address is private/local."""
    if not ip:
        return True
    return any(ip.startswith(prefix) for prefix in PRIVATE_IP_PREFIXES)


async def lookup_ip_ipapi(ip: str) -> Optional[GeoInfo]:
    """Lookup IP using ip-api.com (free, no key required, 45 req/min)."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,country,countryCode,regionName,city,timezone,lat,lon"}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return GeoInfo(
                        country_code=data.get("countryCode"),
                        country_name=data.get("country"),
                        region=data.get("regionName"),
                        city=data.get("city"),
                        timezone=data.get("timezone"),
                        latitude=data.get("lat"),
                        longitude=data.get("lon"),
                    )
    except Exception:
        pass
    return None


async def lookup_ip_ipinfo(ip: str) -> Optional[GeoInfo]:
    """Lookup IP using ipinfo.io (free tier: 50k/month)."""
    token = os.getenv("IPINFO_TOKEN", "")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            response = await client.get(
                f"https://ipinfo.io/{ip}/json",
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                loc = data.get("loc", "").split(",")
                return GeoInfo(
                    country_code=data.get("country"),
                    country_name=None,  # ipinfo doesn't return country name
                    region=data.get("region"),
                    city=data.get("city"),
                    timezone=data.get("timezone"),
                    latitude=float(loc[0]) if len(loc) == 2 else None,
                    longitude=float(loc[1]) if len(loc) == 2 else None,
                )
    except Exception:
        pass
    return None


# Country code to name mapping (common ones)
COUNTRY_NAMES = {
    "US": "United States", "GB": "United Kingdom", "CA": "Canada",
    "AU": "Australia", "DE": "Germany", "FR": "France", "JP": "Japan",
    "CN": "China", "IN": "India", "BR": "Brazil", "MX": "Mexico",
    "ES": "Spain", "IT": "Italy", "NL": "Netherlands", "SE": "Sweden",
    "NO": "Norway", "DK": "Denmark", "FI": "Finland", "PL": "Poland",
    "RU": "Russia", "KR": "South Korea", "SG": "Singapore", "HK": "Hong Kong",
    "TW": "Taiwan", "ID": "Indonesia", "TH": "Thailand", "MY": "Malaysia",
    "PH": "Philippines", "VN": "Vietnam", "NZ": "New Zealand", "IE": "Ireland",
    "CH": "Switzerland", "AT": "Austria", "BE": "Belgium", "PT": "Portugal",
    "GR": "Greece", "CZ": "Czech Republic", "HU": "Hungary", "RO": "Romania",
    "IL": "Israel", "AE": "United Arab Emirates", "SA": "Saudi Arabia",
    "ZA": "South Africa", "EG": "Egypt", "NG": "Nigeria", "AR": "Argentina",
    "CL": "Chile", "CO": "Colombia", "PE": "Peru", "VE": "Venezuela",
}


async def lookup_ip(ip: Optional[str]) -> GeoInfo:
    """Lookup geographic information for an IP address.

    Uses multiple providers with fallback:
    1. ip-api.com (free, no key)
    2. ipinfo.io (free tier)

    Args:
        ip: The IP address to lookup

    Returns:
        GeoInfo with location data, or empty GeoInfo if lookup fails
    """
    if not ip or is_private_ip(ip):
        return GeoInfo()

    # Try ip-api.com first (free, no key required)
    result = await lookup_ip_ipapi(ip)
    if result:
        return result

    # Fallback to ipinfo.io
    result = await lookup_ip_ipinfo(ip)
    if result:
        # Fill in country name if we have the code
        if result.country_code and not result.country_name:
            result.country_name = COUNTRY_NAMES.get(result.country_code)
        return result

    return GeoInfo()


def get_client_ip(request_headers: dict, direct_ip: str) -> str:
    """Extract real client IP from request headers.

    Handles common proxy headers in order of preference.
    """
    # Check forwarded headers (in order of preference)
    headers_to_check = [
        "cf-connecting-ip",      # Cloudflare
        "x-real-ip",             # Nginx
        "x-forwarded-for",       # Standard proxy header
        "x-client-ip",           # Apache
        "true-client-ip",        # Akamai
        "x-cluster-client-ip",   # Rackspace
    ]

    for header in headers_to_check:
        value = request_headers.get(header)
        if value:
            # X-Forwarded-For can contain multiple IPs, take the first
            ip = value.split(",")[0].strip()
            if ip and not is_private_ip(ip):
                return ip

    return direct_ip
