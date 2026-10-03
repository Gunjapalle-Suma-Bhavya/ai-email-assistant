# AetherMail System Architecture

This document provides a comprehensive technical overview of the **AetherMail** architecture, including data flow pipelines, AI reasoning graphs, asynchronous sync mechanisms, security layers, and component interactions.

---

## 1. High-Level Architecture Overview

AetherMail is designed around an event-driven, micro-layered SaaS architecture:

```mermaid
graph TB
    subgraph Client ["Client Layer (React 19 SPA)"]
        UI[Executive Web Dashboard]
        MAS[Multi-Account Switcher]
        Inbox[Inbox & Slidebars]
        Drafts[HITL Draft Editor]
        Cal[Interactive Calendar]
    end

    subgraph API ["Gateway & API Layer (FastAPI)"]
        Router[API Gateway / Router]
        AuthGuard[JWT & OAuth Security Guard]
        EmailAPI[Email Service API]
        DraftAPI[Draft & HITL API]
        PubSubWebhook[Google Pub/Sub Webhook]
        MemoryAPI[Memory & Preferences API]
        CalAPI[Calendar API]
    end

    subgraph Agentic ["AI & Agentic Core (LangGraph)"]
        TriageEngine[Triage Agent]
        DraftAgent[Response Generator]
        CalendarAgent[Scheduling Intent Analyzer]
        MemoryStore[Dynamic Memory & Style Store]
    end

    subgraph Integrations ["External Integrations"]
        Gmail[Gmail REST API v1]
        GooglePubSub[Google Cloud Pub/Sub]
        GoogleCalendar[Google Calendar API v3]
        LLM[OpenAI / Compatible LLM]
    end

    subgraph Persistence ["Persistence Layer"]
        MongoDB[(MongoDB Async / Resilient Store)]
    end

    UI --> Router
    MAS --> Router
    Inbox --> Router
    Drafts --> Router
    Cal --> Router

    Router --> AuthGuard
    AuthGuard --> EmailAPI
    AuthGuard --> DraftAPI
    AuthGuard --> PubSubWebhook
    AuthGuard --> MemoryAPI
    AuthGuard --> CalAPI

    EmailAPI --> TriageEngine
    DraftAPI --> DraftAgent
    DraftAPI --> CalendarAgent
    MemoryAPI --> MemoryStore

    TriageEngine --> LLM
    DraftAgent --> LLM
    CalendarAgent --> LLM

    EmailAPI --> Gmail
    DraftAPI --> Gmail
    CalAPI --> GoogleCalendar
    GooglePubSub --> PubSubWebhook

    EmailAPI --> MongoDB
    DraftAPI --> MongoDB
    MemoryAPI --> MongoDB
    CalAPI --> MongoDB
```

---

## 2. Core Subsystems

### A. Frontend Layer (React 19 + Vite + Tailwind CSS)
- **Single Page Application (SPA)**: Powered by React 19, React Router v7, and Tailwind CSS.
- **Multi-Account Switcher**: Provides account isolation and unified inbox views across personal Gmail and corporate Workspace accounts.
- **Ergonomic Slidebar Navigation**: Collapsible email list and conversation inspection panels with zero horizontal text clipping.
- **Dynamic Live Polling & Cache**: Interacts with the backend via a centralized `apiClient` service with JWT bearer injection and reactive state hooks.

### B. Backend API & Ingestion Layer (FastAPI)
- **FastAPI Core**: Asynchronous ASGI framework handling concurrent HTTP requests and webhook payloads.
- **JWT & OAuth 2.0 Security**: Bcrypt-hashed password storage, JWT token issuance, and state-validated Google OAuth 2.0 token exchange with automatic offline refresh token handling.
- **Resilient Database Layer**: MongoDB async client (`motor`) coupled with a fail-safe in-memory cache to guarantee operational continuity even if database connectivity fluctuates.

### C. Agentic Core (LangGraph & Heuristic Reasoning)
The AI pipeline coordinates multi-step reasoning before producing any output:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Gmail PubSub
    participant Backend as FastAPI Ingestion
    participant Triage as LangGraph Triage Agent
    participant Draft as LangGraph Draft Agent
    participant DB as MongoDB
    actor HITL as User (HITL Safety Gate)
    participant Gmail as Live Gmail API

    User->>Backend: New Email Received / Synced
    Backend->>DB: Store Raw Email (Status: unread)
    Backend->>Triage: Dispatch Email for Triage
    Triage->>Triage: Analyze Urgency & Category (RESPOND / NOTIFY / IGNORE)
    Triage->>DB: Update Category & Priority Reason

    alt Classified as RESPOND
        Backend->>Draft: Trigger Context-Aware Draft Generation
        Draft->>Draft: Read User Memory & Style Rules
        Draft->>Draft: Check Calendar Scheduling Conflicts
        Draft->>DB: Store Draft (Status: drafted)
        DB-->>HITL: Display in Actionable Docket
        HITL->>Backend: Review, Edit, or Approve Draft
        Backend->>Gmail: Dispatch Approved Email (Status: sent)
    else Classified as NOTIFY / IGNORE
        Backend->>DB: Mark Processed (No Draft Needed)
    end
```

### D. Google Cloud Pub/Sub Webhook Architecture
Replaces expensive polling with immediate push notifications:

1. **Watch Subscription**: The backend registers a watch subscription with Gmail API (`/users/me/watch`).
2. **Push Delivery**: When a message lands in the inbox, Gmail notifies the Google Cloud Pub/Sub topic.
3. **Webhook Ingestion**: Pub/Sub pushes the notification payload to `POST /api/webhooks/gmail/pubsub`.
4. **Targeted Delta Sync**: The backend extracts `historyId`, fetches only the newly arrived message delta, processes it through triage, and updates the UI in near real-time.

---

## 3. Data Models & Schemas

### Email Document Schema
| Field | Type | Description |
|---|---|---|
| `id` | String | Unique identifier (UUID or Gmail Message ID) |
| `user_id` | String | Owner identifier for multi-tenant isolation |
| `sender` | String | Sender name and address |
| `recipient` | String | Recipient address |
| `subject` | String | Subject line |
| `body` | String | Email body text / sanitized HTML |
| `timestamp` | DateTime | Timestamp of receipt/dispatch |
| `status` | String | `unread` \| `read` \| `drafted` \| `sent` \| `archived` |
| `category` | String | `respond` \| `notify` \| `ignore` |
| `reasoning` | String | AI explanation for the classification |
| `draft` | Object | Generated reply, proposed time slots, and confidence |
| `account_id` | String | Associated Google account (for multi-account support) |

### Memory & Preference Schema
| Field | Type | Description |
|---|---|---|
| `user_id` | String | Unique user reference |
| `sender_rules` | Map<String, String> | Custom VIP/Ignore directives per email/domain |
| `category_preferences` | Map<String, String> | Triage preferences based on topics or urgency |
| `response_style` | String | Formality, conciseness, sign-off style, and tone rules |
| `calendar_constraints`| Object | Working hours, buffer intervals, and meeting limits |

---

## 4. Security & Safety Principles

1. **Human-in-the-Loop (HITL) Guarantee**: No AI agent has permission to autonomously dispatch outbound emails without human approval. Every draft requires deliberate review, edit, or approval.
2. **Zero Plaintext Secrets**: OAuth credentials, JWT secrets, and API tokens are loaded exclusively through environment variables.
3. **CORS & CSRF Defenses**: Strict CORS policy configured for authorized domains and origins.
4. **Token Isolation**: Refresh tokens and access credentials are kept strictly isolated per user and per connected Google account.
