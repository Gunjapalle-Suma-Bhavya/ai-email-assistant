import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Brain,
  Calendar,
  Zap,
  ArrowRight,
  Inbox,
  CheckCircle2,
  Lock,
  Layers,
  Bot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1E1E1C] flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 px-6 md:px-12 border-b border-[#DCD5C9] bg-[#F4F1EA]/90 backdrop-blur-sm flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[2px] bg-[#1E3A5F] flex items-center justify-center text-[#FCFAF7]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif-title font-semibold text-lg text-[#1E1E1C] flex items-center gap-2">
              AetherMail
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-[#FDF8EC] text-[#4A3E18] border border-[#E0CE9A]">
                Stationery
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="primary" size="sm" icon={ArrowRight}>
                Open Workspace
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Enter Workspace
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-14 md:pt-24 md:pb-20 max-w-4xl mx-auto text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] bg-[#FCFAF7] border border-[#DCD5C9] text-[#6B665F] text-[11px] font-mono uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#1E3A5F]" />
          <span>Executive Correspondence & Autonomous AI Assistant</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif-title font-semibold tracking-tight text-[#1E1E1C] leading-[1.15]">
          A refined desk for your highest-priority correspondence.
        </h1>

        <p className="text-base sm:text-lg font-serif-body text-[#6B665F] max-w-2xl mx-auto leading-relaxed">
          Intelligently triage high-volume correspondence, formulate context-aware replies on an executive desk pad, coordinate calendar engagements, and adapt continually with rigorous human sign-off.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <Link to={isAuthenticated ? '/dashboard' : '/signup'}>
            <Button variant="primary" size="lg" icon={ArrowRight}>
              {isAuthenticated ? 'Open Workspace' : 'Initialize Workspace'}
            </Button>
          </Link>
          <Link to="/inbox">
            <Button variant="secondary" size="lg" icon={Inbox}>
              Examine Docket
            </Button>
          </Link>
        </div>
      </section>

      {/* Workflow Visualizer */}
      <section className="px-6 py-12 max-w-6xl mx-auto w-full border-t border-[#DCD5C9]">
        <div className="text-center space-y-1 mb-10">
          <span className="text-[10px] font-mono font-medium uppercase tracking-[0.1em] text-[#6B665F]">
            Autonomous Pipeline
          </span>
          <h2 className="text-2xl font-serif-title font-semibold text-[#1E1E1C]">
            How Every Message is Handled
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              step: '01',
              title: 'Dispatch Ingest',
              desc: 'Incoming correspondence securely recorded in MongoDB.',
              icon: Inbox,
              badge: 'Ingest',
            },
            {
              step: '02',
              title: 'Intent Triage',
              desc: 'AI routes into Respond, Notify, or Ignore with rationale.',
              icon: Zap,
              badge: 'Triage',
            },
            {
              step: '03',
              title: 'Schedule Scan',
              desc: 'Identifies calendar proposals and checks availability.',
              icon: Calendar,
              badge: 'Calendar',
            },
            {
              step: '04',
              title: 'Desk Pad Draft',
              desc: 'Formulates typed draft adhering to your saved persona tone.',
              icon: Brain,
              badge: 'Synthesis',
            },
            {
              step: '05',
              title: 'Human Sign-Off',
              desc: 'Strict safety gate: accept, revise, or refine with guidance.',
              icon: ShieldCheck,
              badge: 'Gate',
            },
            {
              step: '06',
              title: 'Stylistic Memory',
              desc: 'Learns preferences from human edits over time.',
              icon: Sparkles,
              badge: 'Adaptive',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-[#1E3A5F] font-semibold">
                      {item.step}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-[#ECE7DE] text-[#6B665F] border border-[#DCD5C9]">
                      {item.badge}
                    </span>
                  </div>
                  <Icon className="w-4 h-4 text-[#1E3A5F] mb-2" />
                  <h4 className="text-xs font-serif-title font-semibold text-[#1E1E1C]">{item.title}</h4>
                  <p className="text-[11px] font-serif-body text-[#6B665F] mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="px-6 py-12 border-t border-[#DCD5C9] bg-[#ECE7DE]/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-1 mb-10">
            <span className="text-[10px] font-mono font-medium uppercase tracking-[0.1em] text-[#6B665F]">
              Governance & Safety
            </span>
            <h2 className="text-2xl font-serif-title font-semibold text-[#1E1E1C]">
              Principled Architecture for High-Stakes Email
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-2.5">
              <div className="w-8 h-8 rounded-[2px] bg-[#FCF2F1] border border-[#E8C5C2] flex items-center justify-center text-[#6A2E2A]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-serif-title font-semibold text-[#1E1E1C]">Human-in-the-Loop Sign-Off</h3>
              <p className="text-xs font-serif-body text-[#6B665F] leading-relaxed">
                Zero emails leave your inbox without review. Every draft, invitation, or archive decision requires explicit authorization, with single-click edit and guided refinement.
              </p>
            </div>

            <div className="p-6 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-2.5">
              <div className="w-8 h-8 rounded-[2px] bg-[#FDF8EC] border border-[#E0CE9A] flex items-center justify-center text-[#4A3E18]">
                <Brain className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-serif-title font-semibold text-[#1E1E1C]">Adaptive Persona Learning</h3>
              <p className="text-xs font-serif-body text-[#6B665F] leading-relaxed">
                As you edit correspondence or offer stylistic remarks, the assistant extracts communication habits and updates its memory without modifying your explicit ground rules.
              </p>
            </div>

            <div className="p-6 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-2.5">
              <div className="w-8 h-8 rounded-[2px] bg-[#EBF2FA] border border-[#BACFE6] flex items-center justify-center text-[#1E3A5F]">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-serif-title font-semibold text-[#1E1E1C]">Archival-Grade Persistence</h3>
              <p className="text-xs font-serif-body text-[#6B665F] leading-relaxed">
                Protected by scoped MongoDB Atlas multi-tenancy and an automatic in-memory fallback engine so work is never lost during offline periods.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#DCD5C9] px-6 py-6 text-center text-xs font-serif-body text-[#6B665F]">
        <p>AetherMail — Executive Stationery AI Email Workspace &copy; 2026. Built with LangGraph, FastAPI, MongoDB & React.</p>
      </footer>
    </div>
  );
}
