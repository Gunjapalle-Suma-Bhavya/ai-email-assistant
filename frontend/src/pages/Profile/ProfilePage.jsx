import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Database, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error('Health check failed', err));
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      <div className="pb-4 border-b border-[#DCD5C9]">
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#6B665F]">
          Executive Credentials
        </span>
        <h1 className="text-2xl font-serif-title font-semibold text-[#1E1E1C]">
          Account & Infrastructure Records
        </h1>
        <p className="text-xs font-serif-body text-[#6B665F] mt-0.5">
          Authenticated user profile, workspace credentials, and persistence status.
        </p>
      </div>

      {/* User Card */}
      <div className="p-6 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[2px] bg-[#1E3A5F] flex items-center justify-center text-[#FCFAF7] font-serif-title font-semibold text-xl">
            {user?.full_name ? user.full_name[0].toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-serif-title font-semibold text-[#1E1E1C]">{user?.full_name || 'Executive User'}</h3>
            <p className="text-xs text-[#6B665F] font-mono mt-0.5">{user?.email || 'N/A'}</p>
            <div className="mt-1.5">
              <Badge variant="confirmed">Active Credentials</Badge>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#DCD5C9] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-[#6B665F] uppercase text-[10px]">Account Identifier:</span>
            <p className="text-[#1E1E1C] mt-0.5">{user?.id || 'usr_sandbox'}</p>
          </div>
          <div>
            <span className="text-[#6B665F] uppercase text-[10px]">Session Status:</span>
            <p className="text-[#1E1E1C] mt-0.5">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active session'}
            </p>
          </div>
        </div>
      </div>

      {/* Google Integration Card */}
      <div className="p-6 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <h4 className="text-[11px] font-mono font-medium text-[#1E1E1C] uppercase tracking-wider">
              Google Workspace (Gmail & Calendar)
            </h4>
          </div>
          <div>
            {user?.auth_provider === 'google' || user?.google_connected ? (
              <Badge variant="confirmed">Connected</Badge>
            ) : (
              <Badge variant="default">Not Linked</Badge>
            )}
          </div>
        </div>

        <p className="text-xs font-serif-body text-[#6B665F]">
          Connect your Google account to grant permission for fetching inbox messages, dispatching approved drafts, and synchronizing Google Calendar meetings.
        </p>

        <div className="pt-2">
          {user?.auth_provider === 'google' || user?.google_connected ? (
            <div className="text-xs font-mono text-[#255C3A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Single Sign-On & API access active for {user?.email}</span>
            </div>
          ) : (
            <a
              href="/api/auth/google/login"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[2px] bg-[#1E3A5F] text-[#FCFAF7] text-xs font-mono uppercase tracking-wider hover:bg-[#162c46] transition"
            >
              <span>Connect Google Account</span>
            </a>
          )}
        </div>
      </div>

      {/* Infrastructure & Database Health */}
      <div className="p-6 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-3">
        <h4 className="text-[11px] font-mono font-medium text-[#1E1E1C] uppercase tracking-wider flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-[#1E3A5F]" />
          <span>Storage & Model Infrastructure</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-[2px] bg-[#F4F1EA] border border-[#DCD5C9] space-y-1">
            <span className="text-[#6B665F] text-[10px] uppercase">Database Persistence:</span>
            <div className="flex items-center gap-2 font-medium">
              <span className={`w-2 h-2 rounded-full ${health?.mongodb_connected ? 'bg-[#255C3A]' : 'bg-[#8F5B1A]'}`} />
              <span className={health?.mongodb_connected ? 'text-[#255C3A]' : 'text-[#8F5B1A]'}>
                {health?.mongodb_connected ? 'Atlas Cluster Connected' : 'Resilient Standalone Mode'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-[2px] bg-[#F4F1EA] border border-[#DCD5C9] space-y-1">
            <span className="text-[#6B665F] text-[10px] uppercase">Reasoning Engine:</span>
            <p className="text-[#1E3A5F] font-semibold">
              {health?.model || 'gpt-4o-mini'}
            </p>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <Button variant="oxblood" size="md" icon={LogOut} onClick={logout}>
          Sign Out of Workspace
        </Button>
      </div>
    </div>
  );
}
