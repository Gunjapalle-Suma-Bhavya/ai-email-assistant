import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Plus, Clock, Users, CheckCircle2 } from 'lucide-react';
import { calendarService } from '../../services/calendarService';
import { useToast } from '../../context/ToastContext';
import MeetingCard from '../../components/calendar/MeetingCard';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function CalendarPage() {
  const context = useOutletContext();
  const refreshKey = context?.refreshKey || 0;
  const { showToast } = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // New event form state
  const [subject, setSubject] = useState('');
  const [attendees, setAttendees] = useState('');
  const [preferredDay, setPreferredDay] = useState('');
  const [duration, setDuration] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const handleSyncGoogle = async () => {
    try {
      setSyncing(true);
      const res = await calendarService.syncGoogleCalendar();
      showToast(res.message || 'Google Calendar synchronized successfully.', 'success');
      const data = await calendarService.getEvents();
      setEvents(data || []);
    } catch (err) {
      if (err.message && err.message.includes('connect your Google account')) {
        showToast('Please sign in or link your Google account to sync Calendar.', 'error');
      } else {
        showToast(err.message || 'Failed to sync Google Calendar', 'error');
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        const data = await calendarService.getEvents();
        setEvents(data || []);
      } catch (err) {
        console.error('Failed to load calendar events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [refreshKey]);

  const handleConfirmEvent = async (eventId) => {
    try {
      await calendarService.confirmEvent(eventId);
      showToast('Meeting confirmed on your calendar!', 'success');
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, confirmed: true } : e))
      );
    } catch (err) {
      showToast(err.message || 'Confirmation failed', 'error');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!subject || !preferredDay) {
      showToast('Subject and date/time are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const attendeeList = attendees
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const newEvt = await calendarService.createEvent({
        subject,
        attendees: attendeeList,
        preferred_day: preferredDay,
        duration_minutes: Number(duration),
        confirmed: true,
      });

      showToast('Meeting added to calendar!', 'success');
      setEvents((prev) => [...prev, newEvt]);
      setSubject('');
      setAttendees('');
      setPreferredDay('');
      setDuration(30);
      setModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to create meeting', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCD5C9]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#6B665F]">
            Schedule Coordination
          </span>
          <h1 className="text-2xl font-serif-title font-semibold text-[#1E1E1C] flex items-center gap-2">
            <span>Coordinated Calendar</span>
            <span className="text-[10px] font-mono text-[#6B665F] bg-[#FCFAF7] px-2 py-0.5 rounded-[2px] border border-[#DCD5C9]">
              {events.length} engagements
            </span>
          </h1>
          <p className="text-xs font-serif-body text-[#6B665F] mt-0.5">
            Meetings detected and scheduled through email interactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={syncing}
            onClick={handleSyncGoogle}
          >
            Sync Google Calendar
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setModalOpen(true)}
          >
            Add Meeting
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="email-list" count={3} />
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((evt) => (
            <MeetingCard
              key={evt.id}
              event={evt}
              onConfirm={handleConfirmEvent}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No Scheduled Meetings"
          description="When calendar requests in emails are triaged and confirmed, they will show up here."
          actionText="Schedule New Meeting"
          onAction={() => setModalOpen(true)}
        />
      )}

      {/* Manual Schedule Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Calendar Meeting"
        description="Manually record a meeting or sync with upcoming schedule."
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Input
            label="Meeting Subject"
            placeholder="e.g. Q4 Strategy Review"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <Input
            label="Attendees (Comma-separated emails)"
            placeholder="sarah@company.com, tom@partner.io"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
          />
          <Input
            label="Preferred Date & Time Window"
            placeholder="e.g. Next Tuesday at 2:00 PM - 2:30 PM EST"
            value={preferredDay}
            onChange={(e) => setPreferredDay(e.target.value)}
            required
          />
          <Input
            label="Duration (minutes)"
            type="number"
            min="15"
            step="15"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submitting}>
              Schedule Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
