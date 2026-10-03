import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Inbox,
  Mail,
  Zap,
  FileEdit,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { emailService } from '../../services/emailService';
import { calendarService } from '../../services/calendarService';
import { draftService } from '../../services/draftService';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';

export default function DashboardPage() {
  const { user } = useAuth();
  const context = useOutletContext();
  const refreshKey = context?.refreshKey || 0;

  const [stats, setStats] = useState(null);
  const [recentActionable, setRecentActionable] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [statsData, actionableEmails, meetings] = await Promise.all([
          emailService.getStats(),
          emailService.getEmails('respond'),
          calendarService.getEvents(),
        ]);
        setStats(statsData);
        setRecentActionable(actionableEmails.slice(0, 4));
        setUpcomingMeetings(meetings.slice(0, 3));
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [refreshKey]);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/4 animate-pulse" />
        <LoadingSkeleton type="stats" />
        <LoadingSkeleton type="email-list" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCD5C9]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#6B665F]">
            Executive Briefing
          </span>
          <h1 className="text-2xl font-serif-title font-semibold text-[#1E1E1C]">
            Welcome back, {user?.full_name || 'Executive'}
          </h1>
          <p className="text-xs font-serif-body text-[#6B665F] mt-0.5">
            Active correspondence docket, triage status, and calendar engagements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/inbox">
            <Button variant="primary" size="sm" icon={Inbox}>
              Open Docket
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[#6B665F] text-[10px] font-mono font-medium uppercase tracking-wider">
              <span>Total Docket</span>
              <Inbox className="w-3.5 h-3.5 text-[#1E3A5F]" />
            </div>
            <div className="text-3xl font-serif-title font-semibold text-[#1E1E1C]">{stats.total}</div>
            <span className="text-[10px] font-mono text-[#6B665F]">
              {stats.unread} unread records
            </span>
          </div>

          <div className="p-4 rounded-[2px] border border-[#E8C5C2] bg-[#FCF2F1] flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[#6A2E2A] text-[10px] font-mono font-medium uppercase tracking-wider">
              <span>Action Required</span>
              <Mail className="w-3.5 h-3.5 text-[#6A2E2A]" />
            </div>
            <div className="text-3xl font-serif-title font-semibold text-[#6A2E2A]">{stats.respond}</div>
            <span className="text-[10px] font-mono text-[#6A2E2A]/70">
              Direct inquiries
            </span>
          </div>

          <div className="p-4 rounded-[2px] border border-[#E0CE9A] bg-[#FDF8EC] flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[#4A3E18] text-[10px] font-mono font-medium uppercase tracking-wider">
              <span>Desk Pad Drafts</span>
              <FileEdit className="w-3.5 h-3.5 text-[#4A3E18]" />
            </div>
            <div className="text-3xl font-serif-title font-semibold text-[#4A3E18]">{stats.drafted}</div>
            <span className="text-[10px] font-mono text-[#4A3E18]/70">
              Awaiting sign-off
            </span>
          </div>

          <div className="p-4 rounded-[2px] border border-[#F2DEB5] bg-[#FDF6E8] flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[#8F5B1A] text-[10px] font-mono font-medium uppercase tracking-wider">
              <span>Notifications</span>
              <Zap className="w-3.5 h-3.5 text-[#8F5B1A]" />
            </div>
            <div className="text-3xl font-serif-title font-semibold text-[#8F5B1A]">{stats.notify}</div>
            <span className="text-[10px] font-mono text-[#8F5B1A]/70">
              Informational feeds
            </span>
          </div>
        </div>
      )}

      {/* Two Column Layout: Action Items & Upcoming Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Actionable Inquiries */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#DCD5C9]">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1E1E1C]">
                Action Required (Needs Reply)
              </h3>
              <p className="text-[11px] font-serif-body text-[#6B665F]">Direct inquiries or scheduling requests awaiting disposition</p>
            </div>
            <Link to="/inbox?folder=respond" className="text-xs font-mono uppercase tracking-wider text-[#1E3A5F] hover:underline flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentActionable.length > 0 ? (
            <div className="divide-y divide-[#DCD5C9] border border-[#DCD5C9] rounded-[2px] bg-[#FCFAF7] overflow-hidden">
              {recentActionable.map((email) => (
                <Link
                  key={email.id}
                  to={`/inbox?id=${email.id}`}
                  className="block p-3.5 hover:bg-[#F4F1EA] transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-serif-title font-medium text-[#1E1E1C]">
                          {email.author.split('<')[0].trim()}
                        </span>
                        <Badge variant="respond">Respond</Badge>
                      </div>
                      <h4 className="text-xs font-serif-title text-[#1E1E1C] group-hover:text-[#1E3A5F] transition truncate">
                        {email.subject}
                      </h4>
                      <p className="text-[11px] font-serif-body text-[#6B665F] line-clamp-1 mt-0.5">
                        {email.email_thread}
                      </p>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-[#BDB5A7] group-hover:text-[#1E3A5F] group-hover:translate-x-0.5 transition shrink-0 mt-2" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Inbox Cleared"
              description="No incoming emails currently require a reply. All actionable items have been handled."
            />
          )}
        </div>

        {/* Right 1 Col: Upcoming Meetings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#DCD5C9]">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1E1E1C]">
                Coordinated Meetings
              </h3>
              <p className="text-[11px] font-serif-body text-[#6B665F]">Calendar slots negotiated autonomously</p>
            </div>
            <Link to="/calendar" className="text-xs font-mono uppercase tracking-wider text-[#1E3A5F] hover:underline flex items-center gap-1">
              <span>Calendar</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingMeetings.length > 0 ? (
            <div className="space-y-2">
              {upcomingMeetings.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-serif-title font-medium text-[#1E1E1C]">{evt.subject}</h5>
                    <Badge variant={evt.confirmed ? 'confirmed' : 'pending'}>
                      {evt.confirmed ? 'Confirmed' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[#6B665F]">
                    <Clock className="w-3 h-3 text-[#1E3A5F]" />
                    <span>{evt.preferred_day}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No Upcoming Meetings"
              description="When meetings are scheduled through email replies, they will appear here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
