import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Calendar, ConfigProvider, Flex, Tag, Layout, Select, Radio, Modal, Spin, Alert } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import { usePageScroll } from './hooks/usePageScroll';
import { api } from './api';
import './style.css';
const defaultDate = new Date(2025, 2, 1);
let filter = (data) => data;
const getMonthData = (value) => {
    if (value.month() === 8) {
        return 1394;
    }
};
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    const RootApp = () => {
        const [currentDate, setCurrentDate] = useState(dayjs(defaultDate));
        const [modalVisible, setModalVisible] = useState(false);
        usePageScroll(currentDate, setCurrentDate, modalVisible);
        const year = currentDate.year();
        const month = currentDate.month();
        const yearOptions = Array.from({ length: 10 }, (_, i) => ({
            label: `${year - 5 + i}年`,
            value: year - 5 + i,
        }));
        const monthOptions = Array.from({ length: 12 }, (_, i) => ({
            label: dayjs().month(i).format('MMM'),
            value: i,
        }));
        return (_jsxs(Layout, { style: { minHeight: '100vh' }, children: [_jsx(Layout.Header, { className: "app-header", children: _jsxs("div", { className: "header-content", children: [_jsx("h1", { className: "header-title", children: "2025\u5E74\u7CA4\u5267\u6625\u73ED\u65E5\u5386" }), _jsxs("div", { className: "header-date-controls", children: [_jsx(Select, { value: year, options: yearOptions, onChange: (newYear) => setCurrentDate(currentDate.year(newYear)), style: { width: 100 } }), _jsx(Select, { value: month, options: monthOptions, onChange: (newMonth) => setCurrentDate(currentDate.month(newMonth)), style: { width: 80 } }), _jsxs(Radio.Group, { value: "month", buttonStyle: "solid", children: [_jsx(Radio.Button, { value: "month", children: "\u6708" }), _jsx(Radio.Button, { value: "year", children: "\u5E74" })] })] })] }) }), _jsx(Layout.Content, { style: { paddingTop: 0 }, children: _jsx(CalendarApp, { currentDate: currentDate, onDateChange: setCurrentDate, modalVisible: modalVisible, setModalVisible: setModalVisible }) })] }));
    };
    const CalendarApp = ({ currentDate, onDateChange, modalVisible, setModalVisible }) => {
        const [selectedDate, setSelectedDate] = useState(null);
        const [selectedEvents, setSelectedEvents] = useState([]);
        const [events, setEvents] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);
        // Fetch events for the current month
        const fetchMonthData = async (date) => {
            try {
                setLoading(true);
                setError(null);
                const year = date.year();
                const month = date.month() + 1; // dayjs months are 0-indexed
                const data = await api.getEventsByMonth(year, month);
                setEvents(data);
            }
            catch (err) {
                console.error('Failed to fetch events:', err);
                setError('加载演出数据失败，请稍后重试');
            }
            finally {
                setLoading(false);
            }
        };
        // Fetch data when component mounts or month changes
        useEffect(() => {
            fetchMonthData(currentDate);
        }, [currentDate.year(), currentDate.month()]);
        // Build a map of events by date for quick lookup
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
        const monthCellRender = (value) => {
            const num = getMonthData(value);
            return num ? (_jsxs("div", { className: "notes-month", children: [_jsxs("section", { children: [num, " "] }), _jsx("span", { children: " Backlog number " })] })) : null;
        };
        const cityRender = (city) => {
            const map = {
                广州: 'red',
                佛山: 'orange',
                深圳: 'magenta',
                东莞: 'volcano',
                茂名: 'gold',
                湛江: 'green',
                香港: 'purple',
                北海: 'cyan',
            };
            const color = map[city] || '';
            return _jsxs(Tag, { color: color, children: [" ", city || ''] });
        };
        const troupeRender = (troupe) => {
            const map = {
                广州团: { color: '#2f54eb', name: '广州团' },
                佛山团: { color: '#f5222d', name: '佛山团' },
                红豆团: { color: '#ff4d4f', name: '红豆团' },
                省一团: { color: '#faad14', name: '省一团' },
                省二团: { color: '#a0d911', name: '省二团' },
                深圳团: { color: '#eb2f96', name: '深圳团' },
                省院: { color: '#fa541c', name: '省院' },
            };
            const { color, name } = map[troupe] || { color: '', name: '' };
            return _jsxs(Tag, { color: color, children: [" ", name || ''] });
        };
        const locationRender = (location) => {
            return _jsxs(Tag, { color: "blue", children: [" ", location || ''] });
        };
        const dateCellRender = (value) => {
            const dateKey = value.format('YYYY-MM-DD');
            const listData = eventsByDate.get(dateKey) || [];
            const displayData = listData.slice(0, 3);
            const remainingCount = listData.length - 3;
            const handleCellClick = () => {
                if (listData.length > 0) {
                    setSelectedDate(value);
                    setSelectedEvents(listData);
                    setModalVisible(true);
                }
            };
            const renderItem = (item, index) => (_jsxs("li", { className: "item-troupe", children: [_jsxs(Flex, { gap: "4px 0", wrap: true, children: [troupeRender(item.troupe), cityRender(item.city), locationRender(item.location)] }), _jsx("span", { className: "item-content item-play-name", children: item.content })] }, index));
            return (_jsx("div", { onClick: handleCellClick, className: "date-cell-content", children: _jsxs("ul", { className: "events", children: [displayData.map((item, index) => renderItem(item, index)), remainingCount > 0 && (_jsxs("li", { className: "more-events", children: ["\u8FD8\u6709 ", remainingCount, " \u573A..."] }))] }) }));
        };
        const cellRender = (current, info) => {
            if (info.type === 'date')
                return dateCellRender(current);
            if (info.type === 'month')
                return monthCellRender(current);
            return info.originNode;
        };
        return (_jsxs("div", { className: "calendar-wrapper", children: [error && (_jsx(Alert, { message: "\u9519\u8BEF", description: error, type: "error", showIcon: true, closable: true, onClose: () => setError(null), style: { marginBottom: 16 } })), _jsx(Spin, { spinning: loading, tip: "\u52A0\u8F7D\u4E2D...", children: _jsx(Calendar, { cellRender: cellRender, value: currentDate, onChange: onDateChange, fullscreen: true, headerRender: () => null }) }), _jsx(Modal, { title: selectedDate ? `${selectedDate.format('YYYY年MM月DD日')} 演出安排` : '演出安排', open: modalVisible, onCancel: () => setModalVisible(false), footer: null, width: 700, className: "event-modal", children: _jsx("div", { className: "modal-events-list", children: selectedEvents.map((item, index) => (_jsxs("div", { className: "modal-event-item", children: [_jsx("div", { className: "modal-event-header", children: _jsxs(Flex, { gap: "4px 0", wrap: true, children: [troupeRender(item.troupe), cityRender(item.city), locationRender(item.location)] }) }), _jsx("div", { className: "modal-event-content", children: _jsx("strong", { children: item.content }) }), item.type && (_jsx("div", { className: "modal-event-time", children: item.type === 'afternoon' ? '下午场' : '晚场' }))] }, index))) }) })] }));
    };
    root.render(_jsx(ConfigProvider, { locale: zhCN, children: _jsx(RootApp, {}) }));
}
