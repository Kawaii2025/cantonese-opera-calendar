import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { cityColors, troupeColors } from '../constants/colors';
import '../styles/mobile-card-view.css';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
export const MobileCardView = ({ currentDate, events, onEventClick, onAddEvent }) => {
    const [selectedTroupe, setSelectedTroupe] = useState(null);
    const [startDay, setStartDay] = useState(null);
    const [endDay, setEndDay] = useState(null);
    const year = currentDate.year();
    const month = currentDate.month() + 1;
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    // 获取所有剧团列表
    const troupeList = useMemo(() => {
        const troupes = new Set(events.map(e => e.troupe));
        return Array.from(troupes).sort();
    }, [events]);
    // 根据筛选条件过滤演出
    const filteredEvents = useMemo(() => {
        let filtered = events;
        if (selectedTroupe) {
            filtered = filtered.filter(event => event.troupe === selectedTroupe);
        }
        if (startDay !== null) {
            const startDate = dayjs(`${year}-${month}-${startDay}`);
            filtered = filtered.filter(event => dayjs(event.date).isSameOrAfter(startDate, 'day'));
        }
        if (endDay !== null) {
            const endDate = dayjs(`${year}-${month}-${endDay}`);
            filtered = filtered.filter(event => dayjs(event.date).isSameOrBefore(endDate, 'day'));
        }
        return filtered;
    }, [events, selectedTroupe, startDay, endDay, year, month]);
    // 按日期分组演出
    const eventsByDate = useMemo(() => {
        const map = new Map();
        filteredEvents.forEach(event => {
            const dateKey = dayjs(event.date).format('YYYY-MM-DD');
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey).push(event);
        });
        return map;
    }, [filteredEvents]);
    // 获取该月所有日期
    const dates = Array.from({ length: daysInMonth }, (_, i) => dayjs(`${year}-${month}-${i + 1}`));
    return (_jsxs("div", { className: "mobile-card-view", children: [_jsx("div", { className: "month-header", children: _jsxs("h2", { children: [year, "\u5E74", month, "\u6708"] }) }), _jsxs("div", { className: "troupe-filter", children: [_jsx("button", { className: `filter-button ${!selectedTroupe ? 'active' : ''}`, onClick: () => setSelectedTroupe(null), children: "\u5168\u90E8" }), troupeList.map((troupe) => {
                        const troupeColor = troupeColors[troupe] || '#262626';
                        return (_jsx("button", { className: `filter-button ${selectedTroupe === troupe ? 'active' : ''}`, onClick: () => setSelectedTroupe(troupe), style: selectedTroupe === troupe
                                ? { backgroundColor: troupeColor, color: 'white', borderColor: troupeColor }
                                : { borderColor: troupeColor, color: troupeColor }, children: troupe }, troupe));
                    })] }), _jsxs("div", { className: "date-range-filter", children: [_jsxs("div", { className: "date-select-group", children: [_jsx("label", { htmlFor: "start-day", children: "\u4ECE" }), _jsxs("select", { id: "start-day", value: startDay === null ? '' : startDay, onChange: (e) => setStartDay(e.target.value ? parseInt(e.target.value) : null), children: [_jsx("option", { value: "", children: "\u5168\u90E8" }), Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (_jsxs("option", { value: day, children: [day, "\u65E5"] }, day)))] })] }), _jsxs("div", { className: "date-select-group", children: [_jsx("label", { htmlFor: "end-day", children: "\u81F3" }), _jsxs("select", { id: "end-day", value: endDay === null ? '' : endDay, onChange: (e) => setEndDay(e.target.value ? parseInt(e.target.value) : null), children: [_jsx("option", { value: "", children: "\u5168\u90E8" }), Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (_jsxs("option", { value: day, children: [day, "\u65E5"] }, day)))] })] }), (startDay !== null || endDay !== null) && (_jsx("button", { className: "clear-date-button", onClick: () => {
                            setStartDay(null);
                            setEndDay(null);
                        }, children: "\u6E05\u9664" }))] }), _jsx("div", { className: "events-list", children: dates.map((date) => {
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
                                    return (_jsxs("div", { className: "event-card", onClick: () => onEventClick?.(event), children: [_jsx("div", { className: "card-header", children: _jsxs("div", { className: "tags-group", style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsx("span", { style: {
                                                                backgroundColor: troupeColor,
                                                                color: 'white',
                                                                padding: '4px 8px',
                                                                borderRadius: '2px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap'
                                                            }, children: event.troupe }), _jsx("span", { style: {
                                                                backgroundColor: cityColor,
                                                                color: 'white',
                                                                padding: '4px 8px',
                                                                borderRadius: '2px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap'
                                                            }, children: event.city }), _jsx("span", { style: { fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }, children: timeLabel })] }) }), _jsxs("div", { className: "card-content", children: [_jsx("p", { className: "play-name", children: content }), _jsxs("p", { className: "location", children: [_jsx("span", { className: "location-icon", children: "\uD83D\uDCCD" }), event.location] })] })] }, idx));
                                }) })] }, dateKey));
                }) }), events.length === 0 && (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "\u8BE5\u6708\u6682\u65E0\u6F14\u51FA\u5B89\u6392" }) }))] }));
};
