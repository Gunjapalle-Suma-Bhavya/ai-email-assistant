import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, Mail, Calendar, Trash2 } from 'lucide-react';
import { emailService } from '../../services/emailService';
import { draftService } from '../../services/draftService';
import { useToast } from '../../context/ToastContext';
import AIInsightCard from '../../components/ai/AIInsightCard';
import DraftEditor from '../../components/ai/DraftEditor';
import ApprovalPanel from '../../components/ai/ApprovalPanel';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function EmailDetailsPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState(null);
  const [draft, setDraft] = useState({ subject: '', body: '', calendar_event: null });
  const [loading, setLoading] = useState(true);
  const [triageLoading, setTriageLoading] = useState(false);
  const [draftingLoading, setDraftingLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadEmailDetails() {
      try {
        setLoading(true);
        const data = await emailService.getEmail(threadId);
        setEmail(data);
        if (data?.draft_response) {
          setDraft({
            subject: data.draft_subject || `Re: ${data.subject}`,
            body: data.draft_response,
            calendar_event: data.calendar_event,
          });
        } else {
          setDraft({
            subject: `Re: ${data?.subject || ''}`,
            body: '',
            calendar_event: null,
          });
        }
      } catch (err) {
        showToast(err.message || 'Email not found', 'error');
        navigate('/inbox');
      } finally {
        setLoading(false);
      }
    }
    loadEmailDetails();
  }, [threadId, navigate, showToast]);

  const handleRunTriage = async () => {
    try {
      setTriageLoading(true);
      const res = await emailService.triageEmail(threadId);
      setEmail((prev) => ({
        ...prev,
        classification: res.classification,
        reasoning: res.reasoning,
        confidence_score: 0.95,
      }));
      showToast(`Email classified as: ${res.classification.toUpperCase()}`, 'success');
    } catch (err) {
      showToast(err.message || 'Triage failed', 'error');
    } finally {
      setTriageLoading(false);
    }
  };

  const handleGenerateDraft = async (customInstructions = null) => {
    try {
      setDraftingLoading(true);
      const res = await draftService.generateDraft(threadId, customInstructions);
      setDraft({
        subject: res.subject,
        body: res.body,
        calendar_event: res.calendar_event,
      });
      setEmail((prev) => ({
        ...prev,
        status: 'drafted',
        draft_response: res.body,
        draft_subject: res.subject,
        calendar_event: res.calendar_event,
      }));
      showToast('AI draft generated according to your style preferences!', 'success');
    } catch (err) {
      showToast(err.message || 'Draft generation failed', 'error');
    } finally {
      setDraftingLoading(false);
    }
  };

  const handleHitlAction = async (action, extraData = {}) => {
    try {
      setActionLoading(true);
      const payload = {
        email_id: threadId,
        action,
        edited_subject: draft.subject,
        edited_body: draft.body,
        calendar_event: draft.calendar_event,
        ...extraData,
      };

      const res = await draftService.executeAction(payload);
      showToast(res.message || 'Action executed successfully', 'success');

      if (action === 'accept' || action === 'edit') {
        setEmail((prev) => ({ ...prev, status: 'sent' }));
      } else if (action === 'ignore') {
        setEmail((prev) => ({ ...prev, status: 'ignored', classification: 'ignore' }));
      } else if (action === 'feedback') {
        // Regenerate draft with the feedback
        await handleGenerateDraft(extraData.user_feedback);
      }
    } catch (err) {
      showToast(err.message || 'Failed to execute action', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !email) {
    return (
      <div className="p-6 max-w-[680px] mx-auto space-y-4">
        <div className="h-6 bg-[#ECE7DE] rounded-[2px] w-1/4 animate-pulse" />
        <LoadingSkeleton type="email-detail" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 overflow-y-auto">
      <div className="space-y-6 max-w-[680px] mx-auto">
        {/* Back Button & Navigation Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DCD5C9]">
          <button
            onClick={() => navigate('/inbox')}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#1E3A5F] hover:underline transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Docket</span>
          </button>

          <div className="flex items-center gap-2">
            {email.classification && (
              <Badge variant={email.classification}>
                {email.classification}
              </Badge>
            )}
            <Badge variant={email.status}>{email.status}</Badge>
          </div>
        </div>

        {/* Main Letterhead Paper */}
        <div className="p-6 md:p-8 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-6">
          <div className="space-y-3 pb-5 border-b border-[#DCD5C9]">
            <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#6B665F]">
              Official Record
            </span>

            <h1 className="text-2xl font-serif-title font-semibold text-[#1E1E1C] leading-snug">
              {email.subject}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#6B665F] pt-2">
              <div>
                <span className="uppercase text-[#8C867C]">From: </span>
                <strong className="text-[#1E1E1C]">{email.author}</strong>
              </div>
              <div className="text-left sm:text-right">
                <span className="uppercase text-[#8C867C]">Received: </span>
                <span>{email.received_at ? new Date(email.received_at).toLocaleString() : ''}</span>
              </div>
              <div>
                <span className="uppercase text-[#8C867C]">To: </span>
                <span className="text-[#1E1E1C]">{email.to}</span>
              </div>
            </div>
          </div>

          {/* Email Thread Body: 16px, line-height 1.65 */}
          <div className="font-serif-body text-base text-[#1E1E1C] whitespace-pre-wrap leading-[1.68]">
            {email.email_thread}
          </div>
        </div>

        {/* AI Triage Analysis Card */}
        <AIInsightCard
          email={email}
          onRunTriage={handleRunTriage}
          triageLoading={triageLoading}
        />

        {/* Draft Editor Section */}
        <DraftEditor
          draft={draft}
          onDraftChange={setDraft}
          onGenerateDraft={() => handleGenerateDraft()}
          generating={draftingLoading}
        />

        {/* Human-in-the-Loop Decision Gate */}
        <ApprovalPanel
          hasDraft={!!draft.body}
          onAction={handleHitlAction}
          actionLoading={actionLoading}
        />
      </div>
    </div>
  );
}
