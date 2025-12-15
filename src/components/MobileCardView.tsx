import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Tag, Flex } from 'antd';
import { Event } from '../api';
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

  // 颜色配置
  const cityColors: Record<string, string> = {
    广州: 'red',
    佛山: 'orange',
    深圳: 'magenta',
    东莞: 'volcano',
    茂名: 'gold',
    湛江: 'green',
    香港: 'purple',
    北海: 'cyan',
    珠海: 'blue',
  };

  const troupeColors: Record<string, string> = {
    广州团: '#2f54eb',
    佛山团: '#f5222d',
    红豆团: '#ff4d4f',
    省一团: '#faad14',
    省二团: '#a0d911',
    深圳团: '#eb2f96',
    珠海团: '#ffc53d',
    省院: '#fa541c',
  };

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
                  const timeColor = isAfternoon ? '#faad14' : '#1890ff';
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
                        <div className="tags-group">
                          <span
                            className="troupe-tag"
                            style={{ backgroundColor: troupeColor }}
                          >
                            {event.troupe}
                          </span>
                          <Tag color={cityColor}>{event.city}</Tag>
                          <span className="time-tag" style={{ color: timeColor }}>
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
