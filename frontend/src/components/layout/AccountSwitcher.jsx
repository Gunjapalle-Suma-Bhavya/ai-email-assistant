import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Building2,
  User,
  Plus,
  Check,
  Zap,
  Trash2,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { accountService } from '../../services/accountService';
import { useToast } from '../../context/ToastContext';

export default function AccountSwitcher({ onAccountChanged }) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountService.getAccounts();
      setAccounts(data.accounts || []);
      setActiveAccountId(data.active_account_id || 'all');
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSwitch = async (accId) => {
    try {
      await accountService.switchAccount(accId);
      setActiveAccountId(accId);
      setIsOpen(false);
      showToast(
        accId === 'all'
          ? 'Switched to Unified Docket (All Accounts)'
          : `Switched active inbox view.`,
        'success'
      );
      if (onAccountChanged) onAccountChanged(accId);
    } catch (err) {
      showToast(err.message || 'Failed to switch account', 'error');
    }
  };

  const handleConnectAnother = async () => {
    try {
      const url = await accountService.getConnectUrl();
      window.location.href = url;
    } catch (err) {
      showToast(err.message || 'Failed to start Google connection', 'error');
    }
  };

  const handleDisconnect = async (e, accId) => {
    e.stopPropagation();
    if (!window.confirm('Disconnect this secondary Google account?')) return;
    try {
      await accountService.disconnectAccount(accId);
      showToast('Account disconnected', 'info');
      await loadAccounts();
      if (onAccountChanged) onAccountChanged('all');
    } catch (err) {
      showToast(err.message || 'Failed to disconnect account', 'error');
    }
  };

  const handleSimulatePush = async () => {
    try {
      setSimulating(true);
      const res = await accountService.simulatePush();
      showToast(
        `Instant Push Ingestion: ${res.email?.subject || 'New email triaged!'}`,
        'success'
      );
      setIsOpen(false);
      if (onAccountChanged) onAccountChanged(activeAccountId);
    } catch (err) {
      showToast(err.message || 'Simulation failed', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Find active account object
  const activeAccount = accounts.find((a) => a.account_id === activeAccountId);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] bg-[#FCFAF7] border border-[#DCD5C9] text-xs font-mono uppercase tracking-wider text-[#1E1E1C] hover:bg-[#ECE7DE]/70 transition shadow-none"
        title="Switch between Personal Gmail and Corporate Workspace accounts"
      >
        {activeAccountId === 'all' || !activeAccount ? (
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#1E3A5F]" />
            <span className="font-semibold text-[#1E3A5F]">Unified Docket</span>
            {accounts.length > 0 && (
              <span className="text-[10px] px-1 py-0.2 rounded-[2px] bg-[#ECE7DE] text-[#6B665F]">
                {accounts.length}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {activeAccount.account_type === 'workspace' ? (
              <Building2 className="w-3.5 h-3.5 text-[#8F7D4E]" />
            ) : (
              <User className="w-3.5 h-3.5 text-[#1E3A5F]" />
            )}
            <span className="truncate max-w-[130px] font-semibold text-[#1E1E1C]">
              {activeAccount.email}
            </span>
            <span
              className={`text-[9px] uppercase px-1 py-0.2 rounded-[2px] border ${
                activeAccount.account_type === 'workspace'
                  ? 'bg-[#FDF8EC] text-[#4A3E18] border-[#E0CE9A]'
                  : 'bg-[#EBF2FA] text-[#1E3A5F] border-[#BACFE6]'
              }`}
            >
              {activeAccount.account_type === 'workspace' ? 'Corp' : 'Gmail'}
            </span>
          </div>
        )}
        <ChevronDown className="w-3 h-3 text-[#6B665F] ml-0.5" />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="origin-top-left absolute left-0 mt-1 w-80 rounded-[2px] bg-[#FCFAF7] border border-[#DCD5C9] shadow-lg z-50 divide-y divide-[#DCD5C9] animate-in fade-in duration-100">
          {/* Header */}
          <div className="p-2.5 bg-[#ECE7DE]/50 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B665F] font-semibold">
              Multi-Account Docket Switcher
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[#EBF2FA] text-[#1E3A5F] border border-[#BACFE6]">
              Real-Time Push
            </span>
          </div>

          {/* Unified Option */}
          <div className="p-1">
            <button
              type="button"
              onClick={() => handleSwitch('all')}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-[2px] text-left transition font-mono ${
                activeAccountId === 'all'
                  ? 'bg-[#ECE7DE] text-[#1E1E1C] font-semibold'
                  : 'text-[#6B665F] hover:bg-[#F4F1EA] hover:text-[#1E1E1C]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1E3A5F]" />
                <div>
                  <div className="uppercase tracking-wider">All Accounts (Unified Docket)</div>
                  <div className="text-[10px] text-[#8C867C] font-serif-body">
                    Aggregated executive inbox stream
                  </div>
                </div>
              </div>
              {activeAccountId === 'all' && (
                <Check className="w-3.5 h-3.5 text-[#1E3A5F]" />
              )}
            </button>
          </div>

          {/* Accounts List */}
          <div className="p-1 max-h-56 overflow-y-auto space-y-0.5">
            {accounts.length > 0 ? (
              accounts.map((acc) => {
                const isSelected = activeAccountId === acc.account_id;
                const isWork = acc.account_type === 'workspace';
                return (
                  <div
                    key={acc.account_id}
                    onClick={() => handleSwitch(acc.account_id)}
                    className={`group flex items-center justify-between px-3 py-2 text-xs rounded-[2px] cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#ECE7DE] text-[#1E1E1C] font-medium'
                        : 'hover:bg-[#F4F1EA] text-[#6B665F] hover:text-[#1E1E1C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isWork ? (
                        <div className="w-6 h-6 rounded-[2px] bg-[#FDF8EC] border border-[#E0CE9A] flex items-center justify-center text-[#4A3E18] shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-[2px] bg-[#EBF2FA] border border-[#BACFE6] flex items-center justify-center text-[#1E3A5F] shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate font-mono text-[11px]">
                          <span className="truncate">{acc.email}</span>
                          <span
                            className={`text-[8px] uppercase px-1 py-0.2 rounded-[2px] border shrink-0 ${
                              isWork
                                ? 'bg-[#FDF8EC] text-[#4A3E18] border-[#E0CE9A]'
                                : 'bg-[#EBF2FA] text-[#1E3A5F] border-[#BACFE6]'
                            }`}
                          >
                            {isWork ? 'Workspace' : 'Personal'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8C867C] font-serif-body truncate">
                          {acc.full_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-[#1E3A5F]" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleDisconnect(e, acc.account_id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#8C867C] hover:text-[#6A2E2A] transition"
                          title="Unlink account"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-[11px] font-mono text-[#8C867C]">
                No linked Google accounts.
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-2 space-y-1 bg-[#FCFAF7]">
            <button
              type="button"
              onClick={handleConnectAnother}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] text-[#FCFAF7] text-[11px] font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#162c46] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Another Google Account</span>
            </button>

            <button
              type="button"
              onClick={handleSimulatePush}
              disabled={simulating}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#6B665F] hover:text-[#1E3A5F] hover:underline disabled:opacity-50"
              title="Simulates real-time push ingestion via Pub/Sub webhook"
            >
              <Zap className={`w-3 h-3 text-[#1E3A5F] ${simulating ? 'animate-spin' : ''}`} />
              <span>{simulating ? 'Ingesting Push...' : 'Simulate Pub/Sub Push Webhook'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
