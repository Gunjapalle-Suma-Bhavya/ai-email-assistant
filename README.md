# AetherMail — Autonomous AI Email Assistant 📬🤖

AetherMail is an autonomous, production-grade AI Email Assistant SaaS built with **LangGraph**, **FastAPI**, **React 19**, and **MongoDB**. It triages incoming emails, drafts context-aware replies, coordinates calendar scheduling, and incorporates human-in-the-loop (HITL) safety controls to continually learn user preferences.

---

## 🌟 Key Features

- **⚡ Autonomous Email Triage**: Classifies incoming emails into `RESPOND`, `NOTIFY`, or `IGNORE` with transparent reasoning.
- **✍️ Context-Aware Response Generation**: Automatically drafts replies tailored to user communication style and context with tool calling.
- **📅 Calendar Meeting Coordination**: Detects scheduling intents, checks availability, and creates calendar events.
- **🛡️ Human-in-the-Loop (HITL) Safety Gate**: Complete user control to approve, edit, regenerate, or reject drafts before anything is sent.
- **👥 Multi-Account Switcher**: Seamlessly switch between personal Gmail and corporate Google Workspace accounts, or view unified inboxes.
- **🔔 Real-Time Google Pub/Sub Webhooks**: Instant message ingestion the moment an email arrives via Google Cloud Pub/Sub push notifications.
- **🧠 Continuous Memory & Preference Learning**: Dynamically adapts triage rules and writing styles based on user edits and feedback.
- **💻 Modern React SaaS Dashboard**: Built with React 19, Vite, Tailwind CSS, Lucide Icons, and React Router v7 with collapsible slidebars for optimal viewing.
- **🍃 Resilient Persistence**: MongoDB async driver (`motor`) with an automated in-memory fallback store for maximum uptime.
- **🔐 Enterprise Authentication**: Bcrypt password hashing, JWT token security, and Google OAuth 2.0 integration.

---

## 🏗️ System Architecture

For a detailed technical breakdown, sequence diagrams, and schema specifications, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

```
ai-email-assistant/
├── ARCHITECTURE.md             # System architecture & data flow documentation
├── backend/app/
│   ├── main.py                 # FastAPI application & route aggregation
│   ├── config.py               # Environment configuration
│   ├── agent/                  # LangGraph agent workflows & triage engines
│   ├── api/                    # REST API endpoints (emails, auth, hitl, drafts, calendar, webhooks)
│   ├── auth/                   # Security, bcrypt, and JWT dependencies
│   ├── database/               # MongoDB client & resilient fallback store
│   └── services/               # Gmail API client, Pub/Sub, and calendar services
├── frontend/
│   ├── src/                    # React 19 single-page application
│   │   ├── components/         # Reusable UI component library
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── pages/              # Dashboard, Inbox, Drafts, Calendar, Preferences, Login
│   │   └── services/           # Backend API clients
│   └── dist/                   # Production-compiled assets served directly by FastAPI
├── tests/                      # Automated pytest test suite
└── run.py                      # Production application launcher
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ (for frontend development)
- MongoDB (optional; defaults to resilient local store if not configured)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/Gunjapalle-Suma-Bhavya/ai-email-assistant.git
cd ai-email-assistant

# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Key environment variables:
```env
# Server
PORT=8000
ENVIRONMENT=development

# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ai_email_assistant

# AI / LLM Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Google OAuth & Cloud Pub/Sub (Optional for live sync)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

### 4. Run the Application

```bash
python run.py
```

- **Web Dashboard**: [http://localhost:8000](http://localhost:8000)
- **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user & issue JWT token |
| `GET` | `/api/auth/google/url` | Retrieve Google OAuth 2.0 authorization URL |
| `GET` | `/api/emails` | Fetch emails with folder, status, and account filtering |
| `GET` | `/api/emails/stats/summary` | Live dynamic counts of unread, actionable, and sent emails |
| `POST` | `/api/triage/all` | Run autonomous AI triage on all unread emails |
| `POST` | `/api/hitl/draft` | Generate AI context-aware reply draft |
| `POST` | `/api/hitl/action` | Execute user decision (Accept, Edit, Reject, Send) |
| `POST` | `/api/webhooks/gmail/pubsub` | Real-time Google Cloud Pub/Sub push notification listener |
| `GET` | `/api/calendar/events` | List upcoming calendar events and meeting slots |

---

## 🧪 Testing

Run the automated test suite:

```bash
pytest tests/
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
