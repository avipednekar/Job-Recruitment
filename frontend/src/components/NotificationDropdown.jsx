import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { HiOutlineBell } from "react-icons/hi";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../services/api";
import { cn } from "../utils/cn";

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUserNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      if (res.data?.success) {
        setNotifications(res.data.notifications);
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch notifications initially
    fetchUserNotifications();

    // Setup polling every 30 seconds for new notifications
    const intervalId = setInterval(fetchUserNotifications, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleNotificationClick = async (id, isRead) => {
    if (!isRead) {
      try {
        await markNotificationRead(id);
        setNotifications(notifications.map(n => 
          n._id === id ? { ...n, isRead: true } : n
        ));
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
    }
    setIsOpen(false);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // in seconds
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-lighter rounded-full transition-colors"
        aria-label="Notifications"
      >
        <HiOutlineBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 grid place-items-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-surface">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-lighter">
            <h3 className="font-semibold text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-text-tertiary text-sm">Loading...</div>
            ) : notifications.length > 0 ? (
              <div className="flex flex-col">
                {notifications.map((notification) => {
                  const content = (
                    <div 
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification._id, notification.isRead)}
                      className={cn(
                        "p-4 border-b border-border/50 transition-colors cursor-pointer hover:bg-surface-lighter",
                        !notification.isRead ? "bg-primary/5" : "bg-transparent"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm mb-1 line-clamp-2", 
                            !notification.isRead ? "text-text-primary font-medium" : "text-text-secondary"
                          )}>
                            {notification.message}
                          </p>
                          <span className="text-xs text-text-tertiary">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <div className="flex-shrink-0 mt-1.5">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  );

                  return notification.link ? (
                    <Link to={notification.link} key={notification._id}>
                      {content}
                    </Link>
                  ) : (
                    content
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center">
                <HiOutlineBell className="w-10 h-10 text-text-tertiary mb-3 opacity-50" />
                <p className="text-sm text-text-secondary font-medium">No notifications yet</p>
                <p className="text-xs text-text-tertiary mt-1">We'll let you know when something important happens.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
