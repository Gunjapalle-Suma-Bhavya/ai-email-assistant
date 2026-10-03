import React from 'react';
import { Menu, Plus, Zap, RotateCcw } from 'lucide-react';
import Button from '../common/Button';
import AccountSwitcher from './AccountSwitcher';
import { emailService } from '../../services/emailService';
import { useToast } from '../../context/ToastContext';

export default function Topbar({ onToggleSidebar, onOpenCompose, onRefreshData }) {
  const { showToast } = useToast();
  const [triageLoading, setTriageLoading] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);

  const handleTriageAll = async () => {
    try {
      setTriageLoading(true);
      const results = await emailService.triageAllUnread();
      showToast(`Triaged ${results.length} unread emails successfully!`, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showToast(err.message || 'Triage failed', 'error');
    } finally {
      setTriageLoading(false);
    }
  };

  const handleResetData = async () => {
    try {
      setResetLoading(true);
      await emailService.resetData();
      showToast('Inbox reset to benchmark dataset.', 'info');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showToast(err.message || 'Reset failed', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <header className="h-14 px-4 md:px-6 bg-[#F4F1EA] border-b border-[#DCD5C9] flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-[2px] text-[#6B665F] hover:text-[#1E1E1C] hover:bg-[#ECE7DE] lg:hidden transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Multi-Account Switcher: Personal Gmail vs Corporate Workspace */}
        <AccountSwitcher onAccountChanged={onRefreshData} />
      </div>

      <div className="flex items-center gap-2">
        {/* Real-time Google Pub/Sub Webhook Status */}
        <div
          className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-[#255C3A] bg-[#F5F8F6] border border-[#C2D9C8] px-2.5 py-1 rounded-[2px]"
          title="Google Cloud Pub/Sub Webhook is active for real-time push deliveries"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#255C3A] animate-pulse" />
          <span>Pub/Sub Push Active</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={RotateCcw}
          loading={resetLoading}
          onClick={handleResetData}
          title="Reset to benchmark sample emails"
        >
          <span className="hidden sm:inline">Reset Demo</span>
        </Button>

        <Button
          variant="gold"
          size="sm"
          icon={Zap}
          loading={triageLoading}
          onClick={handleTriageAll}
          title="Run autonomous AI triage on unread items"
        >
          <span className="hidden sm:inline">Triage All</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={onOpenCompose}
        >
          <span>Compose</span>
        </Button>
      </div>
    </header>
  );
}
