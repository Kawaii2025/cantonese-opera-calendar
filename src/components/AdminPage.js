import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, Space, Popconfirm, message, Tag, Card, Typography, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../api';
const { Title } = Typography;
const { Option } = Select;
export const AdminPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [form] = Form.useForm();
    const [troupes, setTroupes] = useState([]);
    const [cities, setCities] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [eventsData, troupesData, citiesData] = await Promise.all([
                api.getAllEvents(),
                api.getTroupes(),
                api.getCities()
            ]);
            setEvents(eventsData);
            setTroupes(troupesData);
            setCities(citiesData);
        }
        catch (err) {
            console.error('Failed to fetch data:', err);
            message.error('加载数据失败');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchAllData();
    }, []);
    const handleAdd = () => {
        setEditingEvent(null);
        form.resetFields();
        setModalVisible(true);
    };
    const handleEdit = (event) => {
        setEditingEvent(event);
        form.setFieldsValue({
            ...event,
            date: dayjs(event.date)
        });
        setModalVisible(true);
    };
    const handleDelete = async (id) => {
        try {
            setSubmitting(true);
            await api.deleteEvent(id);
            message.success('删除成功');
            fetchAllData();
        }
        catch (err) {
            console.error('Failed to delete event:', err);
            message.error('删除失败');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleSubmit = async (values) => {
        try {
            setSubmitting(true);
            const eventData = {
                date: values.date.format('YYYY-MM-DD'),
                type: values.type,
                troupe: values.troupe,
                city: values.city,
                location: values.location,
                content: values.content,
            };
            if (editingEvent && editingEvent.id) {
                await api.updateEvent(editingEvent.id, eventData);
                message.success('更新成功');
            }
            else {
                await api.createEvent(eventData);
                message.success('添加成功');
            }
            setModalVisible(false);
            form.resetFields();
            fetchAllData();
        }
        catch (err) {
            console.error('Failed to submit event:', err);
            message.error(editingEvent ? '更新失败' : '添加失败');
        }
        finally {
            setSubmitting(false);
        }
    };
    const columns = [
        {
            title: '日期',
            dataIndex: 'date',
            key: 'date',
            render: (date) => dayjs(date).format('YYYY-MM-DD'),
            sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
            defaultSortOrder: 'ascend',
        },
        {
            title: '场次',
            dataIndex: 'type',
            key: 'type',
            render: (type) => (_jsx(Tag, { color: type === 'afternoon' ? 'orange' : 'blue', children: type === 'afternoon' ? '下午场' : '晚场' })),
            filters: [
                { text: '下午场', value: 'afternoon' },
                { text: '晚场', value: 'evening' },
            ],
            onFilter: (value, record) => record.type === value,
        },
        {
            title: '剧团',
            dataIndex: 'troupe',
            key: 'troupe',
            filters: [...new Set(events.map(e => e.troupe))].map(t => ({ text: t, value: t })),
            onFilter: (value, record) => record.troupe === value,
        },
        {
            title: '城市',
            dataIndex: 'city',
            key: 'city',
            filters: [...new Set(events.map(e => e.city))].map(c => ({ text: c, value: c })),
            onFilter: (value, record) => record.city === value,
        },
        {
            title: '场所',
            dataIndex: 'location',
            key: 'location',
        },
        {
            title: '剧目',
            dataIndex: 'content',
            key: 'content',
            render: (content) => content.startsWith('《') && content.endsWith('》')
                ? content
                : `《${content}》`,
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (_jsxs(Space, { children: [_jsx(Button, { type: "link", icon: _jsx(EditOutlined, {}), onClick: () => handleEdit(record), children: "\u7F16\u8F91" }), _jsx(Popconfirm, { title: "\u786E\u8BA4\u5220\u9664", description: "\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u6761\u6F14\u51FA\u8BB0\u5F55\u5417\uFF1F", onConfirm: () => handleDelete(record.id), okText: "\u786E\u5B9A", cancelText: "\u53D6\u6D88", okButtonProps: { loading: submitting }, children: _jsx(Button, { type: "link", danger: true, icon: _jsx(DeleteOutlined, {}), children: "\u5220\u9664" }) })] })),
        },
    ];
    return (_jsxs("div", { style: { padding: '24px', maxWidth: '1400px', margin: '0 auto' }, children: [_jsxs(Card, { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsxs(Title, { level: 2, style: { margin: 0 }, children: [_jsx(CalendarOutlined, { style: { marginRight: 8 } }), "\u7CA4\u5267\u6F14\u51FA\u7BA1\u7406\u540E\u53F0"] }), _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAdd, size: "large", children: "\u6DFB\u52A0\u6F14\u51FA" })] }), _jsx(Divider, {}), _jsx(Table, { columns: columns, dataSource: events, rowKey: "id", loading: loading, pagination: {
                            pageSize: 20,
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条记录`,
                        }, scroll: { x: 1000 } })] }), _jsx(Modal, { title: editingEvent ? '编辑演出' : '添加演出', open: modalVisible, onCancel: () => {
                    setModalVisible(false);
                    form.resetFields();
                }, footer: [
                    _jsx(Button, { onClick: () => {
                            setModalVisible(false);
                            form.resetFields();
                        }, children: "\u53D6\u6D88" }, "cancel"),
                    _jsx(Button, { type: "primary", loading: submitting, onClick: () => form.submit(), children: editingEvent ? '更新' : '添加' }, "submit"),
                ], width: 600, children: _jsxs(Form, { form: form, layout: "vertical", onFinish: handleSubmit, style: { marginTop: 16 }, children: [_jsx(Form.Item, { label: "\u65E5\u671F", name: "date", rules: [{ required: true, message: '请选择日期' }], children: _jsx(DatePicker, { style: { width: '100%' }, placeholder: "\u8BF7\u9009\u62E9\u6F14\u51FA\u65E5\u671F" }) }), _jsx(Form.Item, { label: "\u573A\u6B21", name: "type", initialValue: "evening", rules: [{ required: true, message: '请选择场次' }], children: _jsxs(Select, { placeholder: "\u8BF7\u9009\u62E9\u573A\u6B21", children: [_jsx(Option, { value: "afternoon", children: "\u4E0B\u5348\u573A" }), _jsx(Option, { value: "evening", children: "\u665A\u573A" })] }) }), _jsx(Form.Item, { label: "\u5267\u56E2", name: "troupe", rules: [{ required: true, message: '请输入或选择剧团' }], children: _jsx(Select, { mode: "tags", placeholder: "\u8BF7\u8F93\u5165\u6216\u9009\u62E9\u5267\u56E2", children: troupes.map(troupe => (_jsx(Option, { value: troupe, children: troupe }, troupe))) }) }), _jsx(Form.Item, { label: "\u57CE\u5E02", name: "city", rules: [{ required: true, message: '请输入或选择城市' }], children: _jsx(Select, { mode: "tags", placeholder: "\u8BF7\u8F93\u5165\u6216\u9009\u62E9\u57CE\u5E02", children: cities.map(city => (_jsx(Option, { value: city, children: city }, city))) }) }), _jsx(Form.Item, { label: "\u573A\u6240", name: "location", rules: [{ required: true, message: '请输入场所' }], children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u5E7F\u5DDE\u5927\u5267\u9662" }) }), _jsx(Form.Item, { label: "\u5267\u76EE", name: "content", rules: [{ required: true, message: '请输入剧目' }], children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u5357\u6D77\u5341\u4E09\u90CE" }) })] }) })] }));
};
