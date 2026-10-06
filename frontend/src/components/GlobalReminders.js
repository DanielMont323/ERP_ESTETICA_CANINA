import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { remindersAPI } from '../services/api';
import { Bell, X, ChevronDown, ChevronUp, Calendar, DollarSign, Package } from 'lucide-react';
import { formatCalendarDate } from '../helpers/dateUtils';

const GlobalReminders = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const [upcomingRes, dashboardRes] = await Promise.all([
          remindersAPI.getUpcoming(),
          remindersAPI.getDashboard()
        ]);

        const manualReminders = upcomingRes.data.data || [];
        const dashboardData = dashboardRes.data.data || {};

        // Combinar todos los recordatorios
        const allReminders = [
          ...manualReminders.map(r => ({
            id: r._id,
            type: 'manual',
            title: r.title,
            description: r.description || '',
            date: r.date,
            priority: r.priority,
            urgency: r.priority === 'alta' ? 'alta' : 'media'
          })),
          ...(dashboardData.accounts || []).map(r => ({
            id: r.id,
            type: 'cuenta',
            title: r.title,
            description: r.description,
            date: r.date,
            priority: r.priority,
            urgency: r.urgency
          })),
          ...(dashboardData.vaccines || []).map(r => ({
            id: r.id,
            type: 'vacuna',
            title: r.title,
            description: r.description,
            date: r.date,
            priority: r.priority,
            urgency: r.urgency
          }))
        ];

        // Ordenar por urgencia y fecha
        const urgencyOrder = { 'vencida': 0, 'hoy': 1, 'manana': 2, 'proxima': 3, 'alta': 1, 'media': 2, 'baja': 3 };
        allReminders.sort((a, b) => {
          if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
          }
          return new Date(a.date) - new Date(b.date);
        });

        setReminders(allReminders);
        setTotalCount(allReminders.length);
      } catch (error) {
        console.error('Error loading reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  // Detect mobile and set compact mode by default
  useEffect(() => {
    const checkMobile = () => {
      setIsCompactMode(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (loading || totalCount === 0) {
    return null;
  }

  const displayReminders = isMinimized ? [] : reminders.slice(0, 5);

  const getIcon = (type) => {
    switch (type) {
      case 'cuenta': return DollarSign;
      case 'vacuna': return Calendar;
      case 'manual': return Bell;
      default: return Bell;
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'vencida':
      case 'hoy':
      case 'alta':
        return 'text-danger-600 bg-danger-50 border-danger-200';
      case 'manana':
      case 'media':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      default:
        return 'text-success-600 bg-success-50 border-success-200';
    }
  };

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'vencida': return 'Vencida';
      case 'hoy': return 'Hoy';
      case 'manana': return 'Mañana';
      case 'proxima': return 'Próxima';
      case 'alta': return 'Alta';
      case 'media': return 'Media';
      case 'baja': return 'Baja';
      default: return '';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-30 w-80 max-w-[calc(100vw-2rem)]">
      {/* Compact Mode - Mobile Only */}
      {isCompactMode ? (
        <button
          onClick={() => setIsCompactMode(false)}
          className="bg-white dark:bg-dark-card rounded-full shadow-lg border border-gray-200 dark:border-dark-border p-3 hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2"
        >
          <Bell className="h-5 w-5 text-brand-burgundy" />
          <span className="font-semibold text-gray-900 dark:text-dark-text">{totalCount}</span>
        </button>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-dark-border">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-brand-burgundy" />
              <span className="font-semibold text-gray-900 dark:text-dark-text">
                Recordatorios ({totalCount})
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsCompactMode(true)}
                className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
                title="Minimizar"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="hidden md:block p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <>
              <div className="max-h-80 overflow-y-auto">
                {displayReminders.map((reminder) => {
                  const Icon = getIcon(reminder.type);
                  return (
                    <div
                      key={reminder.id}
                      className="p-3 border-b border-gray-100 dark:border-dark-border last:border-0 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getUrgencyColor(reminder.urgency)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-dark-text text-sm truncate">
                            {reminder.title}
                          </p>
                          {reminder.description && (
                            <p className="text-xs text-gray-500 dark:text-dark-textSecondary truncate">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-dark-textSecondary">
                              {formatCalendarDate(reminder.date)}
                            </span>
                            {reminder.urgency && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getUrgencyColor(reminder.urgency)}`}>
                                {getUrgencyText(reminder.urgency)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-200 dark:border-dark-border">
                <button
                  onClick={() => navigate('/reminders')}
                  className="w-full text-center text-sm text-brand-burgundy hover:text-brand-burgundy-dark font-medium py-2 px-4 rounded-lg hover:bg-brand-cream transition-colors"
                >
                  Ver recordatorios
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalReminders;
