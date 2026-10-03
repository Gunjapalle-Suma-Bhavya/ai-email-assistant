import React from 'react';
import { Sparkles, Brain, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

export default function AIInsightCard({
  email,
  onRunTriage,
  triageLoading = false,
}) {
  const hasClassification = !!email.classification;

  return (
    <div className="rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#DCD5C9]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[2px] bg-[#ECE7DE] border border-[#DCD5C9] flex items-center justify-center text-[#1E3A5F]">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#1E1E1C]">
              Triage Intelligence Dossier
            </h4>
            <p className="text-[10px] font-mono text-[#6B665F]">Autonomous priority and intent evaluation</p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Zap}
          loading={triageLoading}
          onClick={onRunTriage}
        >
          {hasClassification ? 'Re-Analyze' : 'Analyze Email'}
        </Button>
      </div>

      {hasClassification ? (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B665F]">Triage Verdict:</span>
            <Badge variant={email.classification}>
              {email.classification.toUpperCase()}
            </Badge>
            {email.confidence_score && (
              <span className="text-[10px] font-mono text-[#1E3A5F] bg-[#EBF2FA] px-1.5 py-0.5 rounded-[2px] border border-[#BACFE6]">
                {Math.round(email.confidence_score * 100)}% Confidence
              </span>
            )}
          </div>

          <div>
            <h5 className="text-[10px] font-mono font-medium text-[#6B665F] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#1E3A5F]" />
              <span>Chain-of-Thought Rationale</span>
            </h5>
            <p className="text-xs font-serif-body text-[#1E1E1C] leading-relaxed bg-[#F4F1EA] p-3 rounded-[2px] border border-[#DCD5C9]">
              {email.reasoning || 'Categorized according to active communication preferences.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-[2px] bg-[#F4F1EA]/60 border border-dashed border-[#DCD5C9] text-center space-y-1">
          <p className="text-xs font-serif-title font-medium text-[#1E1E1C]">Email unexamined by AI model</p>
          <p className="text-[10px] font-mono text-[#6B665F]">
            Click 'Analyze Email' to formulate intent evaluation and chain-of-thought rationale.
          </p>
        </div>
      )}
    </div>
  );
}
