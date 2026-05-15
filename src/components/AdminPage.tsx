import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Space, 
  Popconfirm, 
  message, 
  Tag,
  Card,
  Typography,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CalendarOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, Event } from '../api';

const { Title } = Typography;
const { Option } = Select;

export const AdminPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form] = Form.useForm();
  const [troupes, setTroupes] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
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
    } catch (err) {
      console.error('Failed to fetch data:', err);
      message.error('加载数据失败');
    } finally {
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

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    form.setFieldsValue({
      ...event,
      date: dayjs(event.date)
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string | number) => {
    try {
      setSubmitting(true);
      await api.deleteEvent(id);
      message.success('删除成功');
      fetchAllData();
    } catch (err) {
      console.error('Failed to delete event:', err);
      message.error('删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const eventData: Omit<Event, 'id' | 'created_at'> = {
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
      } else {
        await api.createEvent(eventData);
        message.success('添加成功');
      }

      setModalVisible(false);
      form.resetFields();
      fetchAllData();
    } catch (err) {
      console.error('Failed to submit event:', err);
      message.error(editingEvent ? '更新失败' : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: Event, b: Event) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: '场次',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'afternoon' ? 'orange' : 'blue'}>
          {type === 'afternoon' ? '下午场' : '晚场'}
        </Tag>
      ),
      filters: [
        { text: '下午场', value: 'afternoon' },
        { text: '晚场', value: 'evening' },
      ],
      onFilter: (value: any, record: Event) => record.type === value,
    },
    {
      title: '剧团',
      dataIndex: 'troupe',
      key: 'troupe',
      filters: [...new Set(events.map(e => e.troupe))].map(t => ({ text: t, value: t })),
      onFilter: (value: any, record: Event) => record.troupe === value,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      filters: [...new Set(events.map(e => e.city))].map(c => ({ text: c, value: c })),
      onFilter: (value: any, record: Event) => record.city === value,
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
      render: (content: string) => 
        content.startsWith('《') && content.endsWith('》') 
          ? content 
          : `《${content}》`,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Event) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条演出记录吗？"
            onConfirm={() => handleDelete(record.id!)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ loading: submitting }}
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ] as any;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={2} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            粤剧演出管理后台
          </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            size="large"
          >
            添加演出
          </Button>
        </div>

        <Divider />

        <Table
          columns={columns}
          dataSource={events}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingEvent ? '编辑演出' : '添加演出'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setModalVisible(false);
            form.resetFields();
          }}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={() => form.submit()}
          >
            {editingEvent ? '更新' : '添加'}
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="日期"
            name="date"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="请选择演出日期"
            />
          </Form.Item>

          <Form.Item
            label="场次"
            name="type"
            initialValue="evening"
            rules={[{ required: true, message: '请选择场次' }]}
          >
            <Select placeholder="请选择场次">
              <Option value="afternoon">下午场</Option>
              <Option value="evening">晚场</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="剧团"
            name="troupe"
            rules={[{ required: true, message: '请输入或选择剧团' }]}
          >
            <Select mode="tags" placeholder="请输入或选择剧团">
              {troupes.map(troupe => (
                <Option key={troupe} value={troupe}>{troupe}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="城市"
            name="city"
            rules={[{ required: true, message: '请输入或选择城市' }]}
          >
            <Select mode="tags" placeholder="请输入或选择城市">
              {cities.map(city => (
                <Option key={city} value={city}>{city}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="场所"
            name="location"
            rules={[{ required: true, message: '请输入场所' }]}
          >
            <Input placeholder="例如：广州大剧院" />
          </Form.Item>

          <Form.Item
            label="剧目"
            name="content"
            rules={[{ required: true, message: '请输入剧目' }]}
          >
            <Input placeholder="例如：南海十三郎" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
