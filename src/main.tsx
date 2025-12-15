import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, Flex, Tag, Layout, Select, Button, Radio, Modal, Spin, Alert, Form, Input, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import { CustomCalendar } from './components/CustomCalendar';
import { MobileCardView } from './components/MobileCardView';
import { ExportImage } from './components/ExportImage';
import { usePageScroll } from './hooks/usePageScroll';
import { api, Event } from './api';
import './style.css';
import './styles/custom-calendar.css';
import './styles/mobile.css';
import './styles/mobile-card-view.css';
import './styles/export-image.css';

const defaultDate = dayjs(); // 默认打开当前月份
let filter = (data: any[]) => data;

const getMonthData = (value: dayjs.Dayjs) => {
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
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [events, setEvents] = useState<Event[]>([]);
    
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
    
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Header className="app-header">
          <div className="header-content">
            <h1 className="header-title">2025年粤剧春班日历</h1>
            <div className="header-date-controls">
              <Select
                value={year}
                options={yearOptions}
                onChange={(newYear) => setCurrentDate(currentDate.year(newYear))}
                style={{ width: 100 }}
              />
              <Select
                value={month}
                options={monthOptions}
                onChange={(newMonth) => setCurrentDate(currentDate.month(newMonth))}
                style={{ width: 80 }}
              />
              <ExportImage events={events} currentDate={currentDate} />
              <Radio.Group 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="calendar">日历</Radio.Button>
                <Radio.Button value="list">列表</Radio.Button>
              </Radio.Group>
            </div>
          </div>
        </Layout.Header>
        <Layout.Content style={{ paddingTop: 0 }}>
          <CalendarApp 
            currentDate={currentDate} 
            onDateChange={setCurrentDate}
            modalVisible={modalVisible}
            setModalVisible={setModalVisible}
            viewMode={viewMode}
            onEventsChange={setEvents}
          />
        </Layout.Content>
      </Layout>
    );
  };
  
  const CalendarApp = ({ 
    currentDate, 
    onDateChange,
    modalVisible,
    setModalVisible,
    viewMode,
    onEventsChange
  }: { 
    currentDate: dayjs.Dayjs; 
    onDateChange: (date: dayjs.Dayjs) => void;
    modalVisible: boolean;
    setModalVisible: (visible: boolean) => void;
    viewMode: 'calendar' | 'list';
    onEventsChange?: (events: Event[]) => void;
  }) => {
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [selectedEvents, setSelectedEvents] = useState<any[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingDate, setEditingDate] = useState<dayjs.Dayjs | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const lastClickRef = useRef<{ date: string; time: number } | null>(null);

    // Fetch events for the current month
    const fetchMonthData = async (date: dayjs.Dayjs) => {
      try {
        setLoading(true);
        setError(null);
        const year = date.year();
        const month = date.month() + 1; // dayjs months are 0-indexed
        const data = await api.getEventsByMonth(year, month);
        setEvents(data);
        onEventsChange?.(data);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError('加载演出数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    // Fetch data when component mounts or month changes
    useEffect(() => {
      fetchMonthData(currentDate);
    }, [currentDate.year(), currentDate.month()]);

    const handleEditSubmit = async (values: any) => {
      if (!editingDate) return;
      
      try {
        setSubmitting(true);
        const newEvent: Event = {
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
      } catch (err) {
        console.error('Failed to add event:', err);
        message.error('添加演出信息失败，请重试');
      } finally {
        setSubmitting(false);
      }
    };

    // Build a map of events by date for quick lookup
    const eventsByDate = useMemo(() => {
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
    
    const monthCellRender = (value: dayjs.Dayjs) => {
      const num = getMonthData(value);
      return num ? (
        <div className="notes-month">
          <section>{num} </section>
          <span> Backlog number </span>
        </div>
      ) : null;
    };

    const handleCellClick = useCallback((value: dayjs.Dayjs) => {
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
      } else {
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

    const cityRender = (city: string) => {
      const map: Record<string, string> = {
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
      return <Tag color={color}> {city || ''}</Tag>;
    };

    const troupeRender = (troupe: string) => {
      const map: Record<string, { color: string; name: string }> = {
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
      return <Tag color={color}> {name || ''}</Tag>;
    };

    const locationRender = (location: string) => {
      return <Tag color="red"> {location || ''}</Tag>;
    };

    const dateCellRender = (value: dayjs.Dayjs) => {
      const dateKey = value.format('YYYY-MM-DD');
      const listData = eventsByDate.get(dateKey) || [];
      const displayData = listData.slice(0, 2);
      const remainingCount = listData.length - 2;
      
      const renderItem = (item: any, index: number) => {
        // 如果剧目没有书名号，则添加
        const content = item.content.startsWith('《') && item.content.endsWith('》') 
          ? item.content 
          : `《${item.content}》`;
        
        // 根据type字段确定显示的时间标签
        const isAfternoon = item.type === 'afternoon';
        const timeLabel = isAfternoon ? '下午场' : '晚场';
        
        return (
          <li key={index} className="item-troupe">
            <Flex gap="4px 0" wrap align="center">
              {troupeRender(item.troupe)}
              {cityRender(item.city)}
              <span style={{ fontSize: '12px', color: '#666', lineHeight: '20px', height: '20px', display: 'inline-block' }}>{timeLabel}</span>
              {locationRender(item.location)}
            </Flex>
            <span className="item-content item-play-name">{content}</span>
          </li>
        );
      };
      
      return (
        <div 
          className="date-cell-content"
          style={{ 
            cursor: 'pointer',
            userSelect: 'none',
            minHeight: '0px',
            padding: '2px'
          }}
          title="单击查看详情，双击添加演出"
        >
          <ul className="events">
            {displayData.map((item, index) => renderItem(item, index))}
            {remainingCount > 0 && (
              <li className="more-events">
                还有 {remainingCount} 场...
              </li>
            )}
          </ul>
        </div>
      );
    };

    const cellRender = (current: dayjs.Dayjs, info: any) => {
      if (info.type === 'date') return dateCellRender(current);
      if (info.type === 'month') return monthCellRender(current);
      return info.originNode;
    };

    return (
      <div className="calendar-wrapper">
        <ExportImage events={events} currentDate={currentDate} />
        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}
        <Spin spinning={loading} tip="加载中...">
          {viewMode === 'calendar' ? (
              <CustomCalendar 
                cellRender={(date) => dateCellRender(date)} 
                value={currentDate} 
                onChange={onDateChange}
                onCellClick={handleCellClick}
              />
            ) : (
              <MobileCardView 
                currentDate={currentDate}
                events={events}
                onEventClick={(event) => {
                  setSelectedEvents([event]);
                  setSelectedDate(dayjs(event.date));
                  setModalVisible(true);
                }}
                onAddEvent={(date) => {
                  setEditingDate(dayjs(date));
                  setEditModalVisible(true);
                }}
              />
            )}
        </Spin>
        
        <Modal
          title={selectedDate ? `${selectedDate.format('YYYY年MM月DD日')} 演出安排` : '演出安排'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={700}
          className="event-modal"
        >
          <div className="modal-events-list">
            {selectedEvents.map((item, index) => {
              const content = item.content.startsWith('《') && item.content.endsWith('》') 
                ? item.content 
                : `《${item.content}》`;
              
              return (
                <div key={index} className="modal-event-item">
                  <div className="modal-event-header">
                    <Flex gap="4px 0" wrap>
                      {troupeRender(item.troupe)}
                      {cityRender(item.city)}
                      {locationRender(item.location)}
                    </Flex>
                  </div>
                  <div className="modal-event-content">
                    <strong>{content}</strong>
                  </div>
                  {item.type && (
                    <div className="modal-event-time">
                      {item.type === 'afternoon' ? '下午场' : '晚场'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>

        <Modal
          title={editingDate ? `添加演出 - ${editingDate.format('YYYY年MM月DD日')}` : '添加演出'}
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            editForm.resetFields();
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setEditModalVisible(false);
              editForm.resetFields();
            }}>
              取消
            </Button>,
            <Button key="submit" type="primary" loading={submitting} onClick={() => editForm.submit()}>
              添加演出
            </Button>,
          ]}
          width={600}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleEditSubmit}
            style={{ marginTop: 24 }}
          >
            <Form.Item
              label="剧团"
              name="troupe"
              rules={[{ required: true, message: '请输入剧团名称' }]}
            >
              <Input placeholder="例如：广州团" />
            </Form.Item>

            <Form.Item
              label="演出剧目"
              name="content"
              rules={[{ required: true, message: '请输入演出剧目' }]}
            >
              <Input placeholder="例如：南海十三郎" />
            </Form.Item>

            <Form.Item
              label="城市"
              name="city"
              rules={[{ required: true, message: '请输入城市' }]}
            >
              <Input placeholder="例如：广州" />
            </Form.Item>

            <Form.Item
              label="场所"
              name="location"
              rules={[{ required: true, message: '请输入场所' }]}
            >
              <Input placeholder="例如：广州大剧院" />
            </Form.Item>

            <Form.Item
              label="场次"
              name="type"
              initialValue="evening"
            >
              <Select
                options={[
                  { label: '下午场', value: 'afternoon' },
                  { label: '晚场', value: 'evening' },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };
  
  root.render(
    <ConfigProvider locale={zhCN}>
      <RootApp />
    </ConfigProvider>
  );
}
