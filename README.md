# AI Email Assistant 📬🤖

An autonomous, full-stack AI Email Assistant built with **LangGraph**, **FastAPI**, and a **Modern Web UI**. It triages incoming emails, drafts context-aware replies, coordinates calendar scheduling, and incorporates human-in-the-loop (HITL) feedback to continually learn and update user preferences.

---

## 🌟 Key Features

- **⚡ Autonomous Email Triage**: Classifies incoming emails into `RESPOND`, `NOTIFY`, or `IGNORE` with transparent chain-of-thought reasoning.
- **✍️ Context-Aware Response Generation**: Automatically drafts replies tailored to user communication style and context.
- **📅 Calendar Meeting Coordination**: Detects scheduling intents, checks availability, and creates calendar events.
- **🛡️ Human-in-the-Loop (HITL) Control**: Allows users to approve, edit, regenerate, or reject drafts before anything is sent.
- **🧠 Continuous Memory & Preference Learning**: Dynamically adapts triage rules and writing styles based on user edits and feedback.
- **💻 Modern Full-Stack Web Dashboard**: A single-page dashboard with real-time folders, email thread viewer, draft editor, and preference manager.
- **🔒 Zero Credential Exposure**: Secure environment configuration with `.env` loading and zero hardcoded secrets.

---

## 🏗️ Architecture

```
ai-email-assistant/
├── .env.example                # Safe environment template (no secrets)
├── .gitignore                  # Prevents secrets/tokens from being committed
├── README.md                   # Project documentation
├── pyproject.toml              # Project metadata & dependencies
├── requirements.txt            # Python dependencies
├── run.py                      # One-click application launcher
├── backend/
│   └── app/
│       ├── config.py           # Safe environment settings
│       ├── schemas.py          # Pydantic data schemas
│       ├── main.py             # FastAPI entry point & static file server
│       ├── agent/
│       │   ├── graph.py        # LangGraph workflow engine
│       │   ├── prompts.py      # Clean structured prompts
│       │   ├── tools.py        # Email and calendar tool definitions
│       │   └── memory.py       # Preference store and adaptive learning
│       ├── services/
│       │   ├── email_service.py # Email inbox and sample management
│       │   └── calendar_service.py # Calendar event management
│       └── api/
│           ├── emails.py       # Email CRUD & stats endpoints
│           ├── triage.py       # AI Triage classification endpoints
│           ├── hitl.py         # Human-in-the-loop draft & action endpoints
│           ├── memory.py       # Preferences & memory endpoints
│           └── calendar.py     # Calendar event endpoints
├── frontend/
│   ├── index.html              # Modern dashboard interface
│   ├── css/styles.css          # Custom styling & glassmorphism
│   └── js/app.js               # Reactive frontend client
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
