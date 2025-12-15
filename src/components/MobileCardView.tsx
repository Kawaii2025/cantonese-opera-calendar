import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Event } from '../api';
import { cityColors, troupeColors } from '../constants/colors';
import '../styles/mobile-card-view.css';

interface MobileCardViewProps {
  currentDate: dayjs.Dayjs;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onAddEvent?: (date: dayjs.Dayjs) => void;
}

export const MobileCardView: React.FC<MobileCardViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onAddEvent
}) => {
  const year = currentDate.year();
  const month = currentDate.month() + 1;

  // 按日期分组演出
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(event => {
      const dateKey = dayjs(event.date).format('YYYY-MM-DD');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  // 获取该月所有日期
  const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
  const dates = Array.from({ length: daysInMonth }, (_, i) => 
    dayjs(`${year}-${month}-${i + 1}`)
  );

  return (
    <div className="mobile-card-view">
      <div className="month-header">
        <h2>{year}年{month}月</h2>
      </div>

      <div className="events-list">
        {dates.map((date) => {
          const dateKey = date.format('YYYY-MM-DD');
          const dayEvents = eventsByDate.get(dateKey) || [];
          const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.day()];
          const isToday = date.isSame(dayjs(), 'day');

          if (dayEvents.length === 0) return null;

          return (
            <div key={dateKey} className={`date-section ${isToday ? 'today' : ''}`}>
              <div 
                className="date-header"
                onClick={() => onAddEvent?.(date)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="点击添加演出"
              >
                <span className="date-label">
                  {date.date()}日（周{dayName}）
                </span>
                <span className="event-count">{dayEvents.length}场</span>
              </div>

              <div className="event-cards">
                {dayEvents.map((event, idx) => {
                  const isAfternoon = event.type === 'afternoon';
                  const timeLabel = isAfternoon ? '下午场' : '晚场';
                  const troupeColor = troupeColors[event.troupe] || '#262626';
                  const cityColor = cityColors[event.city] || '';

                  const content = event.content.startsWith('《') && event.content.endsWith('》')
                    ? event.content
                    : `《${event.content}》`;

                  return (
                    <div
                      key={idx}
                      className="event-card"
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="card-header">
                        <div className="tags-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span
                            style={{ 
                              backgroundColor: troupeColor,
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '2px',
                              fontSize: '12px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {event.troupe}
                          </span>
                          <span 
                            style={{ 
                              backgroundColor: cityColor,
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '2px',
                              fontSize: '12px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {event.city}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                            {timeLabel}
                          </span>
                        </div>
                      </div>

                      <div className="card-content">
                        <p className="play-name">{content}</p>
                        <p className="location">
                          <span className="location-icon">📍</span>
                          {event.location}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="empty-state">
          <p>该月暂无演出安排</p>
        </div>
      )}
    </div>
  );
};
