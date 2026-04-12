"""User agent parsing for device, browser, and OS detection."""

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class DeviceInfo:
    """Parsed device information from user agent."""
    device_type: str  # desktop, mobile, tablet
    browser: str
    browser_version: str
    os: str
    os_version: str
    is_bot: bool = False


# Common bot patterns
BOT_PATTERNS = [
    r'bot', r'crawler', r'spider', r'scraper', r'curl', r'wget',
    r'python', r'java', r'php', r'ruby', r'go-http', r'axios',
    r'postman', r'insomnia', r'httpie', r'fetch',
    r'googlebot', r'bingbot', r'slurp', r'duckduckbot', r'baiduspider',
    r'yandexbot', r'facebookexternalhit', r'twitterbot', r'linkedinbot',
    r'whatsapp', r'telegram', r'slack', r'discord',
]

# Browser patterns (order matters - more specific first)
BROWSER_PATTERNS = [
    (r'Edg[eA]?/(\d+[\.\d]*)', 'Edge'),
    (r'OPR/(\d+[\.\d]*)', 'Opera'),
    (r'Opera.*Version/(\d+[\.\d]*)', 'Opera'),
    (r'Vivaldi/(\d+[\.\d]*)', 'Vivaldi'),
    (r'Brave/(\d+[\.\d]*)', 'Brave'),
    (r'SamsungBrowser/(\d+[\.\d]*)', 'Samsung Browser'),
    (r'UCBrowser/(\d+[\.\d]*)', 'UC Browser'),
    (r'Firefox/(\d+[\.\d]*)', 'Firefox'),
    (r'FxiOS/(\d+[\.\d]*)', 'Firefox'),
    (r'Chrome/(\d+[\.\d]*)', 'Chrome'),
    (r'CriOS/(\d+[\.\d]*)', 'Chrome'),
    (r'Safari/(\d+[\.\d]*)', 'Safari'),
    (r'Version/(\d+[\.\d]*).*Safari', 'Safari'),
    (r'MSIE\s+(\d+[\.\d]*)', 'Internet Explorer'),
    (r'Trident/.*rv:(\d+[\.\d]*)', 'Internet Explorer'),
]

# OS patterns
OS_PATTERNS = [
    (r'Windows NT 10\.0', 'Windows', '10'),
    (r'Windows NT 11\.0', 'Windows', '11'),
    (r'Windows NT 6\.3', 'Windows', '8.1'),
    (r'Windows NT 6\.2', 'Windows', '8'),
    (r'Windows NT 6\.1', 'Windows', '7'),
    (r'Windows NT 6\.0', 'Windows', 'Vista'),
    (r'Windows NT 5\.1', 'Windows', 'XP'),
    (r'Mac OS X (\d+[_\.]\d+)', 'macOS', None),  # Version extracted from match
    (r'iPhone OS (\d+[_\.]\d+)', 'iOS', None),
    (r'iPad.*OS (\d+[_\.]\d+)', 'iPadOS', None),
    (r'Android (\d+[\.\d]*)', 'Android', None),
    (r'Linux', 'Linux', ''),
    (r'CrOS', 'Chrome OS', ''),
    (r'Ubuntu', 'Ubuntu', ''),
    (r'Fedora', 'Fedora', ''),
]

# Mobile device patterns
MOBILE_PATTERNS = [
    r'iPhone', r'iPad', r'iPod', r'Android.*Mobile', r'webOS',
    r'BlackBerry', r'Opera Mini', r'IEMobile', r'Windows Phone',
    r'Mobile Safari', r'Opera Mobi', r'Mobile', r'phone',
]

TABLET_PATTERNS = [
    r'iPad', r'Android(?!.*Mobile)', r'Tablet', r'PlayBook',
    r'Silk', r'Kindle', r'SM-T', r'GT-P',
]


def is_bot(user_agent: str) -> bool:
    """Check if user agent is a bot."""
    ua_lower = user_agent.lower()
    return any(re.search(pattern, ua_lower) for pattern in BOT_PATTERNS)


def detect_browser(user_agent: str) -> tuple[str, str]:
    """Detect browser and version from user agent."""
    for pattern, browser_name in BROWSER_PATTERNS:
        match = re.search(pattern, user_agent, re.IGNORECASE)
        if match:
            version = match.group(1) if match.lastindex else ''
            return browser_name, version.split('.')[0] if version else ''
    return 'Unknown', ''


def detect_os(user_agent: str) -> tuple[str, str]:
    """Detect operating system and version from user agent."""
    for pattern, os_name, default_version in OS_PATTERNS:
        match = re.search(pattern, user_agent, re.IGNORECASE)
        if match:
            if default_version is None and match.lastindex:
                # Extract version from match
                version = match.group(1).replace('_', '.')
            else:
                version = default_version or ''
            return os_name, version
    return 'Unknown', ''


def detect_device_type(user_agent: str) -> str:
    """Detect device type (desktop, mobile, tablet)."""
    # Check tablet first (some tablets also match mobile patterns)
    for pattern in TABLET_PATTERNS:
        if re.search(pattern, user_agent, re.IGNORECASE):
            return 'tablet'

    # Check mobile
    for pattern in MOBILE_PATTERNS:
        if re.search(pattern, user_agent, re.IGNORECASE):
            return 'mobile'

    return 'desktop'


def parse_user_agent(user_agent: Optional[str]) -> DeviceInfo:
    """Parse user agent string into device information.

    Args:
        user_agent: The user agent string to parse

    Returns:
        DeviceInfo with parsed device, browser, and OS information
    """
    if not user_agent:
        return DeviceInfo(
            device_type='unknown',
            browser='Unknown',
            browser_version='',
            os='Unknown',
            os_version='',
            is_bot=False,
        )

    # Check for bots first
    if is_bot(user_agent):
        return DeviceInfo(
            device_type='bot',
            browser='Bot',
            browser_version='',
            os='Bot',
            os_version='',
            is_bot=True,
        )

    browser, browser_version = detect_browser(user_agent)
    os_name, os_version = detect_os(user_agent)
    device_type = detect_device_type(user_agent)

    return DeviceInfo(
        device_type=device_type,
        browser=browser,
        browser_version=browser_version,
        os=os_name,
        os_version=os_version,
        is_bot=False,
    )
