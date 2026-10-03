import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the project root if it exists
project_root = Path(__file__).resolve().parent.parent.parent
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Settings:
    # LLM Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # LangSmith / Observability
    LANGSMITH_API_KEY: str = os.getenv("LANGSMITH_API_KEY", "")
    LANGCHAIN_TRACING_V2: str = os.getenv("LANGCHAIN_TRACING_V2", "false")
    LANGCHAIN_PROJECT: str = os.getenv("LANGCHAIN_PROJECT", "email-assistant")

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # MongoDB Configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "ai_email_assistant")

    # JWT Authentication
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecret-jwt-token-key-change-in-production-at-least-32-chars")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Google OAuth 2.0 Settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Google Cloud Pub/Sub Webhooks
    GOOGLE_PUBSUB_TOPIC: str = os.getenv("GOOGLE_PUBSUB_TOPIC", "")
    GOOGLE_PUBSUB_VERIFICATION_TOKEN: str = os.getenv("GOOGLE_PUBSUB_VERIFICATION_TOKEN", "")

    # Project directories
    BASE_DIR: Path = project_root
    DATA_DIR: Path = project_root / "data"
    SAMPLE_EMAILS_PATH: Path = DATA_DIR / "sample_emails.json"


settings = Settings()
