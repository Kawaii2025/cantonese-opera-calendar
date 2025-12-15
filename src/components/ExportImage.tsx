import React, { useRef } from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Event } from '../api';
import '../styles/export-image.css';

interface ExportImageProps {
  events: Event[];
  currentDate: dayjs.Dayjs;
}

export const ExportImage: React.FC<ExportImageProps> = ({ events, currentDate }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    if (!contentRef.current) return;

    try {
      setLoading(true);
      const html2canvas = (await import('html2canvas')).default;

      // 创建临时容器来生成图片
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true,
      });

      // 下载图片
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `演出安排-${currentDate.format('YYYY年MM月')}.png`;
      link.click();

      message.success('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 颜色配置
  const cityColors: Record<string, string> = {
    广州: '#ff4d4f',
    佛山: '#ff7a45',
    深圳: '#eb2f96',
    东莞: '#fa541c',
    茂名: '#faad14',
    湛江: '#52c41a',
    香港: '#722ed1',
    珠海: '#1890ff',
    中山: '#13c2c2',
  };

  const troupeColors: Record<string, string> = {
    '广州团': '#d4af37',
    '佛山团': '#ff7a45',
    '深圳团': '#eb2f96',
    '珠海团': '#1890ff',
    '东莞团': '#fa541c',
    '茂名团': '#faad14',
    '湛江团': '#52c41a',
    '香港团': '#722ed1',
  };

  // 按日期分组演出
  const eventsByDate = React.useMemo(() => {
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

  const year = currentDate.year();
  const month = currentDate.month() + 1;
  const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    dayjs(`${year}-${month}-${i + 1}`)
  );

  return (
    <div>
      <Button
        icon={<DownloadOutlined />}
        loading={loading}
        onClick={handleExport}
        type="primary"
        style={{ marginRight: 8 }}
      >
        导出长图
      </Button>

      {/* 隐藏的导出内容 */}
      <div
        ref={contentRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '375px',
        }}
      >
        <div className="export-content">
          <div className="export-header">
            <h1 className="export-title">粤剧演出安排</h1>
            <p className="export-date">{currentDate.format('YYYY年MM月')}</p>
          </div>

          <div className="export-events">
            {dates.map(date => {
              const dateKey = date.format('YYYY-MM-DD');
              const dayEvents = eventsByDate.get(dateKey) || [];
              const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.day()];

              if (dayEvents.length === 0) return null;

              return (
                <div key={dateKey} className="export-date-section">
                  <div className="export-date-header">
                    <span className="export-date-label">
                      {date.date()}日 周{dayName}
                    </span>
                    <span className="export-event-count">{dayEvents.length}场</span>
                  </div>

                  {dayEvents.map((event, idx) => {
                    const isAfternoon = event.type === 'afternoon';
                    const timeLabel = isAfternoon ? '下午场' : '晚场';
                    const troupeColor = troupeColors[event.troupe] || '#262626';
                    const cityColor = cityColors[event.city] || '#000000';

                    const content = event.content.startsWith('《') && event.content.endsWith('》')
                      ? event.content
                      : `《${event.content}》`;

                    return (
                      <div key={idx} className="export-event-item">
                        <div className="export-event-tags">
                          <span
                            className="export-troupe-tag"
                            style={{ backgroundColor: troupeColor }}
                          >
                            {event.troupe}
                          </span>
                          <span
                            className="export-city-tag"
                            style={{ color: cityColor }}
                          >
                            {event.city}
                          </span>
                          <span className="export-time-tag" style={{ color: isAfternoon ? '#faad14' : '#1890ff' }}>
                            {timeLabel}
                          </span>
                        </div>
                        <p className="export-play-name">{content}</p>
                        <p className="export-location">📍 {event.location}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="export-footer">
            <p>Generated on {dayjs().format('YYYY-MM-DD HH:mm')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
