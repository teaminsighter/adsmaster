"""
ActiveCampaign CRM Integration Service
Handles syncing contacts and automations with ActiveCampaign
"""

import httpx
from typing import Optional, Tuple, List, Dict, Any
from datetime import datetime

from ..supabase_client import get_supabase_client


class ActiveCampaignService:
    """Service for interacting with ActiveCampaign API"""

    def __init__(self, api_url: str, api_key: str):
        # API URL should be like: https://youraccountname.api-us1.com
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "Api-Token": api_key,
            "Content-Type": "application/json"
        }

    async def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to ActiveCampaign API"""
        url = f"{self.api_url}/api/3/{endpoint}"

        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(url, headers=self.headers, timeout=30)
            elif method == "POST":
                response = await client.post(url, headers=self.headers, json=data, timeout=30)
            elif method == "PUT":
                response = await client.put(url, headers=self.headers, json=data, timeout=30)
            elif method == "DELETE":
                response = await client.delete(url, headers=self.headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code >= 400:
                error_data = response.json() if response.text else {}
                raise Exception(f"ActiveCampaign API error: {error_data.get('message', response.status_code)}")

            return response.json()

    async def test_connection(self) -> Tuple[bool, str]:
        """Test connection to ActiveCampaign"""
        try:
            result = await self._request("GET", "users/me")
            if result.get("user"):
                user = result["user"]
                return True, f"Connected as {user.get('firstName', '')} {user.get('lastName', '')}".strip()
            return False, "Failed to connect to ActiveCampaign"
        except Exception as e:
            return False, str(e)

    async def get_lists(self) -> List[Dict]:
        """Get all contact lists"""
        result = await self._request("GET", "lists")
        return result.get("lists", [])

    async def get_tags(self) -> List[Dict]:
        """Get all tags"""
        result = await self._request("GET", "tags")
        return result.get("tags", [])

    async def search_contact(self, email: str) -> Optional[Dict]:
        """Search for a contact by email"""
        result = await self._request("GET", f"contacts?email={email}")
        contacts = result.get("contacts", [])
        return contacts[0] if contacts else None

    async def create_contact(self, lead: dict, field_mapping: dict = None) -> Tuple[str, str]:
        """Create a contact from a lead"""
        field_mapping = field_mapping or {}

        # Check if contact exists
        existing = await self.search_contact(lead.get("email", ""))
        if existing:
            contact_id = existing["id"]
            # Update existing contact
            await self.update_contact(contact_id, lead, field_mapping)
            url = f"{self.api_url.replace('.api-us1.com', '.activehosted.com')}/app/contacts/{contact_id}"
            return contact_id, url

        # Build contact data
        contact_data = {
            "contact": {
                "email": lead.get("email"),
                "firstName": lead.get("first_name", ""),
                "lastName": lead.get("last_name", ""),
                "phone": lead.get("phone", ""),
            }
        }

        # Add custom fields
        field_values = []

        # Map source to a custom field if available
        if lead.get("source"):
            # This would need the actual field ID from ActiveCampaign
            # For now, we'll add it as a tag instead
            pass

        if field_values:
            contact_data["contact"]["fieldValues"] = field_values

        result = await self._request("POST", "contacts", contact_data)

        if result.get("contact"):
            contact = result["contact"]
            contact_id = contact["id"]

            # Add tags based on source
            if lead.get("ad_platform"):
                await self.add_tag_to_contact(contact_id, f"Source: {lead['ad_platform']}")
            if lead.get("source"):
                await self.add_tag_to_contact(contact_id, f"Campaign: {lead['source']}")

            # Add to list if specified
            # list_id would come from integration settings

            url = f"{self.api_url.replace('.api-us1.com', '.activehosted.com')}/app/contacts/{contact_id}"
            return contact_id, url

        raise Exception("Failed to create contact in ActiveCampaign")

    async def update_contact(self, contact_id: str, lead: dict, field_mapping: dict = None) -> bool:
        """Update an existing contact"""
        contact_data = {
            "contact": {
                "firstName": lead.get("first_name", ""),
                "lastName": lead.get("last_name", ""),
                "phone": lead.get("phone", ""),
            }
        }

        # Remove empty values
        contact_data["contact"] = {k: v for k, v in contact_data["contact"].items() if v}

        if contact_data["contact"]:
            result = await self._request("PUT", f"contacts/{contact_id}", contact_data)
            return bool(result.get("contact"))

        return True

    async def add_contact_to_list(self, contact_id: str, list_id: str) -> bool:
        """Add a contact to a list"""
        data = {
            "contactList": {
                "list": list_id,
                "contact": contact_id,
                "status": 1  # 1 = subscribed
            }
        }
        result = await self._request("POST", "contactLists", data)
        return bool(result.get("contactList"))

    async def add_tag_to_contact(self, contact_id: str, tag_name: str) -> bool:
        """Add a tag to a contact (creates tag if it doesn't exist)"""
        # First, find or create the tag
        tags = await self.get_tags()
        tag_id = None

        for tag in tags:
            if tag["tag"].lower() == tag_name.lower():
                tag_id = tag["id"]
                break

        if not tag_id:
            # Create the tag
            tag_result = await self._request("POST", "tags", {"tag": {"tag": tag_name, "tagType": "contact"}})
            if tag_result.get("tag"):
                tag_id = tag_result["tag"]["id"]

        if tag_id:
            # Add tag to contact
            data = {
                "contactTag": {
                    "contact": contact_id,
                    "tag": tag_id
                }
            }
            result = await self._request("POST", "contactTags", data)
            return bool(result.get("contactTag"))

        return False

    async def trigger_automation(self, contact_id: str, automation_id: str) -> bool:
        """Trigger an automation for a contact"""
        data = {
            "contactAutomation": {
                "contact": contact_id,
                "automation": automation_id
            }
        }
        result = await self._request("POST", "contactAutomations", data)
        return bool(result.get("contactAutomation"))

    async def create_deal(self, lead: dict, pipeline_id: str = None, stage_id: str = None) -> Tuple[str, str]:
        """Create a deal in ActiveCampaign CRM"""
        # First ensure contact exists
        contact_id = None
        if lead.get("email"):
            existing = await self.search_contact(lead["email"])
            if existing:
                contact_id = existing["id"]
            else:
                contact_id, _ = await self.create_contact(lead)

        if not contact_id:
            raise Exception("Cannot create deal without contact")

        # Create deal
        name = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip()
        if not name and lead.get("email"):
            name = lead["email"].split("@")[0]

        deal_data = {
            "deal": {
                "title": f"Lead: {name}" if name else "New Lead",
                "value": lead.get("value_micros", 0) / 100 if lead.get("value_micros") else 0,  # AC uses cents
                "currency": "usd",
                "contact": contact_id,
            }
        }

        if pipeline_id:
            deal_data["deal"]["group"] = pipeline_id
        if stage_id:
            deal_data["deal"]["stage"] = stage_id

        result = await self._request("POST", "deals", deal_data)

        if result.get("deal"):
            deal = result["deal"]
            deal_id = deal["id"]
            url = f"{self.api_url.replace('.api-us1.com', '.activehosted.com')}/app/deals/{deal_id}"
            return deal_id, url

        raise Exception("Failed to create deal in ActiveCampaign")

    async def sync_contacts(self, org_id: str, direction: str, field_mapping: dict) -> Tuple[int, int]:
        """Sync contacts between AdsMaster and ActiveCampaign"""
        supabase = get_supabase_client()
        success_count = 0
        failure_count = 0

        if direction in ["to_crm", "both"]:
            # Get unsynced conversions
            result = supabase.table("offline_conversions").select("*").eq("organization_id", org_id).is_("synced_to_crm", "null").limit(100).execute()

            for lead in result.data or []:
                if not lead.get("email"):
                    continue

                try:
                    crm_id, crm_url = await self.create_contact(lead, field_mapping)

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
            # Get recent contacts from ActiveCampaign
            try:
                result = await self._request("GET", "contacts?orders[cdate]=DESC&limit=50")
                contacts = result.get("contacts", [])

                for contact in contacts:
                    # Check if already mapped
                    existing = supabase.table("crm_contact_mapping").select("id").eq("crm_contact_id", str(contact["id"])).execute()

                    if not existing.data:
                        # Could create a conversion record from AC contact
                        success_count += 1

            except Exception as e:
                print(f"Failed to sync from ActiveCampaign: {e}")
                failure_count += 1

        return success_count, failure_count

    async def get_automations(self) -> List[Dict]:
        """Get all automations"""
        result = await self._request("GET", "automations")
        return result.get("automations", [])

    async def get_pipelines(self) -> List[Dict]:
        """Get all deal pipelines"""
        result = await self._request("GET", "dealGroups")
        return result.get("dealGroups", [])

    async def get_pipeline_stages(self, pipeline_id: str) -> List[Dict]:
        """Get stages for a pipeline"""
        result = await self._request("GET", f"dealStages?filters[d_groupid]={pipeline_id}")
        return result.get("dealStages", [])

    async def add_note(self, contact_id: str, note: str) -> bool:
        """Add a note to a contact"""
        data = {
            "note": {
                "note": note,
                "reltype": "Contact",
                "relid": contact_id
            }
        }
        result = await self._request("POST", "notes", data)
        return bool(result.get("note"))
