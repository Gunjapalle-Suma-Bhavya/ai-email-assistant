"""
MongoDB Database Service with Motor AsyncIO Driver & Resilient Fallback.
Provides collections for users, emails, drafts, preferences, calendar_events, and feedback.
"""
import os
import json
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.config import settings
from backend.app.agent.prompts import (
    DEFAULT_BACKGROUND,
    DEFAULT_TRIAGE_INSTRUCTIONS,
    DEFAULT_RESPONSE_PREFERENCES,
    DEFAULT_CAL_PREFERENCES,
)

logger = logging.getLogger("database.mongo")


class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_connected: bool = False
        
        # Resilient in-memory/embedded fallback store
        self._mem_users: Dict[str, Dict[str, Any]] = {}
        self._mem_emails: Dict[str, Dict[str, Any]] = {}
        self._mem_drafts: Dict[str, Dict[str, Any]] = {}
        self._mem_prefs: Dict[str, Dict[str, Any]] = {}
        self._mem_calendar: Dict[str, Dict[str, Any]] = {}
        self._mem_feedback: Dict[str, Dict[str, Any]] = {}

    async def connect(self):
        """Initialize connection to MongoDB with timeout."""
        uri = settings.MONGODB_URI
        if uri:
            try:
                import asyncio
                self.client = AsyncIOMotorClient(
                    uri,
                    serverSelectionTimeoutMS=2000,
                    connectTimeoutMS=2000,
                )
                # Test ping with 2.5s strict timeout
                await asyncio.wait_for(self.client.admin.command("ping"), timeout=2.5)
                self.db = self.client[settings.DATABASE_NAME]
                self.is_connected = True
                logger.info(f"Connected to MongoDB Atlas: {settings.DATABASE_NAME}")
                return
            except Exception as e:
                logger.warning(
                    f"MongoDB connection notice: {e}. "
                    f"Operating in resilient standalone mode (data preserved in memory/local store)."
                )
        self.is_connected = False

    async def disconnect(self):
        if self.client:
            self.client.close()

    # ---------------- USER METHODS ----------------
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        norm_email = email.lower().strip()
        if self.is_connected and self.db is not None:
            user = await self.db.users.find_one({"email": norm_email})
            return user
        for u in self._mem_users.values():
            if u["email"].lower() == norm_email:
                return dict(u)
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            return await self.db.users.find_one({"_id": user_id})
        return self._mem_users.get(user_id)

    async def update_user_google_tokens(self, user_id: str, tokens: Dict[str, Any], account_email: Optional[str] = None):
        user = await self.get_user_by_id(user_id)
        if not user:
            return

        email = (account_email or user.get("email", "")).lower().strip()
        is_workspace = not email.endswith("@gmail.com") and not email.endswith("@googlemail.com")

        accounts = user.get("connected_accounts", [])
        updated = False
        for acc in accounts:
            if acc.get("email") == email:
                acc["google_tokens"] = tokens
                updated = True
                break
        if not updated:
            accounts.append({
                "account_id": f"acc_{uuid.uuid4().hex[:8]}",
                "email": email,
                "full_name": user.get("full_name") or email.split("@")[0].capitalize(),
                "account_type": "workspace" if is_workspace else "personal",
                "avatar_url": user.get("avatar_url"),
                "google_tokens": tokens,
                "is_active": True,
                "added_at": datetime.utcnow().isoformat(),
            })

        active_id = user.get("active_account_id") or accounts[0]["account_id"]

        if self.is_connected and self.db is not None:
            await self.db.users.update_one(
                {"_id": user_id},
                {"$set": {
                    "google_tokens": tokens,
                    "google_connected": True,
                    "connected_accounts": accounts,
                    "active_account_id": active_id,
                }}
            )
        elif user_id in self._mem_users:
            self._mem_users[user_id]["google_tokens"] = tokens
            self._mem_users[user_id]["google_connected"] = True
            self._mem_users[user_id]["connected_accounts"] = accounts
            self._mem_users[user_id]["active_account_id"] = active_id

    async def get_user_by_connected_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Look up user document by primary email or any linked Google account email."""
        norm_email = email.lower().strip()
        if self.is_connected and self.db is not None:
            user = await self.db.users.find_one({
                "$or": [
                    {"email": norm_email},
                    {"connected_accounts.email": norm_email}
                ]
            })
            return user
        for u in self._mem_users.values():
            if u.get("email", "").lower() == norm_email:
                return dict(u)
            for acc in u.get("connected_accounts", []):
                if acc.get("email", "").lower() == norm_email:
                    return dict(u)
        return None

    async def add_connected_account(self, user_id: str, account_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Attach or update a connected Google account (Personal or Corporate Workspace)."""
        acc_email = account_dict.get("email", "").lower().strip()
        account_dict["email"] = acc_email
        account_id = account_dict.get("account_id") or f"acc_{uuid.uuid4().hex[:8]}"
        account_dict["account_id"] = account_id
        if "added_at" not in account_dict:
            account_dict["added_at"] = datetime.utcnow().isoformat()

        user = await self.get_user_by_id(user_id)
        accounts = list(user.get("connected_accounts", [])) if user else []
        updated = False
        for i, acc in enumerate(accounts):
            if acc.get("email") == acc_email or acc.get("account_id") == account_id:
                accounts[i] = {**acc, **account_dict}
                updated = True
                break
        if not updated:
            accounts.append(account_dict)

        active_id = user.get("active_account_id") if user else account_id
        if not active_id:
            active_id = account_id

        if self.is_connected and self.db is not None:
            await self.db.users.update_one(
                {"_id": user_id},
                {"$set": {
                    "connected_accounts": accounts,
                    "active_account_id": active_id,
                    "google_connected": True,
                }}
            )
        elif user_id in self._mem_users:
            self._mem_users[user_id]["connected_accounts"] = accounts
            self._mem_users[user_id]["active_account_id"] = active_id
            self._mem_users[user_id]["google_connected"] = True

        return account_dict

    async def set_active_account(self, user_id: str, account_id: str) -> bool:
        """Switch active account filter ('acc_...' or 'all' for unified view)."""
        if self.is_connected and self.db is not None:
            res = await self.db.users.update_one(
                {"_id": user_id},
                {"$set": {"active_account_id": account_id}}
            )
            return res.modified_count > 0 or res.matched_count > 0
        elif user_id in self._mem_users:
            self._mem_users[user_id]["active_account_id"] = account_id
            return True
        return False

    async def get_connected_accounts(self, user_id: str) -> Dict[str, Any]:
        """Retrieve list of connected accounts and active selection."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return {"active_account_id": "all", "accounts": []}
        accounts = user.get("connected_accounts", [])
        active_id = user.get("active_account_id") or (accounts[0]["account_id"] if accounts else "all")
        return {
            "active_account_id": active_id,
            "accounts": accounts,
        }

    async def remove_connected_account(self, user_id: str, account_id: str) -> bool:
        """Disconnect a secondary Google account."""
        if self.is_connected and self.db is not None:
            await self.db.users.update_one(
                {"_id": user_id},
                {"$pull": {"connected_accounts": {"account_id": account_id}}}
            )
            return True
        elif user_id in self._mem_users:
            accs = self._mem_users[user_id].get("connected_accounts", [])
            self._mem_users[user_id]["connected_accounts"] = [a for a in accs if a.get("account_id") != account_id]
            return True
        return False

    async def create_user(self, user_dict: Dict[str, Any]) -> Dict[str, Any]:
        user_dict["email"] = user_dict["email"].lower().strip()
        user_id = user_dict.get("_id") or f"usr_{uuid.uuid4().hex[:10]}"
        user_dict["_id"] = user_id
        
        # Populate initial connected_accounts if user has Google credentials
        if user_dict.get("google_tokens"):
            email = user_dict["email"]
            is_workspace = not email.endswith("@gmail.com") and not email.endswith("@googlemail.com")
            acc_id = f"acc_{uuid.uuid4().hex[:8]}"
            account_item = {
                "account_id": acc_id,
                "email": email,
                "full_name": user_dict.get("full_name") or email.split("@")[0].capitalize(),
                "account_type": "workspace" if is_workspace else "personal",
                "avatar_url": user_dict.get("avatar_url"),
                "google_tokens": user_dict["google_tokens"],
                "is_active": True,
                "added_at": datetime.utcnow().isoformat(),
            }
            user_dict["connected_accounts"] = [account_item]
            user_dict["active_account_id"] = acc_id

        if self.is_connected and self.db is not None:
            await self.db.users.insert_one(user_dict)
        else:
            self._mem_users[user_id] = dict(user_dict)
            
        # Initialize default preferences and seed sample emails for this user
        is_google = user_dict.get("auth_provider") == "google"
        await self.init_user_defaults(user_id, is_google=is_google)
        return user_dict

    async def init_user_defaults(self, user_id: str, is_google: bool = False):
        """Seed initial preferences and realistic inbox emails for a new user."""
        # Initialize default preferences
        pref = {
            "_id": f"pref_{user_id}",
            "user_id": user_id,
            "background": DEFAULT_BACKGROUND,
            "triage_instructions": DEFAULT_TRIAGE_INSTRUCTIONS,
            "response_preferences": DEFAULT_RESPONSE_PREFERENCES,
            "cal_preferences": DEFAULT_CAL_PREFERENCES,
            "learned_preferences": [
                {
                    "rule": "Prefers concise, direct bullet points over long explanatory paragraphs.",
                    "source": "Initial calibration",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            ],
            "updated_at": datetime.utcnow().isoformat(),
        }
        if self.is_connected and self.db is not None:
            await self.db.preferences.update_one({"user_id": user_id}, {"$set": pref}, upsert=True)
        else:
            self._mem_prefs[user_id] = pref

        # Seed sample emails from sample_emails.json only for local/manual sandbox accounts
        if settings.SAMPLE_EMAILS_PATH.exists() and not is_google:
            try:
                with open(settings.SAMPLE_EMAILS_PATH, "r", encoding="utf-8") as f:
                    samples = json.load(f)
                    for item in samples:
                        email_id = f"em_{user_id}_{item['id']}"
                        email_doc = {
                            "_id": email_id,
                            "user_id": user_id,
                            "author": item["author"],
                            "to": item["to"],
                            "subject": item["subject"],
                            "email_thread": item["email_thread"],
                            "received_at": item.get("received_at", datetime.utcnow().isoformat()),
                            "status": item.get("status", "unread"),
                            "classification": item.get("classification"),
                            "reasoning": item.get("reasoning", "Awaiting AI triage analysis."),
                            "confidence_score": 0.94 if item.get("classification") else None,
                            "draft_response": item.get("draft_response"),
                            "draft_subject": item.get("draft_subject"),
                            "calendar_event": item.get("calendar_event"),
                            "feedback_history": [],
                            "source": "sample",
                        }
                        if self.is_connected and self.db is not None:
                            await self.db.emails.update_one(
                                {"_id": email_id}, {"$set": email_doc}, upsert=True
                            )
                        else:
                            self._mem_emails[email_id] = email_doc
            except Exception as e:
                logger.error(f"Error seeding user sample emails: {e}")

    async def clear_mock_emails(self, user_id: str):
        """Purge all seeded mock/sample emails for a user so only real emails remain."""
        if self.is_connected and self.db is not None:
            await self.db.emails.delete_many({
                "user_id": user_id,
                "$or": [
                    {"source": "sample"},
                    {"source": {"$ne": "gmail"}},
                    {"_id": {"$regex": f"^em_{user_id}_email_"}}
                ]
            })
        else:
            self._mem_emails = {
                k: v for k, v in self._mem_emails.items()
                if not (v.get("user_id") == user_id and (v.get("source") != "gmail" or k.startswith(f"em_{user_id}_email_")))
            }

    # ---------------- EMAIL METHODS ----------------
    async def list_emails(
        self,
        user_id: str,
        folder: Optional[str] = None,
        search_query: Optional[str] = None,
        account_email: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"user_id": user_id}

        if account_email and account_email != "all":
            norm_acc = account_email.lower().strip()
            query["$or"] = [
                {"account_email": norm_acc},
                {"to": {"$regex": norm_acc, "$options": "i"}}
            ]

        if folder:
            if folder == "respond":
                query["classification"] = "respond"
                query["status"] = {"$ne": "sent"}
            elif folder == "notify":
                query["classification"] = "notify"
            elif folder == "ignore":
                query["$or"] = [{"classification": "ignore"}, {"status": "ignored"}]
            elif folder == "drafted":
                query["status"] = "drafted"
            elif folder == "sent":
                query["status"] = "sent"
            elif folder == "unread":
                query["status"] = "unread"

        if self.is_connected and self.db is not None:
            cursor = self.db.emails.find(query).sort("received_at", -1)
            emails = await cursor.to_list(length=100)
        else:
            emails = [e for e in self._mem_emails.values() if e.get("user_id") == user_id]
            if account_email and account_email != "all":
                norm_acc = account_email.lower().strip()
                emails = [
                    e for e in emails
                    if e.get("account_email", "").lower() == norm_acc
                    or norm_acc in e.get("to", "").lower()
                ]
            if folder:
                if folder == "respond":
                    emails = [e for e in emails if e.get("classification") == "respond" and e.get("status") != "sent"]
                elif folder == "notify":
                    emails = [e for e in emails if e.get("classification") == "notify"]
                elif folder == "ignore":
                    emails = [e for e in emails if e.get("classification") == "ignore" or e.get("status") == "ignored"]
                elif folder == "drafted":
                    emails = [e for e in emails if e.get("status") == "drafted"]
                elif folder == "sent":
                    emails = [e for e in emails if e.get("status") == "sent"]
                elif folder == "unread":
                    emails = [e for e in emails if e.get("status") == "unread"]

        if search_query:
            q = search_query.lower()
            emails = [
                e for e in emails
                if q in e.get("subject", "").lower()
                or q in e.get("author", "").lower()
                or q in e.get("email_thread", "").lower()
            ]

        # Map _id to id for API consumers
        for e in emails:
            e["id"] = e.get("_id", e.get("id"))
        return sorted(emails, key=lambda x: x.get("received_at", ""), reverse=True)

    get_emails = list_emails

    async def get_email(self, email_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        possible_ids = [email_id, f"em_{user_id}_{email_id}"]
        if self.is_connected and self.db is not None:
            email = await self.db.emails.find_one({
                "$or": [{"_id": pid} for pid in possible_ids],
                "user_id": user_id
            })
        else:
            email = None
            for pid in possible_ids:
                if pid in self._mem_emails and self._mem_emails[pid].get("user_id") == user_id:
                    email = dict(self._mem_emails[pid])
                    break
        if email:
            email["id"] = email.get("_id", email.get("id"))
        return email

    async def get_email_by_google_id(self, user_id: str, google_id: str) -> Optional[Dict[str, Any]]:
        """Find an email by its unique Google Message ID."""
        if not google_id:
            return None
        if self.is_connected and self.db is not None:
            email = await self.db.emails.find_one({
                "user_id": user_id,
                "$or": [{"google_id": google_id}, {"_id": f"em_gmail_{google_id}"}]
            })
            if email:
                email["id"] = email.get("_id", email.get("id"))
            return email
        for e in self._mem_emails.values():
            if e.get("user_id") == user_id and (e.get("google_id") == google_id or e.get("_id") == f"em_gmail_{google_id}"):
                item = dict(e)
                item["id"] = item.get("_id", item.get("id"))
                return item
        return None

    async def create_email(self, email_doc: Dict[str, Any]) -> Dict[str, Any]:
        email_id = email_doc.get("_id") or f"em_{uuid.uuid4().hex[:10]}"
        email_doc["_id"] = email_id
        email_doc["id"] = email_id
        if self.is_connected and self.db is not None:
            await self.db.emails.update_one({"_id": email_id}, {"$set": email_doc}, upsert=True)
        else:
            self._mem_emails[email_id] = dict(email_doc)
        return email_doc

    async def update_email(self, email_id: str, user_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        existing = await self.get_email(email_id, user_id)
        if not existing:
            return None
        actual_id = existing.get("_id", email_id)
        if self.is_connected and self.db is not None:
            await self.db.emails.update_one(
                {"_id": actual_id, "user_id": user_id},
                {"$set": kwargs}
            )
            return await self.get_email(actual_id, user_id)
        else:
            item = self._mem_emails.get(actual_id)
            if item:
                item.update(kwargs)
                item["id"] = item.get("_id", actual_id)
                return dict(item)
            return None

    async def get_email_stats(self, user_id: str) -> Dict[str, int]:
        all_emails = await self.list_emails(user_id=user_id)
        return {
            "total": len(all_emails),
            "unread": sum(1 for e in all_emails if e.get("status") == "unread"),
            "respond": sum(1 for e in all_emails if e.get("classification") == "respond"),
            "notify": sum(1 for e in all_emails if e.get("classification") == "notify"),
            "ignore": sum(1 for e in all_emails if e.get("classification") == "ignore"),
            "drafted": sum(1 for e in all_emails if e.get("status") == "drafted"),
            "sent": sum(1 for e in all_emails if e.get("status") == "sent"),
        }

    # ---------------- DRAFTS METHODS ----------------
    async def list_drafts(self, user_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            cursor = self.db.drafts.find({"user_id": user_id}).sort("updated_at", -1)
            drafts = await cursor.to_list(length=100)
        else:
            drafts = [d for d in self._mem_drafts.values() if d.get("user_id") == user_id]
        for d in drafts:
            d["id"] = d.get("_id", d.get("id"))
        return drafts

    async def save_draft(self, draft_doc: Dict[str, Any]) -> Dict[str, Any]:
        draft_id = draft_doc.get("_id") or f"drf_{uuid.uuid4().hex[:10]}"
        draft_doc["_id"] = draft_id
        draft_doc["id"] = draft_id
        draft_doc["updated_at"] = datetime.utcnow().isoformat()
        if self.is_connected and self.db is not None:
            await self.db.drafts.update_one(
                {"_id": draft_id}, {"$set": draft_doc}, upsert=True
            )
        else:
            self._mem_drafts[draft_id] = dict(draft_doc)
        return draft_doc

    async def get_draft_by_email(self, email_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            d = await self.db.drafts.find_one({"email_id": email_id, "user_id": user_id})
        else:
            d = next((d for d in self._mem_drafts.values() if d.get("email_id") == email_id and d.get("user_id") == user_id), None)
        if d:
            d["id"] = d.get("_id", d.get("id"))
        return d

    # ---------------- PREFERENCES METHODS ----------------
    async def get_preferences(self, user_id: str) -> Dict[str, Any]:
        if self.is_connected and self.db is not None:
            p = await self.db.preferences.find_one({"user_id": user_id})
        else:
            p = self._mem_prefs.get(user_id)
        if not p:
            await self.init_user_defaults(user_id)
            return await self.get_preferences(user_id)
        p["id"] = p.get("_id", user_id)
        return p

    async def update_preferences(self, user_id: str, **kwargs) -> Dict[str, Any]:
        kwargs["updated_at"] = datetime.utcnow().isoformat()
        if self.is_connected and self.db is not None:
            await self.db.preferences.update_one(
                {"user_id": user_id},
                {"$set": kwargs},
                upsert=True
            )
        else:
            if user_id not in self._mem_prefs:
                await self.init_user_defaults(user_id)
            self._mem_prefs[user_id].update(kwargs)
        return await self.get_preferences(user_id)

    async def append_learned_preference(self, user_id: str, rule: str, source: str = "HITL feedback"):
        pref = await self.get_preferences(user_id)
        learned = pref.get("learned_preferences", [])
        learned.append({
            "rule": rule,
            "source": source,
            "timestamp": datetime.utcnow().isoformat(),
        })
        await self.update_preferences(user_id, learned_preferences=learned)

    # ---------------- CALENDAR METHODS ----------------
    async def list_calendar_events(self, user_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            cursor = self.db.calendar_events.find({"user_id": user_id}).sort("preferred_day", 1)
            events = await cursor.to_list(length=100)
        else:
            events = [e for e in self._mem_calendar.values() if e.get("user_id") == user_id]
        for e in events:
            e["id"] = e.get("_id", e.get("id"))
        return events

    async def clear_mock_calendar_events(self, user_id: str):
        """Purge all fake/sample calendar events for a user."""
        mock_subjects = ["Sprint Architecture Sync", "Q3 AI Infrastructure Review"]
        if self.is_connected and self.db is not None:
            await self.db.calendar_events.delete_many({
                "user_id": user_id,
                "$or": [
                    {"subject": {"$in": mock_subjects}},
                    {"source": {"$ne": "google_calendar"}}
                ]
            })
        else:
            self._mem_calendar = {
                k: v for k, v in self._mem_calendar.items()
                if not (v.get("user_id") == user_id and (v.get("subject") in mock_subjects or v.get("source") != "google_calendar"))
            }

    async def add_calendar_event(self, event_doc: Dict[str, Any]) -> Dict[str, Any]:
        evt_id = event_doc.get("_id") or f"evt_{uuid.uuid4().hex[:8]}"
        event_doc["_id"] = evt_id
        event_doc["id"] = evt_id
        if self.is_connected and self.db is not None:
            await self.db.calendar_events.update_one({"_id": evt_id}, {"$set": event_doc}, upsert=True)
        else:
            self._mem_calendar[evt_id] = dict(event_doc)
        return event_doc

    async def confirm_calendar_event(self, event_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            await self.db.calendar_events.update_one(
                {"_id": event_id, "user_id": user_id},
                {"$set": {"confirmed": True}}
            )
            return await self.db.calendar_events.find_one({"_id": event_id, "user_id": user_id})
        else:
            e = self._mem_calendar.get(event_id)
            if e and e.get("user_id") == user_id:
                e["confirmed"] = True
                e["id"] = e.get("_id", event_id)
                return dict(e)
            return None

    # ---------------- FEEDBACK METHODS ----------------
    async def log_feedback(self, feedback_doc: Dict[str, Any]) -> Dict[str, Any]:
        fb_id = feedback_doc.get("_id") or f"fb_{uuid.uuid4().hex[:8]}"
        feedback_doc["_id"] = fb_id
        feedback_doc["id"] = fb_id
        feedback_doc["timestamp"] = datetime.utcnow().isoformat()
        if self.is_connected and self.db is not None:
            await self.db.feedback.insert_one(feedback_doc)
        else:
            self._mem_feedback[fb_id] = dict(feedback_doc)
        return feedback_doc

    async def list_feedback(self, user_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            cursor = self.db.feedback.find({"user_id": user_id}).sort("timestamp", -1)
            items = await cursor.to_list(length=50)
        else:
            items = [f for f in self._mem_feedback.values() if f.get("user_id") == user_id]
        for item in items:
            item["id"] = item.get("_id", item.get("id"))
        return items


# Singleton instance
db = DatabaseManager()
db_manager = db
