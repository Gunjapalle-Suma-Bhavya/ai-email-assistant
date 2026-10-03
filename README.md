# AetherMail — Autonomous AI Email Assistant 📬🤖

An autonomous, production-grade AI Email Assistant SaaS built with **LangGraph**, **FastAPI**, **React 19**, and **MongoDB**. It triages incoming emails, drafts context-aware replies, coordinates calendar scheduling, and incorporates human-in-the-loop (HITL) feedback to continually learn and update user preferences.

---

## 🌟 Key Features

- **⚡ Autonomous Email Triage**: Classifies incoming emails into `RESPOND`, `NOTIFY`, or `IGNORE` with transparent chain-of-thought reasoning.
- **✍️ Context-Aware Response Generation**: Automatically drafts replies tailored to user communication style and context with tool calling.
- **📅 Calendar Meeting Coordination**: Detects scheduling intents, checks availability, and creates calendar events.
- **🛡️ Human-in-the-Loop (HITL) Safety Gate**: Allows users to approve, edit, regenerate with custom guidance, or reject drafts before anything is sent.
- **🧠 Continuous Memory & Preference Learning**: Dynamically adapts triage rules and writing styles based on user edits and feedback.
- **💻 Modern React SaaS Dashboard**: Built with React 19, Vite, Tailwind CSS, Lucide Icons, and React Router v7. Includes Home, Login, Signup, Dashboard, Inbox, Email Details, Drafts, Calendar, Preferences, and Profile pages.
- **🍃 MongoDB Persistence & Multi-Tenancy**: Data isolation across users with Motor async driver and resilient fallback.
- **🔐 JWT Authentication**: Secure bcrypt password hashing and token-based API authentication.
- **🔒 Zero Credential Exposure**: Secure `.env` configuration protected by `.gitignore`.

---

## 🏗️ Architecture

```
ai-email-assistant/
├── .env.example                # Safe environment template (no secrets)
├── .gitignore                  # Prevents secrets/tokens/builds from being committed
├── README.md                   # Project documentation
├── pyproject.toml              # Project metadata & dependencies
├── requirements.txt            # Python dependencies (FastAPI, Motor, JWT, LangGraph)
├── run.py                      # Application launcher
│
├── backend/app/
│   ├── config.py               # Environment & MongoDB settings
│   ├── main.py                 # FastAPI app, lifespan, CORS, and SPA static server
│   ├── schemas.py              # Pydantic data & authentication schemas
│   ├── database/
│   │   └── mongo.py            # Async Motor client with resilient fallback
│   ├── auth/
│   │   ├── security.py         # Bcrypt password hashing & JWT tokens
│   │   └── dependencies.py     # Auth user dependency injection
│   ├── models/
│   │   └── db_models.py        # MongoDB document models
│   ├── agent/
│   │   ├── graph.py            # LangGraph workflow engine
│   │   ├── prompts.py          # Structured prompt templates
│   │   ├── tools.py            # Email and calendar tool definitions
│   │   └── memory.py           # Preference store and adaptive learning
│   ├── services/
│   │   ├── email_service.py    # Email inbox service
│   │   └── calendar_service.py # Calendar event management
│   └── api/
│       ├── auth.py             # Signup, Login, Me endpoints
│       ├── emails.py           # Email CRUD & stats endpoints
│       ├── drafts.py           # Dedicated draft review & actions
│       ├── triage.py           # AI Triage classification endpoints
│       ├── hitl.py             # Human-in-the-loop draft & action endpoints
│       ├── memory.py           # Preferences & memory endpoints
│       ├── calendar.py         # Calendar event endpoints
│       └── feedback.py         # Learning history & feedback endpoints
│
├── frontend/                   # Modern React SaaS Single-Page Application
│   ├── package.json            # React, Vite, Tailwind, Lucide dependencies
│   ├── vite.config.js          # Vite build & proxy configuration
│   ├── dist/                   # Production-compiled assets served by FastAPI
│   └── src/
│       ├── main.jsx            # React root bootstrap
│       ├── App.jsx             # Router & protected route guards
│       ├── context/            # AuthContext & ToastContext
│       ├── services/           # API services (auth, email, draft, calendar, prefs)
│       ├── components/         # Reusable UI library (Button, Modal, Badge, Cards)
│       └── pages/              # Home, Login, Signup, Dashboard, Inbox, Drafts, Calendar, Preferences, Profile
│
└── data/
    └── sample_emails.json      # Benchmark email scenarios for testing
```

---

## 🔒 Security & Safe GitHub Push

> [!IMPORTANT]
> **API Keys & Credentials are protected!**
> - All sensitive keys are loaded via environment variables (`.env`).
> - The repository includes `.env.example` with blank placeholders.
> - The `.gitignore` file strictly prevents `.env`, OAuth tokens (`token.json`), and private credentials (`secrets.json`) from being tracked in Git.

### Setting Up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your OpenAI or compatible API key into `.env`:
   ```env
   OPENAI_API_KEY=your_actual_api_key_here
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=gpt-4o-mini
   ```

*(Note: The application also includes intelligent heuristic fallback engines so the UI and workflows work even when running offline or without an active API key).*

---

## 🚀 Quick Start

### 1. Clone & Navigate
```bash
git clone https://github.com/Gunjapalle-Suma-Bhavya/ai-email-assistant.git
cd ai-email-assistant
```

### 2. Set Up Virtual Environment & Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Launch Application
```bash
python run.py
```

### 4. Open in Browser
- **Web Dashboard**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/emails` | List emails with folder & search filters |
| `POST` | `/api/emails` | Compose & inject a new incoming email |
| `GET` | `/api/emails/stats/summary` | Get inbox category counts & metrics |
| `POST` | `/api/triage` | Triage an email with reasoning |
| `POST` | `/api/triage/all` | Batch triage all unread emails |
| `POST` | `/api/hitl/draft` | Generate an AI reply draft & calendar slot |
| `POST` | `/api/hitl/action` | Execute HITL decision (Accept / Edit / Ignore / Feedback) |
| `GET` | `/api/memory` | Retrieve active user preference rules |
| `POST` | `/api/memory` | Update background, triage, and response rules |
| `GET` | `/api/calendar/events` | List scheduled meetings |

---

## 🧪 Testing & Verification

Run tests with pytest:
```bash
pytest
```

---

## 👤 Author & GitHub
- **GitHub**: [@Gunjapalle-Suma-Bhavya](https://github.com/Gunjapalle-Suma-Bhavya)
