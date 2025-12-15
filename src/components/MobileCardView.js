import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Tag } from 'antd';
import '../styles/mobile-card-view.css';
export const MobileCardView = ({ currentDate, events, onEventClick, onAddEvent }) => {
    const year = currentDate.year();
    const month = currentDate.month() + 1;
    // 按日期分组演出
    const eventsByDate = useMemo(() => {
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
    // 获取该月所有日期
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    const dates = Array.from({ length: daysInMonth }, (_, i) => dayjs(`${year}-${month}-${i + 1}`));
    // 颜色配置
    const cityColors = {
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
    const troupeColors = {
        广州团: '#2f54eb',
        佛山团: '#f5222d',
        红豆团: '#ff4d4f',
        省一团: '#faad14',
        省二团: '#a0d911',
        深圳团: '#eb2f96',
        珠海团: '#ffc53d',
        省院: '#fa541c',
    };
    return (_jsxs("div", { className: "mobile-card-view", children: [_jsx("div", { className: "month-header", children: _jsxs("h2", { children: [year, "\u5E74", month, "\u6708"] }) }), _jsx("div", { className: "events-list", children: dates.map((date) => {
                    const dateKey = date.format('YYYY-MM-DD');
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.day()];
                    const isToday = date.isSame(dayjs(), 'day');
                    if (dayEvents.length === 0)
                        return null;
                    return (_jsxs("div", { className: `date-section ${isToday ? 'today' : ''}`, children: [_jsxs("div", { className: "date-header", onClick: () => onAddEvent?.(date), style: { cursor: 'pointer', userSelect: 'none' }, title: "\u70B9\u51FB\u6DFB\u52A0\u6F14\u51FA", children: [_jsxs("span", { className: "date-label", children: [date.date(), "\u65E5\uFF08\u5468", dayName, "\uFF09"] }), _jsxs("span", { className: "event-count", children: [dayEvents.length, "\u573A"] })] }), _jsx("div", { className: "event-cards", children: dayEvents.map((event, idx) => {
                                    const isAfternoon = event.type === 'afternoon';
                                    const timeLabel = isAfternoon ? '下午场' : '晚场';
                                    const troupeColor = troupeColors[event.troupe] || '#262626';
                                    const cityColor = cityColors[event.city] || '';
                                    const content = event.content.startsWith('《') && event.content.endsWith('》')
                                        ? event.content
                                        : `《${event.content}》`;
                                    return (_jsxs("div", { className: "event-card", onClick: () => onEventClick?.(event), children: [_jsx("div", { className: "card-header", children: _jsxs("div", { className: "tags-group", children: [_jsx("span", { className: "troupe-tag", style: { backgroundColor: troupeColor }, children: event.troupe }), _jsx(Tag, { color: cityColor, children: event.city }), _jsx("span", { style: { fontSize: '12px', color: '#666' }, children: timeLabel })] }) }), _jsxs("div", { className: "card-content", children: [_jsx("p", { className: "play-name", children: content }), _jsxs("p", { className: "location", children: [_jsx("span", { className: "location-icon", children: "\uD83D\uDCCD" }), event.location] })] })] }, idx));
                                }) })] }, dateKey));
                }) }), events.length === 0 && (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "\u8BE5\u6708\u6682\u65E0\u6F14\u51FA\u5B89\u6392" }) }))] }));
};
