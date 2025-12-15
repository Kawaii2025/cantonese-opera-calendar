import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, Flex, Tag, Layout, Select, Button, Radio, Modal, Spin, Alert, Form, Input, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import { CustomCalendar } from './components/CustomCalendar';
import { MobileCardView } from './components/MobileCardView';
import { ExportImage } from './components/ExportImage';
import { api } from './api';
import './style.css';
import './styles/custom-calendar.css';
import './styles/mobile.css';
import './styles/mobile-card-view.css';
import './styles/export-image.css';
const defaultDate = dayjs(); // 默认打开当前月份
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
        const [currentDate, setCurrentDate] = useState(defaultDate);
        const [modalVisible, setModalVisible] = useState(false);
        const [viewMode, setViewMode] = useState('calendar');
        const [events, setEvents] = useState([]);
        // 暂时禁用滚动翻页功能
        // usePageScroll(currentDate, setCurrentDate, modalVisible);
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
        return (_jsxs(Layout, { style: { minHeight: '100vh' }, children: [_jsx(Layout.Header, { className: "app-header", children: _jsxs("div", { className: "header-content", children: [_jsx("h1", { className: "header-title", children: "2025\u5E74\u7CA4\u5267\u6625\u73ED\u65E5\u5386" }), _jsxs("div", { className: "header-date-controls", children: [_jsx(Select, { value: year, options: yearOptions, onChange: (newYear) => setCurrentDate(currentDate.year(newYear)), style: { width: 100 } }), _jsx(Select, { value: month, options: monthOptions, onChange: (newMonth) => setCurrentDate(currentDate.month(newMonth)), style: { width: 80 } }), _jsx(ExportImage, { events: events, currentDate: currentDate }), _jsxs(Radio.Group, { value: viewMode, onChange: (e) => setViewMode(e.target.value), buttonStyle: "solid", children: [_jsx(Radio.Button, { value: "calendar", children: "\u65E5\u5386" }), _jsx(Radio.Button, { value: "list", children: "\u5217\u8868" })] })] })] }) }), _jsx(Layout.Content, { style: { paddingTop: 0 }, children: _jsx(CalendarApp, { currentDate: currentDate, onDateChange: setCurrentDate, modalVisible: modalVisible, setModalVisible: setModalVisible, viewMode: viewMode, onEventsChange: setEvents }) })] }));
    };
    const CalendarApp = ({ currentDate, onDateChange, modalVisible, setModalVisible, viewMode, onEventsChange }) => {
        const [selectedDate, setSelectedDate] = useState(null);
        const [selectedEvents, setSelectedEvents] = useState([]);
        const [events, setEvents] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);
        const [editingDate, setEditingDate] = useState(null);
        const [editModalVisible, setEditModalVisible] = useState(false);
        const [editForm] = Form.useForm();
        const [submitting, setSubmitting] = useState(false);
        const lastClickRef = useRef(null);
        // Fetch events for the current month
        const fetchMonthData = async (date) => {
            try {
                setLoading(true);
                setError(null);
                const year = date.year();
                const month = date.month() + 1; // dayjs months are 0-indexed
                const data = await api.getEventsByMonth(year, month);
                setEvents(data);
                onEventsChange?.(data);
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
        const handleEditSubmit = async (values) => {
            if (!editingDate)
                return;
            try {
                setSubmitting(true);
                const newEvent = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: editingDate.format('YYYY-MM-DD'),
                    troupe: values.troupe,
                    city: values.city,
                    location: values.location,
                    content: values.content,
                    type: values.type || 'evening',
                };
                await api.createEvent(newEvent);
                message.success('演出信息添加成功');
                // Refresh the month data
                await fetchMonthData(currentDate);
                setEditModalVisible(false);
                editForm.resetFields();
            }
            catch (err) {
                console.error('Failed to add event:', err);
                message.error('添加演出信息失败，请重试');
            }
            finally {
                setSubmitting(false);
            }
        };
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
        const handleCellClick = useCallback((value) => {
            const dateKey = value.format('YYYY-MM-DD');
            const listData = eventsByDate.get(dateKey) || [];
            const now = Date.now();
            const last = lastClickRef.current;
            // 检测双击 (300ms 内两次点击)
            if (last && last.date === dateKey && now - last.time < 300) {
                // 双击 - 进入编辑模式
                setSelectedDate(value);
                setEditingDate(value);
                setEditModalVisible(true);
                lastClickRef.current = null;
            }
            else {
                // 单击 - 记录点击信息，等待可能的第二次点击
                lastClickRef.current = { date: dateKey, time: now };
                // 延迟300ms后，如果没有第二次点击则显示详情
                setTimeout(() => {
                    // 检查是否已经触发了双击
                    if (lastClickRef.current && lastClickRef.current.date === dateKey && lastClickRef.current.time === now) {
                        if (listData.length > 0) {
                            setSelectedDate(value);
                            setSelectedEvents(listData);
                            setModalVisible(true);
                        }
                    }
                }, 300);
            }
        }, [eventsByDate]);
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
                珠海: 'blue',
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
                珠海团: { color: '#ffc53d', name: '珠海团' },
                省院: { color: '#fa541c', name: '省院' },
            };
            const { color, name } = map[troupe] || { color: '', name: '' };
            return _jsxs(Tag, { color: color, children: [" ", name || ''] });
        };
        const locationRender = (location) => {
            return _jsxs(Tag, { color: "red", children: [" ", location || ''] });
        };
        const dateCellRender = (value) => {
            const dateKey = value.format('YYYY-MM-DD');
            const listData = eventsByDate.get(dateKey) || [];
            const displayData = listData.slice(0, 2);
            const remainingCount = listData.length - 2;
            const renderItem = (item, index) => {
                // 如果剧目没有书名号，则添加
                const content = item.content.startsWith('《') && item.content.endsWith('》')
                    ? item.content
                    : `《${item.content}》`;
                // 根据type字段确定显示的时间标签
                const isAfternoon = item.type === 'afternoon';
                const timeLabel = isAfternoon ? '下午场' : '晚场';
                return (_jsxs("li", { className: "item-troupe", children: [_jsxs(Flex, { gap: "4px 0", wrap: true, children: [troupeRender(item.troupe), cityRender(item.city), _jsx("span", { style: { fontSize: '12px', color: '#666' }, children: timeLabel }), locationRender(item.location)] }), _jsx("span", { className: "item-content item-play-name", children: content })] }, index));
            };
            return (_jsx("div", { className: "date-cell-content", style: {
                    cursor: 'pointer',
                    userSelect: 'none',
                    minHeight: '0px',
                    padding: '2px'
                }, title: "\u5355\u51FB\u67E5\u770B\u8BE6\u60C5\uFF0C\u53CC\u51FB\u6DFB\u52A0\u6F14\u51FA", children: _jsxs("ul", { className: "events", children: [displayData.map((item, index) => renderItem(item, index)), remainingCount > 0 && (_jsxs("li", { className: "more-events", children: ["\u8FD8\u6709 ", remainingCount, " \u573A..."] }))] }) }));
        };
        const cellRender = (current, info) => {
            if (info.type === 'date')
                return dateCellRender(current);
            if (info.type === 'month')
                return monthCellRender(current);
            return info.originNode;
        };
        return (_jsxs("div", { className: "calendar-wrapper", children: [_jsx(ExportImage, { events: events, currentDate: currentDate }), error && (_jsx(Alert, { message: "\u9519\u8BEF", description: error, type: "error", showIcon: true, closable: true, onClose: () => setError(null), style: { marginBottom: 16 } })), _jsx(Spin, { spinning: loading, tip: "\u52A0\u8F7D\u4E2D...", children: viewMode === 'calendar' ? (_jsx(CustomCalendar, { cellRender: (date) => dateCellRender(date), value: currentDate, onChange: onDateChange, onCellClick: handleCellClick })) : (_jsx(MobileCardView, { currentDate: currentDate, events: events, onEventClick: (event) => {
                            setSelectedEvents([event]);
                            setSelectedDate(dayjs(event.date));
                            setModalVisible(true);
                        }, onAddEvent: (date) => {
                            setEditingDate(dayjs(date));
                            setEditModalVisible(true);
                        } })) }), _jsx(Modal, { title: selectedDate ? `${selectedDate.format('YYYY年MM月DD日')} 演出安排` : '演出安排', open: modalVisible, onCancel: () => setModalVisible(false), footer: null, width: 700, className: "event-modal", children: _jsx("div", { className: "modal-events-list", children: selectedEvents.map((item, index) => {
                            const content = item.content.startsWith('《') && item.content.endsWith('》')
                                ? item.content
                                : `《${item.content}》`;
                            return (_jsxs("div", { className: "modal-event-item", children: [_jsx("div", { className: "modal-event-header", children: _jsxs(Flex, { gap: "4px 0", wrap: true, children: [troupeRender(item.troupe), cityRender(item.city), locationRender(item.location)] }) }), _jsx("div", { className: "modal-event-content", children: _jsx("strong", { children: content }) }), item.type && (_jsx("div", { className: "modal-event-time", children: item.type === 'afternoon' ? '下午场' : '晚场' }))] }, index));
                        }) }) }), _jsx(Modal, { title: editingDate ? `添加演出 - ${editingDate.format('YYYY年MM月DD日')}` : '添加演出', open: editModalVisible, onCancel: () => {
                        setEditModalVisible(false);
                        editForm.resetFields();
                    }, footer: [
                        _jsx(Button, { onClick: () => {
                                setEditModalVisible(false);
                                editForm.resetFields();
                            }, children: "\u53D6\u6D88" }, "cancel"),
                        _jsx(Button, { type: "primary", loading: submitting, onClick: () => editForm.submit(), children: "\u6DFB\u52A0\u6F14\u51FA" }, "submit"),
                    ], width: 600, children: _jsxs(Form, { form: editForm, layout: "vertical", onFinish: handleEditSubmit, style: { marginTop: 24 }, children: [_jsx(Form.Item, { label: "\u5267\u56E2", name: "troupe", rules: [{ required: true, message: '请输入剧团名称' }], children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u5E7F\u5DDE\u56E2" }) }), _jsx(Form.Item, { label: "\u6F14\u51FA\u5267\u76EE", name: "content", rules: [{ required: true, message: '请输入演出剧目' }], children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u5357\u6D77\u5341\u4E09\u90CE" }) }), _jsx(Form.Item, { label: "\u57CE\u5E02", name: "city", rules: [{ required: true, message: '请输入城市' }], children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u5E7F\u5DDE" }) }), _jsx(Form.Item, { label: "\u573A\u6240", name: "location", rules: [{ required: true, message: '请输入场所' }], children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u5E7F\u5DDE\u5927\u5267\u9662" }) }), _jsx(Form.Item, { label: "\u573A\u6B21", name: "type", initialValue: "evening", children: _jsx(Select, { options: [
                                        { label: '下午场', value: 'afternoon' },
                                        { label: '晚场', value: 'evening' },
                                    ] }) })] }) })] }));
    };
    root.render(_jsx(ConfigProvider, { locale: zhCN, children: _jsx(RootApp, {}) }));
}
