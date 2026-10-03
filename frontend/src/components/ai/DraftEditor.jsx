import React from 'react';
import { FileEdit, Calendar, Send, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';

export default function DraftEditor({
  draft,
  onDraftChange,
  onGenerateDraft,
  generating = false,
}) {
  return (
    <div className="rounded-[2px] border border-[#E0CE9A] bg-[#FDF8EC] p-5 space-y-4 shadow-none">
      <div className="flex items-center justify-between pb-3 border-b border-[#E0CE9A]/70">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[2px] bg-[#E0CE9A]/40 border border-[#E0CE9A] flex items-center justify-center text-[#4A3E18]">
            <FileEdit className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#4A3E18]">
                Desk Pad — AI Draft Correspondence
              </h4>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-[#FCFAF7] text-[#4A3E18] border border-[#E0CE9A]">
                Pending Sign-Off
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#736336]">Formulated according to active tone & preferences</p>
          </div>
        </div>

        <Button
          variant="gold"
          size="sm"
          icon={Sparkles}
          loading={generating}
          onClick={onGenerateDraft}
        >
          {draft?.body ? 'Regenerate Draft' : 'Draft Response'}
        </Button>
      </div>

      {draft?.body ? (
        <div className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-mono font-medium text-[#736336] uppercase tracking-wider mb-1">
              Draft Subject Line
            </label>
            <input
              type="text"
              value={draft.subject || ''}
              onChange={(e) => onDraftChange({ ...draft, subject: e.target.value })}
              className="w-full bg-[#FCFAF7] border border-[#E0CE9A] text-[#1E1E1C] font-serif-title font-medium text-sm rounded-[2px] px-3 py-1.5 focus:outline-none focus:border-[#1E3A5F]"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-mono font-medium text-[#736336] uppercase tracking-wider">
                Correspondence Draft (Editable)
              </label>
              <span className="text-[10px] font-mono text-[#736336]">
                {draft.body.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={8}
              className="w-full bg-[#FCFAF7] border border-[#E0CE9A] text-[#1E1E1C] placeholder-[#8C867C] font-serif-body text-base rounded-[2px] p-4 transition focus:outline-none focus:border-[#1E3A5F] leading-[1.65]"
              value={draft.body || ''}
              onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
            />
          </div>

          {/* Proposed Calendar Invite Alert if present */}
          {draft.calendar_event && (
            <div className="flex items-start gap-3 p-3 rounded-[2px] bg-[#FCFAF7] border border-[#C2DEC8] text-[#255C3A]">
              <Calendar className="w-4 h-4 text-[#255C3A] shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <span className="font-mono font-medium uppercase tracking-wider text-[10px] text-[#255C3A]">
                  Calendar Coordination Extracted
                </span>
                <p className="font-serif-body text-xs text-[#1E1E1C]">
                  "{draft.calendar_event.subject}" proposed for <strong>{draft.calendar_event.preferred_day}</strong> ({draft.calendar_event.duration_minutes} min duration)
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 rounded-[2px] bg-[#FCFAF7]/60 border border-dashed border-[#E0CE9A] text-center space-y-2">
          <FileEdit className="w-7 h-7 text-[#8F7D4E] mx-auto stroke-[1.5]" />
          <h5 className="text-sm font-serif-title font-medium text-[#4A3E18]">Desk Pad Idle</h5>
          <p className="text-xs font-serif-body text-[#736336] max-w-sm mx-auto">
            Click 'Draft Response' to draft a context-aware reply using LangGraph reasoning and your saved persona style.
          </p>
        </div>
      )}
    </div>
  );
}
