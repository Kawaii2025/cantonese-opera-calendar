import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef } from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import '../styles/export-image.css';
export const ExportImage = ({ events, currentDate }) => {
    const contentRef = useRef(null);
    const [loading, setLoading] = React.useState(false);
    const handleExport = async () => {
        if (!contentRef.current)
            return;
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
        }
        catch (error) {
            console.error('导出失败:', error);
            message.error('导出失败，请重试');
        }
        finally {
            setLoading(false);
        }
    };
    // 颜色配置
    const cityColors = {
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
    const troupeColors = {
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
        const map = new Map();
        events.forEach(event => {
            const dateKey = dayjs(event.date).format('YYYY-MM-DD');
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey).push(event);
        });
        return map;
    }, [events]);
    const year = currentDate.year();
    const month = currentDate.month() + 1;
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    const dates = Array.from({ length: daysInMonth }, (_, i) => dayjs(`${year}-${month}-${i + 1}`));
    return (_jsxs("div", { children: [_jsx(Button, { icon: _jsx(DownloadOutlined, {}), loading: loading, onClick: handleExport, type: "primary", style: { marginRight: 8 }, children: "\u5BFC\u51FA\u957F\u56FE" }), _jsx("div", { ref: contentRef, style: {
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px',
                    width: '375px',
                }, children: _jsxs("div", { className: "export-content", children: [_jsxs("div", { className: "export-header", children: [_jsx("h1", { className: "export-title", children: "\u7CA4\u5267\u6F14\u51FA\u5B89\u6392" }), _jsx("p", { className: "export-date", children: currentDate.format('YYYY年MM月') })] }), _jsx("div", { className: "export-events", children: dates.map(date => {
                                const dateKey = date.format('YYYY-MM-DD');
                                const dayEvents = eventsByDate.get(dateKey) || [];
                                const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.day()];
                                if (dayEvents.length === 0)
                                    return null;
                                return (_jsxs("div", { className: "export-date-section", children: [_jsxs("div", { className: "export-date-header", children: [_jsxs("span", { className: "export-date-label", children: [date.date(), "\u65E5 \u5468", dayName] }), _jsxs("span", { className: "export-event-count", children: [dayEvents.length, "\u573A"] })] }), dayEvents.map((event, idx) => {
                                            const isAfternoon = event.type === 'afternoon';
                                            const timeLabel = isAfternoon ? '下午场' : '晚场';
                                            const troupeColor = troupeColors[event.troupe] || '#262626';
                                            const cityColor = cityColors[event.city] || '#000000';
                                            const content = event.content.startsWith('《') && event.content.endsWith('》')
                                                ? event.content
                                                : `《${event.content}》`;
                                            return (_jsxs("div", { className: "export-event-item", children: [_jsxs("div", { className: "export-event-tags", children: [_jsx("span", { className: "export-troupe-tag", style: { backgroundColor: troupeColor }, children: event.troupe }), _jsx("span", { className: "export-city-tag", style: { color: cityColor }, children: event.city }), _jsx("span", { className: "export-time-tag", style: { color: isAfternoon ? '#faad14' : '#1890ff' }, children: timeLabel })] }), _jsx("p", { className: "export-play-name", children: content }), _jsxs("p", { className: "export-location", children: ["\uD83D\uDCCD ", event.location] })] }, idx));
                                        })] }, dateKey));
                            }) }), _jsx("div", { className: "export-footer", children: _jsxs("p", { children: ["Generated on ", dayjs().format('YYYY-MM-DD HH:mm')] }) })] }) })] }));
};
