import React, { useState, useEffect } from 'react';
import { Sliders, Save, RotateCcw, Sparkles, Brain, Check, MessageSquare } from 'lucide-react';
import { preferenceService } from '../../services/preferenceService';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function PreferencesPage() {
  const { showToast } = useToast();

  const [background, setBackground] = useState('');
  const [triageInstructions, setTriageInstructions] = useState('');
  const [responsePreferences, setResponsePreferences] = useState('');
  const [calPreferences, setCalPreferences] = useState('');
  const [learnedPreferences, setLearnedPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoading(true);
        const data = await preferenceService.getPreferences();
        setBackground(data.background || '');
        setTriageInstructions(data.triage_instructions || '');
        setResponsePreferences(data.response_preferences || '');
        setCalPreferences(data.cal_preferences || '');
        setLearnedPreferences(data.learned_preferences || []);
      } catch (err) {
        showToast(err.message || 'Failed to load preferences', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, [showToast]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await preferenceService.updatePreferences({
        background,
        triage_instructions: triageInstructions,
        response_preferences: responsePreferences,
        cal_preferences: calPreferences,
      });
      showToast('Preferences and memory rules updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all communication rules and learned preferences to defaults?')) {
      return;
    }
    try {
      setResetting(true);
      const res = await preferenceService.resetPreferences();
      setBackground(res.background);
      setTriageInstructions(res.triage_instructions);
      setResponsePreferences(res.response_preferences);
      setCalPreferences(res.cal_preferences);
      setLearnedPreferences(res.learned_preferences || []);
      showToast('Preferences restored to default calibration.', 'info');
    } catch (err) {
      showToast(err.message || 'Reset failed', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-800 rounded w-1/4 animate-pulse" />
        <LoadingSkeleton type="email-detail" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCD5C9]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#6B665F]">
            Persona & Memory Calibration
          </span>
          <h1 className="text-2xl font-serif-title font-semibold text-[#1E1E1C]">
            Communication Rules & Adaptive Memory
          </h1>
          <p className="text-xs font-serif-body text-[#6B665F] mt-0.5">
            Configure explicit guidelines and inspect learned persona behaviors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            loading={resetting}
            onClick={handleReset}
          >
            Reset Defaults
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            loading={saving}
            onClick={handleSave}
          >
            Save Rules
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Background / Role */}
        <div className="p-5 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-2">
          <label className="block text-[11px] font-mono font-medium text-[#1E1E1C] uppercase tracking-wider">
            Executive Role & Domain Context
          </label>
          <p className="text-[11px] font-serif-body text-[#6B665F]">
            Informs the AI about your profession, domain expertise, and scope of authority.
          </p>
          <textarea
            rows={3}
            className="w-full bg-[#FCFAF7] border border-[#DCD5C9] hover:border-[#BDB5A7] text-[#1E1E1C] placeholder-[#8C867C] text-sm font-serif-body rounded-[2px] p-3 focus:outline-none focus:border-[#1E3A5F] leading-relaxed"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />
        </div>

        {/* Triage Rules */}
        <div className="p-5 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-2">
          <label className="block text-[11px] font-mono font-medium text-[#1E1E1C] uppercase tracking-wider">
            Triage & Categorization Principles
          </label>
          <p className="text-[11px] font-serif-body text-[#6B665F]">
            Guidelines defining which categories of emails should be Ignored, Notified, or responded to.
          </p>
          <textarea
            rows={7}
            className="w-full bg-[#FCFAF7] border border-[#DCD5C9] hover:border-[#BDB5A7] text-[#1E1E1C] placeholder-[#8C867C] text-xs font-mono rounded-[2px] p-3 focus:outline-none focus:border-[#1E3A5F] leading-relaxed"
            value={triageInstructions}
            onChange={(e) => setTriageInstructions(e.target.value)}
          />
        </div>

        {/* Writing Style */}
        <div className="p-5 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-2">
          <label className="block text-[11px] font-mono font-medium text-[#1E1E1C] uppercase tracking-wider">
            Draft Correspondence Tone & Etiquette
          </label>
          <p className="text-[11px] font-serif-body text-[#6B665F]">
            Rules governing writing length, tone (formal vs. concise), follow-up timelines, and greeting etiquette.
          </p>
          <textarea
            rows={5}
            className="w-full bg-[#FCFAF7] border border-[#DCD5C9] hover:border-[#BDB5A7] text-[#1E1E1C] placeholder-[#8C867C] text-xs font-mono rounded-[2px] p-3 focus:outline-none focus:border-[#1E3A5F] leading-relaxed"
            value={responsePreferences}
            onChange={(e) => setResponsePreferences(e.target.value)}
          />
        </div>

        {/* Calendar Preferences */}
        <div className="p-5 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-2">
          <label className="block text-[11px] font-mono font-medium text-[#1E1E1C] uppercase tracking-wider">
            Calendar Scheduling Constraints
          </label>
          <p className="text-[11px] font-serif-body text-[#6B665F]">
            Default meeting duration, preferred hours, and forbidden meeting slots.
          </p>
          <textarea
            rows={4}
            className="w-full bg-[#FCFAF7] border border-[#DCD5C9] hover:border-[#BDB5A7] text-[#1E1E1C] placeholder-[#8C867C] text-xs font-mono rounded-[2px] p-3 focus:outline-none focus:border-[#1E3A5F] leading-relaxed"
            value={calPreferences}
            onChange={(e) => setCalPreferences(e.target.value)}
          />
        </div>

        {/* Learned Preferences Section */}
        <div className="p-5 rounded-[2px] border border-[#E0CE9A] bg-[#FDF8EC] space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[2px] bg-[#E0CE9A]/40 border border-[#E0CE9A] flex items-center justify-center text-[#4A3E18]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-[#4A3E18]">
                Dynamically Inferred Preferences
              </h3>
              <p className="text-[10px] font-mono text-[#736336]">
                Tendencies recorded autonomously from past Human-in-the-Loop draft revisions
              </p>
            </div>
          </div>

          {learnedPreferences.length > 0 ? (
            <div className="space-y-2 pt-2 border-t border-[#E0CE9A]/60">
              {learnedPreferences.map((lp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-[2px] bg-[#FCFAF7] border border-[#E0CE9A] flex items-start gap-2.5"
                >
                  <Brain className="w-3.5 h-3.5 text-[#4A3E18] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#1E1E1C] font-serif-body leading-relaxed">
                      {lp.rule}
                    </p>
                    <span className="text-[9px] text-[#736336] font-mono">
                      Source: {lp.source || 'HITL edit feedback'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-serif-body text-[#736336] p-4 bg-[#FCFAF7]/60 rounded-[2px] border border-dashed border-[#E0CE9A] text-center">
              No learned adjustments yet. As you edit drafts and give feedback, the system will record your writing tendencies here.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
