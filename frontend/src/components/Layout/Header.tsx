import React, { useState, useEffect } from 'react';
import { Bell, Search, Plus, Calendar, Clock, Terminal, ChevronDown } from 'lucide-react';
import type { AppNotification, Profile } from '../../types/database';
import { formatIndianDate } from '../../utils/dateUtils';

interface HeaderProps {
  pageTitle: string;
  onOpenNewTask: () => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  currentProfile: Profile | null;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  onOpenNewTask,
  notifications,
  onMarkNotificationRead,
  currentProfile
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>(() => formatIndianDate(new Date()));
  const unreadList = notifications.filter((n) => !n.is_read);

  // Synchronize current calendar date in IST
  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(formatIndianDate(new Date()));
    };
    updateDate();
    const interval = setInterval(updateDate, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[#060609]/90 backdrop-blur-md border-b border-zinc-800/80 px-6 flex items-center justify-between shrink-0 select-none z-10">
      {/* Title & Live Time Status */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>{pageTitle}</span>
            <span className="text-zinc-600 font-mono text-xs">/</span>
            <span className="text-[11px] font-mono text-[#5B8DEF] font-normal">
              {currentProfile?.full_name || 'Academic Terminal'}
            </span>
          </h2>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#09090b] border border-zinc-800 text-[10px] font-mono text-zinc-400">
          <Calendar className="w-3 h-3 text-[#5B8DEF]" />
          <span>{currentDate}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-[#09090b] text-zinc-400 hover:text-white hover:border-zinc-700 relative transition-all"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadList.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#f43f5e] text-white text-[8px] font-mono font-bold rounded-full flex items-center justify-center">
                {unreadList.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0c0c10] border border-zinc-800 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 font-sans">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-2">
                <span className="text-xs font-bold text-white">Academic Notifications</span>
                <span className="text-[10px] text-zinc-500 font-mono">{unreadList.length} unread</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4 font-mono">No events</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onMarkNotificationRead(n.id)}
                      className={`p-2.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                        n.is_read
                          ? 'bg-[#09090b]/50 border-zinc-900 text-zinc-500'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[11px] truncate">{n.title}</span>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#5B8DEF]" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">{n.message}</p>
                      {n.created_at && (
                        <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
                          {formatIndianDate(n.created_at)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenNewTask}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black rounded-lg text-xs font-semibold transition-all shadow-md shadow-[#5B8DEF]/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
};
