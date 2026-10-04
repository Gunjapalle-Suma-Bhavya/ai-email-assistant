import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

from langchain_openai import ChatOpenAI
from backend.app.config import settings
from backend.app.schemas import RouterSchema, DraftResponse, TriageResponse
from backend.app.agent.prompts import (
    TRIAGE_SYSTEM_PROMPT,
    TRIAGE_USER_PROMPT,
    AGENT_SYSTEM_PROMPT,
)
from backend.app.agent.tools import get_agent_tools, get_tools_map
from backend.app.agent.memory import preference_store

logger = logging.getLogger(__name__)


def get_llm(temperature: float = 0.0) -> Optional[ChatOpenAI]:
    """Get initialized ChatOpenAI client if API key is present."""
    api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        return ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=api_key,
            base_url=settings.OPENAI_BASE_URL,
            temperature=temperature,
            request_timeout=5.0,
            max_retries=1,
        )
    except Exception as e:
        logger.error(f"Error initializing ChatOpenAI: {e}")
        return None


class EmailAssistantEngine:
    """Core engine for AI Email Triage and Draft Generation."""

    def __init__(self):
        self.tools = get_agent_tools()
        self.tools_map = get_tools_map()

    def triage(self, author: str, to: str, subject: str, email_thread: str) -> TriageResponse:
        """Classify incoming email into 'respond', 'notify', or 'ignore' with reasoning."""
        llm = get_llm(temperature=0.0)
        
        system_prompt = TRIAGE_SYSTEM_PROMPT.format(
            background=preference_store.background,
            triage_instructions=preference_store.triage_instructions,
        )
        user_prompt = TRIAGE_USER_PROMPT.format(
            author=author,
            to=to,
            subject=subject,
            email_thread=email_thread,
        )

        if llm:
            try:
                structured_router = llm.with_structured_output(RouterSchema)
                result = structured_router.invoke([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ])
                if result:
                    return TriageResponse(
                        email_id=None,
                        classification=result.classification,
                        reasoning=result.reasoning,
                    )
            except Exception as e:
                logger.warning(f"LLM triage call failed: {e}. Falling back to rule engine.")

        # Fallback intelligent rule-based triage
        subject_lower = subject.lower()
        content_lower = email_thread.lower()

        if any(term in subject_lower or term in content_lower for term in ["newsletter", "unsubscribe", "promo", "liked your post"]):
            classification = "ignore"
            reasoning = "Identified as promotional/social media notification or non-actionable newsletter."
        elif any(term in subject_lower or term in content_lower for term in ["maintenance", "downtime", "alert", "reminder", "pr #", "github"]):
            classification = "notify"
            reasoning = "Contains important operational/status information or reminder, no response required."
        else:
            classification = "respond"
            reasoning = "Contains direct inquiry, question, or scheduling request requiring direct response."

        return TriageResponse(
            email_id=None,
            classification=classification,
            reasoning=reasoning,
        )

    def generate_draft(
        self,
        author: str,
        to: str,
        subject: str,
        email_thread: str,
        custom_instructions: Optional[str] = None,
    ) -> DraftResponse:
        """Generate response draft and/or calendar event."""
        llm = get_llm(temperature=0.2)
        current_date_str = datetime.now().strftime("%Y-%m-%d")

        system_prompt = AGENT_SYSTEM_PROMPT.format(
            current_date=current_date_str,
            background=preference_store.background,
            response_preferences=preference_store.response_preferences,
            cal_preferences=preference_store.cal_preferences,
        )

        user_content = f"Incoming Email:\nFrom: {author}\nTo: {to}\nSubject: {subject}\n\nContent:\n{email_thread}"
        if custom_instructions:
            user_content += f"\n\nExecutive Feedback / Custom Guidance: {custom_instructions}"

        if llm:
            try:
                llm_with_tools = llm.bind_tools(self.tools)
                ai_msg = llm_with_tools.invoke([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ])

                # Check if tool calls were triggered
                if hasattr(ai_msg, "tool_calls") and ai_msg.tool_calls:
                    calendar_event = None
                    draft_body = ""
                    draft_subject = f"Re: {subject.replace('Re: ', '')}"
                    recipient = author

                    for tc in ai_msg.tool_calls:
                        name = tc["name"]
                        args = tc.get("args", {})
                        if name == "schedule_meeting":
                            calendar_event = {
                                "subject": args.get("subject", subject),
                                "attendees": args.get("attendees", [author, to]),
                                "preferred_day": args.get("preferred_day", current_date_str),
                                "duration_minutes": args.get("duration_minutes", 30),
                            }
                        elif name == "write_email":
                            draft_body = args.get("content", "")
                            draft_subject = args.get("subject", draft_subject)
                            recipient = args.get("to", author)

                    if not draft_body and calendar_event:
                        draft_body = f"Hi,\n\nI've sent a calendar invitation for '{calendar_event['subject']}' on {calendar_event['preferred_day']}.\n\nLooking forward to speaking with you.\n\nBest regards,"

                    if draft_body:
                        return DraftResponse(
                            email_id=None,
                            subject=draft_subject,
                            to=recipient,
                            body=draft_body,
                            tool_name="write_email",
                            calendar_event=calendar_event,
                            requires_hitl=True,
                        )

                # If direct response text returned
                if ai_msg.content:
                    return DraftResponse(
                        email_id=None,
                        subject=f"Re: {subject.replace('Re: ', '')}",
                        to=author,
                        body=str(ai_msg.content),
                        tool_name="write_email",
                        calendar_event=None,
                        requires_hitl=True,
                    )
            except Exception as e:
                logger.warning(f"LLM draft generation failed: {e}. Using intelligent fallback generator.")

        # Fallback generator
        sender_name = author.split("<")[0].strip() if "<" in author else author
        if "schedule" in subject.lower() or "meeting" in subject.lower() or "call" in subject.lower():
            cal = {
                "subject": f"Discussion: {subject}",
                "attendees": [author, to],
                "preferred_day": f"{current_date_str} (Next Available Window)",
                "duration_minutes": 30,
            }
            body = (
                f"Hi {sender_name},\n\n"
                f"Thank you for reaching out. I would be happy to meet to discuss '{subject}'. "
                f"I am available on next Tuesday or Thursday afternoon. Please let me know what time works best for you, "
                f"or accept the tentative calendar invite.\n\n"
                f"Best regards,"
            )
            return DraftResponse(
                email_id=None,
                subject=f"Re: {subject.replace('Re: ', '')}",
                to=author,
                body=body,
                tool_name="schedule_meeting",
                calendar_event=cal,
                requires_hitl=True,
            )

        body = (
            f"Hi {sender_name},\n\n"
            f"Thank you for your email regarding '{subject}'. I have received your request and am looking into it. "
            f"I will follow up shortly with further details.\n\n"
            f"Best regards,"
        )
        return DraftResponse(
            email_id=None,
            subject=f"Re: {subject.replace('Re: ', '')}",
            to=author,
            body=body,
            tool_name="write_email",
            calendar_event=None,
            requires_hitl=True,
        )


assistant_engine = EmailAssistantEngine()
