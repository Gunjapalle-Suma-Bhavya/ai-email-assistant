import React from 'react';
import { Calendar, Clock, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

export default function MeetingCard({ event, onConfirm }) {
  return (
    <div className="p-4 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-serif-title font-semibold text-[#1E1E1C]">{event.subject}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={event.confirmed ? 'confirmed' : 'pending'}>
              {event.confirmed ? 'Confirmed' : 'Tentative'}
            </Badge>
            <span className="text-[10px] text-[#6B665F] font-mono">
              {event.duration_minutes} min duration
            </span>
          </div>
        </div>

        {!event.confirmed && onConfirm && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onConfirm(event.id)}
          >
            Confirm
          </Button>
        )}
      </div>

      <div className="text-xs font-mono text-[#6B665F] space-y-1.5 pt-2 border-t border-[#DCD5C9]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#1E3A5F]" />
          <span>{event.preferred_day}</span>
        </div>

        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#1E3A5F]" />
            <span className="truncate">{event.attendees.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
