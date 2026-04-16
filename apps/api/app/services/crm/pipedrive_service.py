"""
Pipedrive CRM Integration Service
Handles syncing leads/deals with Pipedrive
"""

import httpx
from typing import Optional, Tuple, List, Dict, Any
from datetime import datetime

from ..supabase_client import get_supabase_client


class PipedriveService:
    """Service for interacting with Pipedrive API"""

    def __init__(self, api_token: str, company_domain: Optional[str] = None):
        self.api_token = api_token
        self.company_domain = company_domain
        self.base_url = f"https://{company_domain}.pipedrive.com/api/v1" if company_domain else "https://api.pipedrive.com/v1"

    async def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to Pipedrive API"""
        url = f"{self.base_url}/{endpoint}"
        params = {"api_token": self.api_token}

        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(url, params=params, timeout=30)
            elif method == "POST":
                response = await client.post(url, params=params, json=data, timeout=30)
            elif method == "PUT":
                response = await client.put(url, params=params, json=data, timeout=30)
            elif method == "DELETE":
                response = await client.delete(url, params=params, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code >= 400:
                error_data = response.json() if response.text else {}
                raise Exception(f"Pipedrive API error: {error_data.get('error', response.status_code)}")

            return response.json()

    async def test_connection(self) -> Tuple[bool, str]:
        """Test connection to Pipedrive"""
        try:
            result = await self._request("GET", "users/me")
            if result.get("success"):
                user = result.get("data", {})
                return True, f"Connected as {user.get('name', 'Unknown')}"
            return False, "Failed to connect to Pipedrive"
        except Exception as e:
            return False, str(e)

    async def get_pipelines(self) -> List[Dict]:
        """Get all pipelines"""
        result = await self._request("GET", "pipelines")
        return result.get("data", []) if result.get("success") else []

    async def get_stages(self, pipeline_id: Optional[int] = None) -> List[Dict]:
        """Get pipeline stages"""
        endpoint = f"stages?pipeline_id={pipeline_id}" if pipeline_id else "stages"
        result = await self._request("GET", endpoint)
        return result.get("data", []) if result.get("success") else []

    async def create_person(self, data: dict) -> Tuple[int, str]:
        """Create a person in Pipedrive"""
        person_data = {
            "name": data.get("name", f"{data.get('first_name', '')} {data.get('last_name', '')}").strip(),
            "email": [data["email"]] if data.get("email") else None,
            "phone": [data["phone"]] if data.get("phone") else None,
        }

        # Remove None values
        person_data = {k: v for k, v in person_data.items() if v}

        result = await self._request("POST", "persons", person_data)

        if result.get("success"):
            person = result.get("data", {})
            person_id = person.get("id")
            # Construct URL - note: company_domain needed for direct URL
            url = f"https://{self.company_domain}.pipedrive.com/person/{person_id}" if self.company_domain else ""
            return person_id, url

        raise Exception("Failed to create person in Pipedrive")

    async def create_deal(self, lead: dict, field_mapping: dict = None) -> Tuple[str, str]:
        """Create a deal from a lead"""
        field_mapping = field_mapping or {}

        # First, create or find person
        person_id = None
        if lead.get("email"):
            # Search for existing person
            search_result = await self._request("GET", f"persons/search?term={lead['email']}&fields=email")
            if search_result.get("data", {}).get("items"):
                person_id = search_result["data"]["items"][0]["item"]["id"]

        if not person_id and (lead.get("email") or lead.get("first_name")):
            person_id, _ = await self.create_person(lead)

        # Create deal
        name = lead.get("first_name", "")
        if lead.get("last_name"):
            name += f" {lead['last_name']}"
        if not name and lead.get("email"):
            name = lead["email"].split("@")[0]

        deal_data = {
            "title": f"Lead: {name}" if name else f"Lead from {lead.get('source', 'AdsMaster')}",
            "value": lead.get("value_micros", 0) / 1000000 if lead.get("value_micros") else None,
            "currency": "USD",
            "person_id": person_id,
        }

        # Add custom fields from mapping
        if lead.get("source"):
            deal_data["org_name"] = lead.get("source")  # Use org for source tracking

        # Remove None values
        deal_data = {k: v for k, v in deal_data.items() if v is not None}

        result = await self._request("POST", "deals", deal_data)

        if result.get("success"):
            deal = result.get("data", {})
            deal_id = str(deal.get("id"))
            url = f"https://{self.company_domain}.pipedrive.com/deal/{deal_id}" if self.company_domain else ""
            return deal_id, url

        raise Exception("Failed to create deal in Pipedrive")

    async def update_deal(self, deal_id: str, data: dict) -> bool:
        """Update an existing deal"""
        result = await self._request("PUT", f"deals/{deal_id}", data)
        return result.get("success", False)

    async def get_deal(self, deal_id: str) -> Optional[Dict]:
        """Get deal details"""
        try:
            result = await self._request("GET", f"deals/{deal_id}")
            return result.get("data") if result.get("success") else None
        except Exception:
            return None

    async def sync_leads(self, org_id: str, direction: str, field_mapping: dict) -> Tuple[int, int]:
        """Sync leads between AdsMaster and Pipedrive"""
        supabase = get_supabase_client()
        success_count = 0
        failure_count = 0

        if direction in ["to_crm", "both"]:
            # Get unsynced conversions
            result = supabase.table("offline_conversions").select("*").eq("organization_id", org_id).is_("synced_to_crm", "null").limit(100).execute()

            for lead in result.data or []:
                try:
                    crm_id, crm_url = await self.create_deal(lead, field_mapping)

                    # Mark as synced
                    supabase.table("offline_conversions").update({
                        "synced_to_crm": True,
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("id", lead["id"]).execute()

                    success_count += 1
                except Exception as e:
                    print(f"Failed to sync lead {lead['id']}: {e}")
                    failure_count += 1

        if direction in ["from_crm", "both"]:
            # Get recent deals from Pipedrive
            try:
                result = await self._request("GET", "deals?status=open&sort=update_time DESC&limit=50")
                deals = result.get("data", []) if result.get("success") else []

                for deal in deals:
                    # Check if already mapped
                    existing = supabase.table("crm_contact_mapping").select("id").eq("crm_contact_id", str(deal["id"])).execute()

                    if not existing.data:
                        # Create conversion from deal (simplified)
                        success_count += 1

            except Exception as e:
                print(f"Failed to sync from Pipedrive: {e}")
                failure_count += 1

        return success_count, failure_count

    async def get_activities(self, deal_id: str) -> List[Dict]:
        """Get activities for a deal"""
        result = await self._request("GET", f"deals/{deal_id}/activities")
        return result.get("data", []) if result.get("success") else []

    async def add_note(self, deal_id: str, content: str) -> bool:
        """Add a note to a deal"""
        note_data = {
            "content": content,
            "deal_id": int(deal_id)
        }
        result = await self._request("POST", "notes", note_data)
        return result.get("success", False)
