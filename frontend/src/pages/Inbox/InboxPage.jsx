import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search,
  Inbox,
  Mail,
  Zap,
  Trash2,
  Send,
  FileEdit,
  Clock,
  User,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  FolderOpen,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Layers,
} from 'lucide-react';
import { emailService } from '../../services/emailService';
import { draftService } from '../../services/draftService';
import { accountService } from '../../services/accountService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import EmailCard from '../../components/email/EmailCard';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import AIInsightCard from '../../components/ai/AIInsightCard';
import DraftEditor from '../../components/ai/DraftEditor';
import ApprovalPanel from '../../components/ai/ApprovalPanel';

export default function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderParam = searchParams.get('folder') || '';
  const selectedParam = searchParams.get('id');

  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const refreshKey = outletContext?.refreshKey || 0;

  const [emails, setEmails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Handle incoming account_connected query param from Google OAuth attachment
  useEffect(() => {
    const acc = searchParams.get('account_connected');
    const accType = searchParams.get('type') || 'Google';
    if (acc) {
      showToast(
        `Linked ${accType === 'workspace' ? 'Corporate Workspace' : 'Personal Gmail'} account: ${acc}`,
        'success'
      );
      const next = new URLSearchParams(searchParams);
      next.delete('account_connected');
      next.delete('type');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams]);

  // Selected email state in reading pane
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [draft, setDraft] = useState({ subject: '', body: '', calendar_event: null });
  const [triageLoading, setTriageLoading] = useState(false);
  const [draftingLoading, setDraftingLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [isDocketCollapsed, setIsDocketCollapsed] = useState(false);

  const folders = [
    { id: '', label: 'All Correspondence', icon: Inbox },
    { id: 'unread', label: 'Unread Items', icon: Mail },
    { id: 'respond', label: 'Action Required', icon: Mail },
    { id: 'notify', label: 'Notifications', icon: Zap },
    { id: 'drafted', label: 'Drafts Ready', icon: FileEdit },
    { id: 'sent', label: 'Dispatched', icon: Send },
    { id: 'ignore', label: 'Archived / Ignored', icon: Trash2 },
  ];

  // Fetch email list
  useEffect(() => {
    let active = true;
    async function loadEmails() {
      try {
        setLoading(true);
        const data = await emailService.getEmails(folderParam, searchQuery);
        if (active) {
          setEmails(data || []);
          // Auto-select first email if none selected on desktop, or keep existing
          if (data && data.length > 0) {
            const match = selectedParam
              ? data.find((e) => e.id === selectedParam)
              : data[0];
            if (match && !selectedEmail) {
              setSelectedEmail(match);
              initDraft(match);
            }
          } else {
            setSelectedEmail(null);
          }
        }
      } catch (err) {
        console.error('Failed to load emails:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(loadEmails, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [folderParam, searchQuery, refreshKey]);

  const initDraft = (emailData) => {
    if (emailData?.draft_response) {
      setDraft({
        subject: emailData.draft_subject || `Re: ${emailData.subject}`,
        body: emailData.draft_response,
        calendar_event: emailData.calendar_event,
      });
    } else {
      setDraft({
        subject: `Re: ${emailData?.subject || ''}`,
        body: '',
        calendar_event: null,
      });
    }
  };

  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
    initDraft(email);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('id', email.id);
    setSearchParams(newParams);
  };

  const handleRunTriage = async () => {
    if (!selectedEmail) return;
    try {
      setTriageLoading(true);
      const res = await emailService.triageEmail(selectedEmail.id);
      const updated = {
        ...selectedEmail,
        classification: res.classification,
        reasoning: res.reasoning,
        confidence_score: 0.95,
      };
      setSelectedEmail(updated);
      setEmails((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast(`Triage completed: ${res.classification.toUpperCase()}`, 'success');
    } catch (err) {
      showToast(err.message || 'Triage failed', 'error');
    } finally {
      setTriageLoading(false);
    }
  };

  const handleSyncGmail = async () => {
    try {
      setSyncingGmail(true);
      const res = await emailService.syncGmail();
      showToast(res.message || 'Gmail messages synchronized.', 'success');
      // Reload current docket view
      const data = await emailService.getEmails(folderParam, searchQuery);
      setEmails(data || []);
    } catch (err) {
      if (err.message && err.message.includes('connect your Google account')) {
        showToast('Please sign in or link your Google account to sync Gmail.', 'error');
      } else {
        showToast(err.message || 'Failed to sync Gmail', 'error');
      }
    } finally {
      setSyncingGmail(false);
    }
  };

  const handleGenerateDraft = async (customInstructions = null) => {
    if (!selectedEmail) return;
    try {
      setDraftingLoading(true);
      const res = await draftService.generateDraft(selectedEmail.id, customInstructions);
      setDraft({
        subject: res.subject,
        body: res.body,
        calendar_event: res.calendar_event,
      });
      const updated = {
        ...selectedEmail,
        status: 'drafted',
        draft_response: res.body,
        draft_subject: res.subject,
        calendar_event: res.calendar_event,
      };
      setSelectedEmail(updated);
      setEmails((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast('AI draft prepared on executive desk pad.', 'success');
    } catch (err) {
      showToast(err.message || 'Draft generation failed', 'error');
    } finally {
      setDraftingLoading(false);
    }
  };

  const handleHitlAction = async (action, extraData = {}) => {
    if (!selectedEmail) return;
    try {
      setActionLoading(true);
      const payload = {
        email_id: selectedEmail.id,
        action,
        edited_subject: draft.subject,
        edited_body: draft.body,
        calendar_event: draft.calendar_event,
        ...extraData,
      };

      const res = await draftService.executeAction(payload);
      showToast(res.message || 'Action executed successfully', 'success');

      let updatedStatus = selectedEmail.status;
      if (action === 'accept' || action === 'edit') {
        updatedStatus = 'sent';
      } else if (action === 'ignore') {
        updatedStatus = 'ignore';
      }

      const updated = { ...selectedEmail, status: updatedStatus };
      setSelectedEmail(updated);
      setEmails((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));

      if (action === 'feedback') {
        await handleGenerateDraft(extraData.user_feedback);
      }
    } catch (err) {
      showToast(err.message || 'Failed to execute action', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[#F4F1EA]">
      {/* LIVE GOOGLE ACCOUNT SYNC BANNER */}
      {!user?.google_connected ? (
        <div className="bg-[#FCF8EC] border-b border-[#E0CE9A] px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#4A3E18]">
            <span className="w-2 h-2 rounded-full bg-[#8F5B1A] shrink-0" />
            <span>Viewing offline sample docket. Connect your live Google account to import and triage your real Gmail emails.</span>
          </div>
          <a
            href="/api/auth/google/login"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-[#1E3A5F] text-[#FCFAF7] rounded-[2px] uppercase text-[10px] tracking-wider hover:bg-[#162c46] transition font-medium shrink-0"
          >
            <span>Connect Live Gmail</span>
          </a>
        </div>
      ) : (
        <div className="bg-[#F5F8F6] border-b border-[#C2D9C8] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#255C3A]">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="w-2 h-2 rounded-full bg-[#255C3A] shrink-0" />
            <span className="truncate">Live Gmail Connected: <strong className="font-semibold">{user?.email}</strong></span>
          </div>
          <button
            type="button"
            onClick={handleSyncGmail}
            disabled={syncingGmail}
            className="underline hover:text-[#183d26] uppercase text-[10px] tracking-wider font-semibold cursor-pointer shrink-0 disabled:opacity-50"
          >
            {syncingGmail ? 'Syncing Real Messages...' : 'Fetch Latest Gmail Messages'}
          </button>
        </div>
      )}

      {/* 3-COLUMN DESKTOP LAYOUT WITH COLLAPSIBLE SLIDEBARS */}
      <div className="flex-1 flex min-h-0 divide-x divide-[#DCD5C9] overflow-hidden">
        
        {/* COLUMN 1: FOLDER NAVIGATION RAIL (COLLAPSIBLE) */}
        <aside className={`hidden md:flex flex-col shrink-0 bg-[#ECE7DE] transition-[width] duration-200 ease-in-out border-r border-[#DCD5C9] overflow-y-auto ${
          isRailCollapsed ? 'w-12 items-center' : 'w-52'
        }`}>
          <div className={`p-3 border-b border-[#DCD5C9] flex items-center w-full ${
            isRailCollapsed ? 'justify-center' : 'justify-between'
          }`}>
            {!isRailCollapsed && (
              <span className="text-[10px] font-mono font-medium uppercase tracking-[0.08em] text-[#6B665F] truncate">
                Docket Index
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsRailCollapsed(!isRailCollapsed)}
              className="p-1 rounded-[2px] text-[#6B665F] hover:text-[#1E1E1C] hover:bg-[#DCD5C9]/60 transition shrink-0"
              title={isRailCollapsed ? 'Expand Docket Index' : 'Collapse Docket Index'}
            >
              {isRailCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          </div>

          <nav className="p-2 space-y-0.5 w-full">
            {folders.map((f) => {
              const Icon = f.icon;
              const isActive = folderParam === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    if (f.id) next.set('folder', f.id);
                    else next.delete('folder');
                    setSearchParams(next);
                  }}
                  title={isRailCollapsed ? f.label : undefined}
                  className={`w-full flex items-center ${
                    isRailCollapsed ? 'justify-center px-1.5' : 'justify-between px-2.5'
                  } py-1.5 rounded-[2px] text-xs font-mono uppercase tracking-wider transition ${
                    isActive
                      ? 'bg-[#FCFAF7] text-[#1E1E1C] border border-[#DCD5C9] font-medium border-l-2 border-l-[#1E3A5F]'
                      : 'text-[#6B665F] hover:text-[#1E1E1C] hover:bg-[#F4F1EA] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {!isRailCollapsed && <span className="truncate">{f.label}</span>}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* COLUMN 2: THREAD DOCKET LIST (COLLAPSIBLE SIDEWAYS) */}
        {isDocketCollapsed ? (
          <aside className="hidden md:flex w-11 bg-[#ECE7DE]/50 shrink-0 flex-col items-center py-3 border-r border-[#DCD5C9] select-none transition-all duration-200">
            <button
              type="button"
              onClick={() => setIsDocketCollapsed(false)}
              className="p-1.5 rounded-[2px] text-[#1E3A5F] hover:bg-[#DCD5C9] transition mb-3"
              title="Expand Correspondence List"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div
              onClick={() => setIsDocketCollapsed(false)}
              className="flex-1 flex flex-col items-center cursor-pointer group py-2"
              title="Expand Correspondence List"
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B665F] group-hover:text-[#1E3A5F] [writing-mode:vertical-rl] rotate-180 mb-2 select-none">
                Docket List
              </span>
              <span className="text-[10px] font-mono px-1 py-0.5 rounded-[2px] bg-[#FCFAF7] border border-[#DCD5C9] text-[#1E1E1C] font-semibold tabular-nums">
                {emails.length}
              </span>
            </div>
          </aside>
        ) : (
          <section className={`w-full md:w-80 lg:w-96 flex flex-col shrink-0 bg-[#F4F1EA] border-r border-[#DCD5C9] transition-[width] duration-200 ${
            selectedEmail ? 'hidden lg:flex' : 'flex'
          }`}>
            {/* List Header & Search */}
            <div className="p-3 border-b border-[#DCD5C9] bg-[#ECE7DE]/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsDocketCollapsed(true)}
                    className="p-1 rounded-[2px] text-[#6B665F] hover:text-[#1E1E1C] hover:bg-[#DCD5C9]/60 transition"
                    title="Slide correspondence docket closed to expand reading desk"
                  >
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#6B665F]">
                    Correspondence List
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await accountService.simulatePush();
                        showToast(`Push delivered: "${res.email?.subject}"`, 'success');
                        const data = await emailService.getEmails(folderParam, searchQuery);
                        setEmails(data || []);
                      } catch (err) {
                        showToast(err.message || 'Push simulation failed', 'error');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#4A3E18] hover:underline"
                    title="Simulate instant push delivery via Google Pub/Sub webhook"
                  >
                    <Zap className="w-3 h-3 text-[#8F7D4E]" />
                    <span className="hidden sm:inline">Push Test</span>
                  </button>
                  <span className="text-[10px] font-mono text-[#8C867C]">|</span>
                  <button
                    type="button"
                    onClick={handleSyncGmail}
                    disabled={syncingGmail}
                    className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#1E3A5F] hover:underline disabled:opacity-50"
                    title="Synchronize live emails from connected Gmail"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingGmail ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{syncingGmail ? 'Syncing...' : 'Sync'}</span>
                  </button>
                  <span className="text-[10px] font-mono text-[#8C867C]">|</span>
                  <span className="text-[10px] font-mono text-[#6B665F] font-semibold tabular-nums">
                    {emails.length}
                  </span>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6B665F] absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter docket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FCFAF7] border border-[#DCD5C9] text-xs font-mono rounded-[2px] pl-8 pr-3 py-1.5 text-[#1E1E1C] placeholder-[#8C867C] focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>
            </div>

            {/* Thread List Scroll Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#DCD5C9]">
              {loading ? (
                <LoadingSkeleton type="email-list" count={7} />
              ) : emails.length > 0 ? (
                emails.map((email) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    isSelected={selectedEmail?.id === email.id}
                    onSelect={handleSelectEmail}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-xs font-serif-body text-[#6B665F]">
                  No correspondence items in this view.
                </div>
              )}
            </div>
          </section>
        )}

        {/* COLUMN 3: EXECUTIVE READING PANE & AI COMPOSE PAD */}
        <section className={`flex-1 flex flex-col min-w-0 bg-[#F4F1EA] overflow-y-auto ${
          !selectedEmail ? 'hidden lg:flex' : 'flex'
        }`}>
          {selectedEmail ? (
            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
              {/* Back button for mobile/tablet */}
              <div className="lg:hidden pb-3 mb-3 border-b border-[#DCD5C9]">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[#1E3A5F] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to docket</span>
                </button>
              </div>

              {/* Restore Docket quick action if collapsed */}
              {isDocketCollapsed && (
                <div className="max-w-[820px] mx-auto mb-4 flex items-center justify-between pb-2 border-b border-[#DCD5C9]">
                  <button
                    type="button"
                    onClick={() => setIsDocketCollapsed(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#1E3A5F] hover:underline font-medium"
                  >
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                    <span>Expand Docket List ({emails.length})</span>
                  </button>
                  <span className="text-[10px] font-mono text-[#6B665F] uppercase tracking-wider">
                    Full Executive Reading Desk
                  </span>
                </div>
              )}

              {/* Centered Letterhead Stationery Sheet (spacious max-w-[820px]) */}
              <article className="max-w-[820px] mx-auto space-y-6">
                
                {/* STATIONERY LETTERHEAD */}
                <div className="stationery-paper p-6 md:p-8 space-y-6 bg-[#FCFAF7] border border-[#DCD5C9] rounded-[2px] shadow-sm">
                  {/* Top Letterhead Bar */}
                  <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#DCD5C9]">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#6B665F]">
                          Official Dispatch
                        </span>
                        {selectedEmail.classification && (
                          <Badge variant={selectedEmail.classification}>
                            {selectedEmail.classification}
                          </Badge>
                        )}
                        <Badge variant={selectedEmail.status}>{selectedEmail.status}</Badge>
                      </div>

                      <h1 className="font-serif-title font-semibold text-xl md:text-2xl text-[#1E1E1C] leading-snug break-words">
                        {selectedEmail.subject || '(No Subject)'}
                      </h1>
                    </div>

                    <span className="text-[10px] font-mono text-[#6B665F] shrink-0 pt-1">
                      {selectedEmail.received_at
                        ? new Date(selectedEmail.received_at).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>

                  {/* Correspondence Metadata Block - Zero Overlap Guaranteed */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-[#6B665F] pb-4 border-b border-[#DCD5C9]">
                    <div className="min-w-0 flex items-start gap-1.5 overflow-hidden">
                      <span className="uppercase text-[#8C867C] shrink-0">From: </span>
                      <strong className="text-[#1E1E1C] break-all min-w-0" title={selectedEmail.author}>
                        {selectedEmail.author}
                      </strong>
                    </div>
                    <div className="min-w-0 flex items-start gap-1.5 overflow-hidden">
                      <span className="uppercase text-[#8C867C] shrink-0">To: </span>
                      <span className="text-[#1E1E1C] break-all min-w-0" title={selectedEmail.to}>
                        {selectedEmail.to}
                      </span>
                    </div>
                  </div>

                  {/* Clean Action Tray: unboxed action words separated by subtle bullet points */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-mono uppercase tracking-wider text-[#6B665F] pb-2 border-b border-[#DCD5C9]">
                    <button
                      type="button"
                      onClick={() => handleGenerateDraft()}
                      disabled={draftingLoading}
                      className="text-[#1E3A5F] hover:underline font-semibold whitespace-nowrap"
                    >
                      {draft?.body ? 'Regenerate Draft' : 'Draft Reply'}
                    </button>
                    <span className="text-[#DCD5C9] select-none">|</span>
                    <button
                      type="button"
                      onClick={handleRunTriage}
                      disabled={triageLoading}
                      className="text-[#1E1E1C] hover:underline whitespace-nowrap"
                    >
                      Analyze Thread
                    </button>
                    <span className="text-[#DCD5C9] select-none">|</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/inbox/${selectedEmail.id}`)}
                      className="text-[#6B665F] hover:text-[#1E1E1C] hover:underline whitespace-nowrap"
                    >
                      Full Page View
                    </button>
                  </div>

                  {/* Letter Body: Generous margin, book serif 16px, line-height 1.68 */}
                  <div className="font-serif-body text-base text-[#1E1E1C] leading-[1.68] whitespace-pre-wrap break-words pt-2">
                    {selectedEmail.email_thread}
                  </div>
                </div>

                {/* AI Triage Intelligence Brief */}
                <AIInsightCard
                  email={selectedEmail}
                  onRunTriage={handleRunTriage}
                  triageLoading={triageLoading}
                />

                {/* AI Draft Correspondence Desk Pad */}
                <DraftEditor
                  draft={draft}
                  onDraftChange={setDraft}
                  onGenerateDraft={() => handleGenerateDraft()}
                  generating={draftingLoading}
                />

                {/* Human-in-the-Loop Action Tray */}
                <ApprovalPanel
                  hasDraft={!!draft.body}
                  onAction={handleHitlAction}
                  actionLoading={actionLoading}
                />
              </article>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-14 h-14 rounded-[2px] bg-[#ECE7DE] border border-[#DCD5C9] flex items-center justify-center text-[#6B665F] mb-4">
                <FolderOpen className="w-7 h-7 stroke-[1.25]" />
              </div>
              <h3 className="font-serif-title text-lg font-medium text-[#1E1E1C]">
                Executive Reading Desk
              </h3>
              <p className="font-serif-body text-xs text-[#6B665F] max-w-sm mt-1 leading-relaxed">
                Select a correspondence from the docket on the left to inspect the letterhead and collaborate with the assistant.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
