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
  Divider,
  AutoComplete,
  Tabs,
  List
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CalendarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, Event, Troupe } from '../api';

const { Title } = Typography;
const { Option } = Select;

export const AdminPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form] = Form.useForm();
  const [troupes, setTroupes] = useState<Troupe[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // 剧团管理 state
  const [troupeModalVisible, setTroupeModalVisible] = useState(false);
  const [troupeForm] = Form.useForm();
  const [troupeSubmitting, setTroupeSubmitting] = useState(false);
  const [editingTroupe, setEditingTroupe] = useState<Troupe | null>(null);


  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [eventsData, troupesData, citiesData] = await Promise.all([
        api.getAllEvents(),
        api.getTroupes(),
        api.getCities()
      ]);
      // 直接使用后端返回的顺序（已经是倒序了）
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
    
    // 设置历史值
    setTimeout(() => {
      const lastTroupe = getLastValue('troupe');
      const lastCity = getLastValue('city');
      const lastLocation = getLastValue('location');
      const lastType = getLastValue('type');
      
      form.setFieldsValue({
        troupe: lastTroupe,
        city: lastCity,
        location: lastLocation,
        type: lastType || 'evening',
      });
    }, 0);
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

  // 获取剧团颜色（从 troupes state 查找）
  const getTroupeColor = (name: string): string => {
    const troupe = troupes.find(t => t.name === name);
    return troupe?.color || '#2f54eb';
  };

  // 剧团管理：新增剧团
  const handleTroupeAdd = () => {
    setEditingTroupe(null);
    troupeForm.resetFields();
    troupeForm.setFieldsValue({ color: '#2f54eb' });
    setTroupeModalVisible(true);
  };

  // 剧团管理：编辑剧团
  const handleTroupeEdit = (troupe: Troupe) => {
    setEditingTroupe(troupe);
    troupeForm.setFieldsValue({
      name: troupe.name,
      color: troupe.color
    });
    setTroupeModalVisible(true);
  };

  const handleTroupeSubmit = async (values: any) => {
    try {
      setTroupeSubmitting(true);
      if (editingTroupe) {
        // 更新模式
        await api.updateTroupe(editingTroupe.name, {
          name: values.name,
          color: values.color
        });
        message.success('剧团更新成功');
      } else {
        // 新增模式
        await api.createTroupe(values.name, values.color);
        message.success('剧团添加成功');
      }
      setTroupeModalVisible(false);
      setEditingTroupe(null);
      troupeForm.resetFields();
      fetchAllData();
    } catch (err: any) {
      console.error('Failed to submit troupe:', err);
      message.error(err.message || (editingTroupe ? '更新剧团失败' : '添加剧团失败'));
    } finally {
      setTroupeSubmitting(false);
    }
  };

  const handleTroupeDelete = async (name: string) => {
    try {
      setTroupeSubmitting(true);
      await api.deleteTroupe(name);
      message.success('剧团删除成功');
      fetchAllData();
    } catch (err: any) {
      console.error('Failed to delete troupe:', err);
      message.error(err.message || '删除剧团失败');
    } finally {
      setTroupeSubmitting(false);
    }
  };

  // 自动添加书名号
  const formatContent = (content: string) => {
    if (!content) return content;
    const trimmed = content.trim();
    if (trimmed.startsWith('《') && trimmed.endsWith('》')) {
      return trimmed;
    }
    return `《${trimmed}》`;
  };

  // 保存历史记录到 localStorage
  const saveHistory = (key: string, value: string) => {
    const historyKey = `event_history_${key}`;
    let history: string[] = [];
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        history = JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    // 移除已存在的值，添加到最前面
    history = history.filter(v => v !== value);
    history.unshift(value);
    // 只保存最近10个
    history = history.slice(0, 10);
    localStorage.setItem(historyKey, JSON.stringify(history));
  };

  // 从 localStorage 读取历史记录
  const getHistory = (key: string): string[] => {
    const historyKey = `event_history_${key}`;
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    return [];
  };

  // 获取最近使用的值
  const getLastValue = (key: string): string | undefined => {
    const history = getHistory(key);
    return history[0];
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
        content: formatContent(values.content),
        details: values.details || '',
      };

      if (editingEvent && editingEvent.id) {
        await api.updateEvent(editingEvent.id, eventData);
        message.success('更新成功');
      } else {
        await api.createEvent(eventData);
        message.success('添加成功');
      }

      // 保存到历史记录（只在新建时保存）
      if (!editingEvent) {
        saveHistory('troupe', values.troupe);
        saveHistory('city', values.city);
        saveHistory('location', values.location);
        saveHistory('type', values.type);
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
      sorter: (a: Event, b: Event) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
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
      render: (troupe: string) => {
        const color = getTroupeColor(troupe);
        return <Tag color={color}>{troupe}</Tag>;
      },
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
      title: '演出详情',
      dataIndex: 'details',
      key: 'details',
      render: (details: string) => details ? (
        <div style={{ 
          maxWidth: 300, 
          color: '#666', 
          fontSize: 13,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {details}
        </div>
      ) : <span style={{ color: '#ccc' }}>—</span>,
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
        <Title level={2} style={{ margin: 0, marginBottom: 16 }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          粤剧演出管理后台
        </Title>

        <Divider />

        <Tabs
          defaultActiveKey="events"
          items={[
            {
              key: 'events',
              label: (
                <span>
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  演出管理
                </span>
              ),
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={handleAdd}
                      size="large"
                    >
                      添加演出
                    </Button>
                  </div>
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
                </>
              ),
            },
            {
              key: 'troupes',
              label: (
                <span>
                  <TeamOutlined style={{ marginRight: 8 }} />
                  剧团管理
                </span>
              ),
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={handleTroupeAdd}
                      size="large"
                    >
                      添加剧团
                    </Button>
                  </div>
                  <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
                    dataSource={troupes}
                    loading={loading}
                    locale={{ emptyText: '暂无剧团数据' }}
                    renderItem={(troupe) => (
                      <List.Item>
                        <Card
                          style={{ 
                            width: '100%', 
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ marginBottom: 8 }}>
                            <Tag 
                              color={troupe.color} 
                              style={{ 
                                minWidth: '80px',
                                textAlign: 'center',
                                fontSize: '16px',
                                padding: '4px 16px',
                              }}
                            >
                              {troupe.name}
                            </Tag>
                          </div>
                          <div style={{ 
                            fontSize: '18px', 
                            fontWeight: 'bold',
                            marginBottom: 12,
                          }}>
                            {troupe.name}
                          </div>
                          <Space size="small">
                            <Button 
                              type="link" 
                              icon={<EditOutlined />}
                              size="small"
                              onClick={() => handleTroupeEdit(troupe)}
                            >
                              编辑
                            </Button>
                            <Popconfirm
                              title="确认删除"
                              description="确定要删除这个剧团吗？如果剧团已被使用则无法删除。"
                              onConfirm={() => handleTroupeDelete(troupe.name)}
                              okText="确定"
                              cancelText="取消"
                              okButtonProps={{ loading: troupeSubmitting }}
                            >
                              <Button 
                                type="link" 
                                danger 
                                icon={<DeleteOutlined />}
                                size="small"
                              >
                                删除
                              </Button>
                            </Popconfirm>
                          </Space>
                        </Card>
                      </List.Item>
                    )}
                  />
                </>
              ),
            },
          ]}
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
            rules={[{ required: true, message: '请选择场次' }]}
          >
            <Select placeholder="请选择场次">
              <Option value="afternoon">下午场</Option>
              <Option value="evening">晚场</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="剧目"
            name="content"
            rules={[{ required: true, message: '请输入剧目' }]}
          >
            <Input placeholder="例如：南海十三郎" />
          </Form.Item>

          <Form.Item
            label="剧团"
            name="troupe"
            rules={[{ required: true, message: '请选择剧团' }]}
          >
            <Select placeholder="请选择剧团" showSearch allowClear>
              {/* 优先显示历史记录 */}
              {(() => {
                const history = getHistory('troupe');
                const historySet = new Set(history);
                const otherTroupes = troupes.filter(t => !historySet.has(t.name));
                // 先从 troupes 中找到有历史记录的
                const historyTroupes = history
                  .map(name => troupes.find(t => t.name === name))
                  .filter((t): t is Troupe => !!t);
                return [
                  ...historyTroupes.map(troupe => (
                    <Option key={`history_${troupe.name}`} value={troupe.name}>
                      <Tag color={troupe.color} style={{ marginRight: 8 }}>
                        {troupe.name}
                      </Tag>
                    </Option>
                  )),

                  ...otherTroupes.map(troupe => (
                    <Option key={troupe.name} value={troupe.name}>
                      <Tag color={troupe.color} style={{ marginRight: 8 }}>
                        {troupe.name}
                      </Tag>
                    </Option>
                  )),
                ];
              })()}
            </Select>
          </Form.Item>

          <Form.Item
            label="城市"
            name="city"
            rules={[{ required: true, message: '请选择城市' }]}
          >
            <Select placeholder="请选择城市" showSearch allowClear>
              {/* 优先显示历史记录 */}
              {(() => {
                const history = getHistory('city');
                const historySet = new Set(history);
                const otherCities = cities.filter(c => !historySet.has(c));
                return [
                  ...history.map(city => (
                    <Option key={`history_${city}`} value={city}>
                      {city}
                    </Option>
                  )),

                  ...otherCities.map(city => (
                    <Option key={city} value={city}>
                      {city}
                    </Option>
                  )),
                ];
              })()}
            </Select>
          </Form.Item>

          <Form.Item
            label="场所"
            name="location"
            rules={[{ required: true, message: '请输入场所' }]}
          >
            <AutoComplete 
              placeholder="例如：广州大剧院" 
              allowClear 
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              options={(() => {
                const history = getHistory('location');
                return history.map(location => ({
                  value: location,
                  label: location
                }));
              })()}
            />
          </Form.Item>

          <Form.Item
            label="演出详情"
            name="details"
            tooltip="可选：剧情简介、演员阵容、折子戏剧目等"
          >
            <Input.TextArea 
              placeholder="例如：《帝女花》- 粤剧经典剧目，主演：XXX、XXX" 
              rows={3}
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加/编辑剧团的 Modal */}
      <Modal
        title={editingTroupe ? '编辑剧团' : '添加剧团'}
        open={troupeModalVisible}
        onCancel={() => {
          setTroupeModalVisible(false);
          setEditingTroupe(null);
          troupeForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setTroupeModalVisible(false);
            setEditingTroupe(null);
            troupeForm.resetFields();
          }}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={troupeSubmitting} 
            onClick={() => troupeForm.submit()}
          >
            {editingTroupe ? '保存' : '添加'}
          </Button>,
        ]}
        width={500}
      >
        <Form
          form={troupeForm}
          layout="vertical"
          onFinish={handleTroupeSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="剧团名称"
            name="name"
            rules={[
              { required: true, message: '请输入剧团名称' },
              { max: 100, message: '剧团名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="例如：广州团、佛山团" />
          </Form.Item>
          <Form.Item
            label="剧团颜色"
            name="color"
            rules={[{ required: true, message: '请选择颜色' }]}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                '#2f54eb', // 蓝色
                '#f5222d', // 红色
                '#52c41a', // 绿色
                '#faad14', // 金色
                '#eb2f96', // 品红
                '#722ed1', // 紫色
                '#13c2c2', // 青色
                '#fa541c', // 橙色
                '#ffc53d', // 金黄
                '#7b189a', // 深紫
                '#ff4d4f', // 珊瑚红
                '#40b0ff', // 亮蓝
              ].map(color => (
                <Form.Item name="color" noStyle key={color}>
                  <div
                    onClick={() => troupeForm.setFieldValue('color', color)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: '2px solid ' + (troupeForm.getFieldValue('color') === color ? '#000' : 'transparent'),
                      display: 'inline-block',
                      transition: 'border-color 0.2s',
                    }}
                    title={color}
                  />
                </Form.Item>
              ))}
              <Form.Item name="color" noStyle>
                <Input
                  style={{ width: 100 }}
                  placeholder="#2f54eb"
                  prefix={<div style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: troupeForm.getFieldValue('color') || '#2f54eb' }} />}
                  onChange={(e) => troupeForm.setFieldValue('color', e.target.value)}
                />
              </Form.Item>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
