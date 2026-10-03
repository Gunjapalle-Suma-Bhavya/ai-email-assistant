import React, { useState } from 'react';
import { Check, Edit3, MessageSquarePlus, Ban, Send } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';

export default function ApprovalPanel({
  hasDraft,
  onAction,
  actionLoading = false,
}) {
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return;
    onAction('feedback', { user_feedback: feedbackText });
    setFeedbackModalOpen(false);
    setFeedbackText('');
  };

  return (
    <>
      <div className="rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] p-4 space-y-3 shadow-none">
        <div className="flex items-center justify-between pb-2 border-b border-[#DCD5C9]">
          <div className="flex items-center gap-2">
            <h4 className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#1E1E1C]">
              Human Verification Gate
            </h4>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-[#ECE7DE] text-[#6B665F] border border-[#DCD5C9]">
              Safe Execution
            </span>
          </div>
          <p className="text-[10px] font-mono text-[#6B665F]">
            Strict sign-off required
          </p>
        </div>

        {/* Action Tray: Clean unboxed action words separated by subtle bullet points */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-xs font-mono uppercase tracking-wider py-1">
          {hasDraft ? (
            <>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onAction('accept')}
                className="inline-flex items-center gap-1.5 text-[#1E3A5F] hover:text-[#152943] font-semibold underline underline-offset-4 decoration-[#1E3A5F]/40 hover:decoration-[#1E3A5F] transition disabled:opacity-40 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Approve & Dispatch</span>
              </button>

              <span className="text-[#DCD5C9] select-none">|</span>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onAction('edit')}
                className="inline-flex items-center gap-1.5 text-[#1E1E1C] hover:text-[#1E3A5F] underline underline-offset-4 decoration-[#DCD5C9] hover:decoration-[#1E3A5F] transition disabled:opacity-40 whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                <span>Dispatch Edited</span>
              </button>

              <span className="text-[#DCD5C9] select-none">|</span>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setFeedbackModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-[#6B665F] hover:text-[#1E1E1C] underline underline-offset-4 decoration-[#DCD5C9] transition disabled:opacity-40 whitespace-nowrap"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                <span>Refine with Guidance</span>
              </button>

              <span className="text-[#DCD5C9] select-none">|</span>
            </>
          ) : null}

          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onAction('ignore')}
            className="inline-flex items-center gap-1.5 text-[#6A2E2A] hover:text-[#542421] underline underline-offset-4 decoration-[#E8C5C2] hover:decoration-[#6A2E2A] transition disabled:opacity-40 whitespace-nowrap"
          >
            <Ban className="w-3.5 h-3.5 shrink-0" />
            <span>Mark Ignored</span>
          </button>
        </div>
      </div>

      {/* Guidance Feedback Modal */}
      <Modal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Provide Guidance for Regeneration"
        description="Instruct the AI on how to adjust tone, length, or points to cover."
      >
        <div className="space-y-4">
          <textarea
            rows={4}
            className="w-full bg-[#FCFAF7] border border-[#DCD5C9] text-[#1E1E1C] placeholder-[#8C867C] font-serif-body text-sm rounded-[2px] p-3 focus:outline-none focus:border-[#1E3A5F]"
            placeholder="e.g. Make it more concise, decline the Tuesday slot, and propose Thursday afternoon instead..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCD5C9]">
            <Button variant="ghost" size="sm" onClick={() => setFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={actionLoading}
              onClick={handleFeedbackSubmit}
            >
              Regenerate Draft
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
