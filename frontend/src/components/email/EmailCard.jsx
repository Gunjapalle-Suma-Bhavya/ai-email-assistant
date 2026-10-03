import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Clock, Calendar, Sparkles, ChevronRight } from 'lucide-react';
import Badge from '../common/Badge';

export default function EmailCard({ email, isSelected, onSelect }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onSelect) onSelect(email);
    else navigate(`/inbox/${email.id}`);
  };

  const formattedDate = React.useMemo(() => {
    if (!email.received_at) return '';
    try {
      const d = new Date(email.received_at);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [email.received_at]);

  const authorName = email.author ? email.author.split('<')[0].trim() : 'Unknown';

  return (
    <div
      onClick={handleClick}
      className={`group relative p-3.5 transition-all duration-150 cursor-pointer select-none border-b border-[#DCD5C9] ${
        isSelected
          ? 'bg-[#FCFAF7] border-l-2 border-l-[#1E3A5F] border-r border-[#DCD5C9] -ml-px'
          : email.status === 'unread'
          ? 'bg-[#FCFAF7]/90 hover:bg-[#FCFAF7]'
          : 'bg-transparent hover:bg-[#FCFAF7]/60'
      }`}
    >
      <div className="flex flex-col min-w-0">
        {/* Tier 1: Author & Timestamp */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {email.status === 'unread' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F] shrink-0" title="Unread" />
            )}
            <h4
              className={`text-xs truncate ${
                email.status === 'unread'
                  ? 'font-serif-title font-semibold text-[#1E1E1C]'
                  : 'font-serif-title font-medium text-[#4A453E]'
              }`}
              title={authorName}
            >
              {authorName}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-[#6B665F] tabular-nums">
              {formattedDate}
            </span>
            <ChevronRight className="w-3 h-3 text-[#BDB5A7] group-hover:text-[#1E3A5F] group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Tier 2: Classification & Status Badges */}
        {(email.classification || email.status === 'drafted' || email.status === 'sent' || email.account_email) && (
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {email.classification && (
              <Badge variant={email.classification}>
                {email.classification}
              </Badge>
            )}

            {email.status === 'drafted' && (
              <Badge variant="drafted">Draft Ready</Badge>
            )}
            {email.status === 'sent' && (
              <Badge variant="sent">Replied</Badge>
            )}
            {email.account_email && (
              <span
                className="text-[9px] font-mono px-1 py-0.2 rounded-[2px] bg-[#ECE7DE] text-[#6B665F] border border-[#DCD5C9] truncate max-w-[120px]"
                title={`Account: ${email.account_email}`}
              >
                {email.account_email.split('@')[1] || email.account_email}
              </span>
            )}
          </div>
        )}

        {/* Tier 3: Subject */}
        <h5
          className={`text-xs truncate mb-1 ${
            email.status === 'unread'
              ? 'font-serif-title font-semibold text-[#1E1E1C]'
              : 'font-serif-title font-normal text-[#2A2927]'
          } group-hover:text-[#1E3A5F] transition`}
          title={email.subject}
        >
          {email.subject || '(No Subject)'}
        </h5>

        {/* Tier 4: Snippet */}
        <p className="text-[11px] font-serif-body text-[#6B665F] line-clamp-2 leading-relaxed break-words">
          {email.email_thread}
        </p>
      </div>
    </div>
  );
}
