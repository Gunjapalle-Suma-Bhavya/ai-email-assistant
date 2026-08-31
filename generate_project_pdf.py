import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to add 'Page X of Y' and header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "AI Email Assistant — Architecture, Workflow & Interview Guide")
            self.drawRightString(612 - 54, 750, "LangGraph + FastAPI")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)

        # Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 45, 612 - 54, 45)
        self.drawString(54, 32, "GitHub: https://github.com/Gunjapalle-Suma-Bhavya/ai-email-assistant")
        self.drawRightString(612 - 54, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_pdf(filename="AI_Email_Assistant_Project_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#1e1b4b")
    brand_indigo = colors.HexColor("#4338ca")
    dark_slate = colors.HexColor("#0f172a")
    text_color = colors.HexColor("#334155")
    accent_bg = colors.HexColor("#f8fafc")
    card_border = colors.HexColor("#e2e8f0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=brand_indigo,
        spaceAfter=12,
    )

    h1_style = ParagraphStyle(
        'Heading1Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=brand_indigo,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=text_color,
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4,
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderColor=card_border,
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=8,
        spaceBefore=4,
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=body_style,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # ==================== COVER / HEADER ====================
    story.append(Paragraph("AI Email Assistant", title_style))
    story.append(Paragraph("Production-Grade Autonomous Agent with LangGraph, FastAPI & Human-in-the-Loop Memory", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=brand_indigo, spaceBefore=0, spaceAfter=10))

    meta_table_data = [
        [
            Paragraph("<b>Author:</b> Gunjapalle Suma Bhavya", body_style),
            Paragraph("<b>Stack:</b> LangGraph, LangChain, FastAPI, Tailwind CSS", body_style)
        ],
        [
            Paragraph("<b>GitHub:</b> <a href='https://github.com/Gunjapalle-Suma-Bhavya'>github.com/Gunjapalle-Suma-Bhavya</a>", body_style),
            Paragraph("<b>Architecture:</b> Agentic Workflow with Structured Memory", body_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # ==================== SECTION 1: EXECUTIVE SUMMARY ====================
    story.append(Paragraph("1. Executive Summary & Problem Statement", h1_style))
    story.append(Paragraph(
        "Modern professionals spend over 28% of their workday managing overflowing inboxes. "
        "Traditional rule-based filters and simple generative AI prompts fail because they lack structured routing, "
        "cannot coordinate calendar scheduling deterministically, lack human oversight for sensitive communications, "
        "and do not learn from human corrections.",
        body_style
    ))
    story.append(Paragraph(
        "The <b>AI Email Assistant</b> solves this by implementing a full-stack agentic architecture that: "
        "(1) autonomously triages incoming emails with transparent reasoning, (2) drafts context-aware responses and checks calendar slots, "
        "(3) provides an interactive Human-in-the-Loop (HITL) review dashboard, and (4) uses adaptive memory to continuously align with user preferences.",
        body_style
    ))

    # ==================== SECTION 2: END-TO-END WORKFLOW ====================
    story.append(Paragraph("2. System Architecture & End-to-End Workflow", h1_style))
    story.append(Paragraph(
        "The application is structured into 5 cohesive phases:",
        body_style
    ))

    flow_data = [
        [
            Paragraph("<b>Phase</b>", body_style),
            Paragraph("<b>Component & Mechanism</b>", body_style),
            Paragraph("<b>Outcome / Decision</b>", body_style)
        ],
        [
            Paragraph("<b>1. Ingestion</b>", body_style),
            Paragraph("FastAPI <code>/api/emails</code> receives incoming emails or loads benchmark dataset.", body_style),
            Paragraph("Stored in state store as unread item.", body_style)
        ],
        [
            Paragraph("<b>2. AI Triage</b>", body_style),
            Paragraph("LangGraph Triage Router invokes LLM with <code>RouterSchema</code> (reasoning + classification).", body_style),
            Paragraph("Categorized into <b>RESPOND</b>, <b>NOTIFY</b>, or <b>IGNORE</b> with reasoning.", body_style)
        ],
        [
            Paragraph("<b>3. AI Drafting & Tools</b>", body_style),
            Paragraph("Response Agent evaluates background, tone rules, and calls <code>write_email</code> & <code>schedule_meeting</code>.", body_style),
            Paragraph("Generates structured draft and calendar meeting proposal.", body_style)
        ],
        [
            Paragraph("<b>4. HITL Review</b>", body_style),
            Paragraph("Web UI presents draft to user for Approve, Edit, Ignore, or Feedback.", body_style),
            Paragraph("Nothing is sent without explicit user review.", body_style)
        ],
        [
            Paragraph("<b>5. Memory Learning</b>", body_style),
            Paragraph("LLM extracts user habits/edits via <code>UserPreferences</code> schema and updates memory store.", body_style),
            Paragraph("Dynamic reinforcement of triage and response rules.", body_style)
        ]
    ]

    flow_table = Table(flow_data, colWidths=[110, 240, 154])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e0e7ff")),
        ('TEXTCOLOR', (0,0), (-1,0), primary_color),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 0.5, card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, card_border),
    ]))
    story.append(flow_table)
    story.append(Spacer(1, 12))

    # ==================== SECTION 3: FEATURES & CAPABILITIES ====================
    story.append(Paragraph("3. What You Can Do in the Application", h1_style))
    story.append(Paragraph("The web application provides a comprehensive suite of capabilities for testing and daily operation:", body_style))

    story.append(Paragraph("• <b>Folder & Status Filtering:</b> Filter emails instantly across All, Unread, Needs Reply, Notifications, HITL Review, Sent, and Ignored.", bullet_style))
    story.append(Paragraph("• <b>Batch & Single Triage:</b> Run instant zero-shot structured classification with a single click or batch-triage the entire inbox.", bullet_style))
    story.append(Paragraph("• <b>Transparent Reasoning Inspection:</b> Read the AI's step-by-step reasoning behind why an email was classified as notify vs respond vs ignore.", bullet_style))
    story.append(Paragraph("• <b>Interactive Draft Editor:</b> Directly edit the AI's drafted subject line, recipient, and message body inside the dashboard.", bullet_style))
    story.append(Paragraph("• <b>Automated Meeting Scheduling:</b> Preview proposed attendees, duration, and time slots; confirmed meetings appear in the Calendar drawer.", bullet_style))
    story.append(Paragraph("• <b>Custom Guidance & Regeneration:</b> Provide prompt feedback (e.g. <i>'Make it more concise and mention next Tuesday'</i>) to trigger instant revision.", bullet_style))
    story.append(Paragraph("• <b>Memory & Preference Rules Editor:</b> Inspect and edit the active background context, triage policy rules, response preferences, and calendar constraints in real time.", bullet_style))
    story.append(Paragraph("• <b>Test Email Composer:</b> Inject arbitrary test emails or reset to the 16 benchmark scenarios with one click.", bullet_style))
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # ==================== SECTION 4: HOW IT WORKS WITH API KEYS ====================
    story.append(Paragraph("4. How It Works When Configured with Real API Keys", h1_style))
    story.append(Paragraph(
        "When real API keys are set in your <code>.env</code> file, the application activates its full LLM agentic pipeline:",
        body_style
    ))

    env_box = [
        [Paragraph("<b>Configuration in .env:</b><br/>"
                   "<code>OPENAI_API_KEY=sk-...</code> (or compatible endpoint)<br/>"
                   "<code>OPENAI_BASE_URL=https://api.openai.com/v1</code><br/>"
                   "<code>OPENAI_MODEL=gpt-4o-mini</code> (or gpt-4o / gpt-4.1)<br/>"
                   "<code>LANGSMITH_API_KEY=lsv2_...</code> (optional for tracing)", code_style)]
    ]
    env_table = Table(env_box, colWidths=[504])
    env_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, card_border),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(env_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Live Execution Flow with API Keys:</b>", h2_style))
    story.append(Paragraph("1. <b>Structured Triage:</b> Calls OpenAI via <code>with_structured_output(RouterSchema)</code>. The model enforces JSON schema conformity, preventing hallucinated classifications and guaranteeing a clean reasoning string.", bullet_style))
    story.append(Paragraph("2. <b>Tool Calling:</b> The LLM binds tools via <code>bind_tools([write_email, schedule_meeting, check_calendar_availability])</code>. The model intelligently emits function arguments (e.g. meeting time, duration, recipients) without manual parsing.", bullet_style))
    story.append(Paragraph("3. <b>Adaptive Learning:</b> When a user edits a draft or gives feedback, a specialized memory prompt invokes the LLM with <code>UserPreferences</code> schema to extract generalized preference rules and persist them into the memory store.", bullet_style))
    story.append(Paragraph("4. <b>LangSmith Tracing:</b> Every tool call, latency metric, token count, and reasoning trajectory is automatically traced and logged in LangSmith for enterprise observability.", bullet_style))
    story.append(Paragraph("5. <b>Offline / Fallback Resilience:</b> If an API key is omitted or rate-limited, the system seamlessly uses an intelligent heuristic fallback engine so the application remains 100% testable and operable.", bullet_style))
    story.append(Spacer(1, 10))

    # ==================== SECTION 5: INTERVIEWER GUIDE ====================
    story.append(Paragraph("5. How to Explain This Project to an Interviewer", h1_style))
    story.append(Paragraph(
        "Use this structured talking guide during technical interviews, portfolio walkthroughs, and system design discussions.",
        body_style
    ))

    story.append(Paragraph("A. 30-Second Elevator Pitch", h2_style))
    pitch_text = [
        [Paragraph(
            "<i>'I designed and built an autonomous AI Email Assistant using LangGraph, FastAPI, and modern web technologies. "
            "It solves email overload by routing incoming threads into respond, notify, or ignore with structured reasoning, "
            "drafting context-aware replies, coordinating calendar invitations, and placing the human in the loop for review. "
            "Crucially, it features an adaptive memory profile that learns user preferences over time from edits and feedback, "
            "all with zero-leak credential isolation ready for production.'</i>",
            callout_style
        )]
    ]
    pitch_table = Table(pitch_text, colWidths=[504])
    pitch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eef2ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#818cf8")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(pitch_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("B. Key Technical Questions & Model Answers", h2_style))

    story.append(Paragraph("<b>Q1: Why use LangGraph instead of traditional sequential chains?</b>", body_style))
    story.append(Paragraph(
        "<b>Answer:</b> <i>'Traditional LLM chains are linear and inflexible for real-world agentic workflows. "
        "Email management requires cyclical loops (e.g. checking calendar -> finding conflicts -> adjusting proposal), "
        "state persistence, conditional branching (triage routing), and interruptible execution for Human-in-the-Loop approval. "
        "LangGraph provides first-class state graph management, checkpointing, and tool binding.'</i>",
        body_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>Q2: How does Human-in-the-Loop (HITL) prevent hallucinations and errors?</b>", body_style))
    story.append(Paragraph(
        "<b>Answer:</b> <i>'In sensitive domains like email communications, full autonomy is risky. "
        "Our system treats the LLM output as a proposed state mutation rather than an irreversible action. "
        "The agent generates drafts and calendar events into an intermediate state, yielding control to the UI. "
        "Only when the user explicitly clicks 'Approve' or provides edits is the action dispatched and logged.'</i>",
        body_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>Q3: How does the dynamic memory learning system work?</b>", body_style))
    story.append(Paragraph(
        "<b>Answer:</b> <i>'Rather than just storing raw chat history in context, the system implements structured preference learning. "
        "When a user modifies a draft (e.g. shortening text or adjusting tone) or overrides triage (ignoring a notification), "
        "a meta-prompt analyzes the difference, extracts the implicit rule using a Pydantic schema, and selectively updates "
        "the triage or response rules in memory. Future prompts inject these refined preferences dynamically.'</i>",
        body_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>Q4: How did you design for security and enterprise deployment?</b>", body_style))
    story.append(Paragraph(
        "<b>Answer:</b> <i>'Security was a core design priority. All API keys and OAuth tokens are strictly decoupled into environment variables "
        "with automated schema validation. Strict .gitignore rules prevent token leakage. The FastAPI backend exposes RESTful endpoints with CORS "
        "and Pydantic payload sanitization, making it ready to deploy as a containerized microservice.'</i>",
        body_style
    ))
    story.append(Spacer(1, 8))

    # ==================== SUMMARY BOX ====================
    summary_box = [
        [Paragraph(
            "<b>Summary of Key Skills Demonstrated:</b><br/>"
            "• <b>Agentic AI & LLMOps:</b> LangGraph, Structured Output Schemas, Tool Calling, LangSmith Tracing.<br/>"
            "• <b>Full-Stack Engineering:</b> FastAPI REST API, Pydantic v2, Responsive Tailwind UI, Async State Management.<br/>"
            "• <b>System Design:</b> Human-in-the-Loop pattern, Dynamic Memory Profiles, Clean Separation of Concerns.<br/>"
            "• <b>Security:</b> Strict credential isolation, zero-hardcoded secrets, production-ready Git sanitization.",
            body_style
        )]
    ]
    summary_table = Table(summary_box, colWidths=[504])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94a3b8")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(summary_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully at {filename}")

if __name__ == "__main__":
    output_path = sys.argv[1] if len(sys.argv) > 1 else "AI_Email_Assistant_Project_Guide.pdf"
    build_pdf(output_path)
