import logging
from typing import Dict, Any, Optional
from backend.app.config import settings
from backend.app.agent.prompts import (
    DEFAULT_BACKGROUND,
    DEFAULT_TRIAGE_INSTRUCTIONS,
    DEFAULT_RESPONSE_PREFERENCES,
    DEFAULT_CAL_PREFERENCES,
    MEMORY_UPDATE_PROMPT
)
from backend.app.schemas import UserPreferences

logger = logging.getLogger(__name__)


class PreferenceStore:
    """Manages system background and user preferences with adaptive learning."""

    def __init__(self):
        self.background: str = DEFAULT_BACKGROUND
        self.triage_instructions: str = DEFAULT_TRIAGE_INSTRUCTIONS
        self.response_preferences: str = DEFAULT_RESPONSE_PREFERENCES
        self.cal_preferences: str = DEFAULT_CAL_PREFERENCES

    def get_all(self) -> Dict[str, str]:
        return {
            "background": self.background,
            "triage_instructions": self.triage_instructions,
            "response_preferences": self.response_preferences,
            "cal_preferences": self.cal_preferences,
        }

    def update_profile(
        self,
        background: Optional[str] = None,
        triage_instructions: Optional[str] = None,
        response_preferences: Optional[str] = None,
        cal_preferences: Optional[str] = None,
    ):
        if background is not None:
            self.background = background
        if triage_instructions is not None:
            self.triage_instructions = triage_instructions
        if response_preferences is not None:
            self.response_preferences = response_preferences
        if cal_preferences is not None:
            self.cal_preferences = cal_preferences

    def learn_from_feedback(self, namespace: str, feedback_text: str, llm_instance: Optional[Any] = None) -> bool:
        """Update a specific preference dimension based on feedback."""
        current_map = {
            "triage_preferences": self.triage_instructions,
            "response_preferences": self.response_preferences,
            "cal_preferences": self.cal_preferences,
        }

        current_val = current_map.get(namespace, self.response_preferences)

        if llm_instance and settings.OPENAI_API_KEY:
            try:
                prompt = MEMORY_UPDATE_PROMPT.format(
                    namespace=namespace,
                    current_profile=current_val,
                    feedback_content=feedback_text,
                )
                structured_llm = llm_instance.with_structured_output(UserPreferences)
                result = structured_llm.invoke([{"role": "user", "content": prompt}])
                if result and result.user_preferences:
                    new_val = result.user_preferences
                    if namespace == "triage_preferences":
                        self.triage_instructions = new_val
                    elif namespace == "cal_preferences":
                        self.cal_preferences = new_val
                    else:
                        self.response_preferences = new_val
                    return True
            except Exception as e:
                logger.warning(f"LLM memory update failed: {e}. Using rule append fallback.")

        # Fallback: append feedback as a new bullet point rule
        clean_feedback = feedback_text.strip().replace("\n", " ")
        updated_val = current_val.strip() + f"\n- Preference Note: {clean_feedback}"

        if namespace == "triage_preferences":
            self.triage_instructions = updated_val
        elif namespace == "cal_preferences":
            self.cal_preferences = updated_val
        else:
            self.response_preferences = updated_val

        return True


# Global singleton instance
preference_store = PreferenceStore()
