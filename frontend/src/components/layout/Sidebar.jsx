import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Inbox,
  LayoutDashboard,
  FileEdit,
  Calendar,
  Sliders,
  Sparkles,
  Bot,
  User,
  LogOut,
  FolderDot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Inbox', to: '/inbox', icon: Inbox },
    { label: 'AI Drafts', to: '/drafts', icon: FileEdit },
    { label: 'Calendar', to: '/calendar', icon: Calendar },
    { label: 'Preferences', to: '/preferences', icon: Sliders },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1E1E1C]/30 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#ECE7DE] border-r border-[#DCD5C9] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Logo */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-[#DCD5C9]">
            <div className="w-8 h-8 rounded-[2px] bg-[#1E3A5F] flex items-center justify-center text-[#FCFAF7] shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="font-serif-title font-semibold text-base text-[#1E1E1C] flex items-center gap-2">
                <span>AetherMail</span>
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded-[2px] bg-[#FDF8EC] text-[#4A3E18] border border-[#E0CE9A]">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#6B665F]">Executive Stationery</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <div className="text-[10px] font-mono font-medium uppercase tracking-[0.08em] text-[#6B665F] px-3 py-2">
              Workspace
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-[2px] text-xs font-mono uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-[#FCFAF7] text-[#1E1E1C] border-l-2 border-[#1E3A5F] border-t border-r border-b border-[#DCD5C9] font-medium'
                        : 'text-[#6B665F] hover:text-[#1E1E1C] hover:bg-[#F4F1EA] border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Account Footer */}
        <div className="p-4 border-t border-[#DCD5C9]">
          <NavLink
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 p-2 rounded-[2px] hover:bg-[#F4F1EA] border border-transparent hover:border-[#DCD5C9] transition group"
          >
            <div className="w-7 h-7 rounded-[2px] bg-[#1E3A5F] text-[#FCFAF7] flex items-center justify-center font-mono font-medium text-xs shrink-0">
              {user?.full_name ? user.full_name[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-serif-title font-medium text-[#1E1E1C] truncate group-hover:text-[#1E3A5F] transition">
                {user?.full_name || 'My Account'}
              </p>
              <p className="text-[10px] font-mono text-[#6B665F] truncate">{user?.email || 'Logged in'}</p>
            </div>
          </NavLink>

          <button
            onClick={logout}
            className="mt-2 w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#6B665F] hover:text-[#6A2E2A] hover:bg-[#FCF2F1] rounded-[2px] transition border border-transparent hover:border-[#E8C5C2]"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
