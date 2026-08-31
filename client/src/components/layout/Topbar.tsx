import React, { useState, useEffect } from 'react';
import { Bell, Search, LogOut, CheckCheck, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Notification } from '../../types';

interface Props {
  onNavigateToTab?: (tab: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Topbar: React.FC<Props> = ({ onNavigateToTab, onToggleMobileMenu }) => {
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const loadNotifications = async () => {
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (e) {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Mobile Hamburger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label="Open Navigation Menu"
            className="lg:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers, tenders, contracts, POs..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Identity Info Pill */}
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
            {user?.first_name?.[0] || 'U'}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-white leading-tight">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold leading-tight">
              {user?.role} {user?.supplier_name ? `• ${user.supplier_name}` : ''}
            </p>
          </div>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-72 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto mt-2 space-y-2">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border text-xs transition-colors ${
                          n.is_read
                            ? 'bg-slate-800/30 border-slate-800/60 text-slate-400'
                            : 'bg-blue-950/30 border-blue-500/30 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-white text-xs">{n.title}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500">No notifications yet.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-slate-750 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
