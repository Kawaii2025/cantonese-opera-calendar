import React from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Event } from '../api';

interface ExportImageProps {
  events: Event[];
  currentDate: dayjs.Dayjs;
}

export const ExportImage: React.FC<ExportImageProps> = ({ events, currentDate }) => {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    // 查找calendar-wrapper中的内容（excluding the button itself）
    const calendarWrapper = document.querySelector('.calendar-wrapper');
    if (!calendarWrapper) {
      message.error('找不到日历内容');
      return;
    }

    // 找到Spin内的内容
    const contentDiv = calendarWrapper.querySelector('.ant-spin-container');
    if (!contentDiv) {
      message.error('找不到可导出的内容');
      return;
    }

    try {
      setLoading(true);
      const html2canvas = (await import('html2canvas')).default;

      // 临时隐藏筛选区域
      const troupeFilter = contentDiv.querySelector('.troupe-filter') as HTMLElement;
      const dateRangeFilter = contentDiv.querySelector('.date-range-filter') as HTMLElement;
      const originalTroupeDisplay = troupeFilter?.style.display;
      const originalDateDisplay = dateRangeFilter?.style.display;

      if (troupeFilter) troupeFilter.style.display = 'none';
      if (dateRangeFilter) dateRangeFilter.style.display = 'none';

      // 导出当前显示的内容
      const canvas = await html2canvas(contentDiv as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true,
      });

      // 恢复筛选区域显示
      if (troupeFilter) troupeFilter.style.display = originalTroupeDisplay || '';
      if (dateRangeFilter) dateRangeFilter.style.display = originalDateDisplay || '';

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

  return (
    <Button
      icon={<DownloadOutlined />}
      loading={loading}
      onClick={handleExport}
      type="primary"
      style={{ marginRight: 8 }}
    >
      导出
    </Button>
  );
};
