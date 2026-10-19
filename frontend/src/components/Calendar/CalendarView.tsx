import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import type { AcademicEvent } from '../../types/database';
import { formatIndianDate, formatDateRange } from '../../utils/dateUtils';

interface CalendarViewProps {
  events: AcademicEvent[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events }) => {
  const [selectedType, setSelectedType] = useState<string>('All');

  const filteredEvents = events.filter(
    (ev) => selectedType === 'All' || ev.event_type === selectedType
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#5B8DEF]" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Institutional Academic Calendar
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Key university milestones, mid-semester examinations, board reviews, and holiday schedules.
          </p>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          {['All', 'Exam', 'Meeting', 'Holiday'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1 rounded-lg transition-all border ${
                selectedType === type
                  ? 'bg-[#5B8DEF] text-black font-semibold border-[#5B8DEF]'
                  : 'bg-[#09090b] text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filteredEvents.map((ev) => (
          <div
            key={ev.id}
            className="tech-panel p-4 rounded-xl space-y-2 border border-zinc-800/80 hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <span
                className={
                  ev.event_type === 'Exam'
                    ? 'status-pill-rose'
                    : ev.event_type === 'Meeting'
                    ? 'status-pill-blue'
                    : 'status-pill-emerald'
                }
              >
                {ev.event_type.toUpperCase()}
              </span>

              <span className="font-mono text-[10px] text-zinc-400">
                {formatIndianDate(ev.start_date)}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white tracking-tight">
              {ev.title}
            </h3>

            {ev.description && (
              <p className="text-xs text-zinc-400 leading-relaxed">
                {ev.description}
              </p>
            )}

            <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>{formatDateRange(ev.start_date, ev.end_date, 'Single Day')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
