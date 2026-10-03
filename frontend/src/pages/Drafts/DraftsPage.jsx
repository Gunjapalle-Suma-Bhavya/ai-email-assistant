import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { FileEdit, Check, ArrowRight, Clock, Calendar, Send } from 'lucide-react';
import { draftService } from '../../services/draftService';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function DraftsPage() {
  const context = useOutletContext();
  const refreshKey = context?.refreshKey || 0;
  const { showToast } = useToast();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    async function loadDrafts() {
      try {
        setLoading(true);
        const data = await draftService.getDrafts();
        setDrafts(data || []);
      } catch (err) {
        console.error('Failed to load drafts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDrafts();
  }, [refreshKey]);

  const handleApproveDraft = async (draft) => {
    try {
      setApprovingId(draft.id);
      await draftService.executeAction({
        email_id: draft.email_id,
        action: 'accept',
        edited_subject: draft.subject,
        edited_body: draft.body,
        calendar_event: draft.calendar_event,
      });
      showToast('Draft approved and dispatched!', 'success');
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-[#DCD5C9]">
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#6B665F]">
          Executive Dispatch Queue
        </span>
        <h1 className="text-2xl font-serif-title font-semibold text-[#1E1E1C] flex items-center gap-2">
          <span>AI Correspondence Drafts</span>
          <span className="text-[10px] font-mono text-[#4A3E18] bg-[#FDF8EC] px-2 py-0.5 rounded-[2px] border border-[#E0CE9A]">
            {drafts.length} ready
          </span>
        </h1>
        <p className="text-xs font-serif-body text-[#6B665F] mt-0.5">
          Review, revise, or authorize formulated correspondence before dispatch.
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton type="email-list" count={4} />
      ) : drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="p-5 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCD5C9]">
                <div>
                  <h3 className="text-base font-serif-title font-semibold text-[#1E1E1C]">{draft.subject}</h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#6B665F] mt-1">
                    <span className="uppercase text-[#8C867C]">To:</span>
                    <span className="text-[#1E1E1C]">{draft.to}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="drafted">Pending Sign-off</Badge>
                </div>
              </div>

              {/* Typed Correspondence Desk Pad */}
              <div className="p-4 rounded-[2px] bg-[#FDF8EC] border border-[#E0CE9A] text-sm text-[#1E1E1C] leading-[1.65] font-serif-body whitespace-pre-wrap">
                {draft.body}
              </div>

              {draft.calendar_event && (
                <div className="flex items-center gap-2 text-xs font-mono text-[#255C3A] bg-[#EEF5F1] border border-[#C2DEC8] p-2.5 rounded-[2px]">
                  <Calendar className="w-3.5 h-3.5 text-[#255C3A]" />
                  <span>Proposed calendar coordination: {draft.calendar_event.preferred_day}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#DCD5C9]">
                <Link
                  to={`/inbox?id=${draft.email_id}`}
                  className="text-xs font-mono uppercase tracking-wider text-[#1E3A5F] hover:underline flex items-center gap-1.5"
                >
                  <span>Open Full Thread & Edit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Button
                  variant="primary"
                  size="sm"
                  icon={Check}
                  loading={approvingId === draft.id}
                  onClick={() => handleApproveDraft(draft)}
                >
                  Authorize & Dispatch
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileEdit}
          title="No Drafts Awaiting Review"
          description="All AI drafts have been approved or dispatched. As incoming emails arrive, draft replies will queue here."
          actionText="Go to Inbox"
          onAction={() => (window.location.href = '/inbox')}
        />
      )}
    </div>
  );
}
