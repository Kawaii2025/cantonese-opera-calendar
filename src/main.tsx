import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, Flex, Tag, Layout, Select, Button, Radio, Modal, Spin, Alert, Form, Input, message, Menu, AutoComplete } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import { CustomCalendar } from './components/CustomCalendar';
import { MobileCardView } from './components/MobileCardView';
import { ExportImage } from './components/ExportImage';
import { AdminPage } from './components/AdminPage';
import { usePageScroll } from './hooks/usePageScroll';
import { api, Event } from './api';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './style.css';
import './styles/custom-calendar.css';
import './styles/mobile.css';
import './styles/mobile-card-view.css';
import './styles/export-image.css';

const defaultDate = dayjs(); // Default to current date
let filter = (data: any[]) => data;

const getMonthData = (value: dayjs.Dayjs) => {
  if (value.month() === 8) {
    return 1394;
  }
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  
  const AppHeader = ({ 
    currentDate, 
    setCurrentDate 
  }: { 
    currentDate: dayjs.Dayjs;
    setCurrentDate: (date: dayjs.Dayjs) => void;
  }) => {
    const location = useLocation();
    
    const year = currentDate.year();
    const month = currentDate.month();
    
    const yearOptions = useMemo(() => {
      return Array.from({ length: 10 }, (_, i) => ({
        label: `${year - 5 + i}年`,
        value: year - 5 + i,
      }));
    }, [year]);
    
    const monthOptions = useMemo(() => {
      return Array.from({ length: 12 }, (_, i) => ({
        label: `${i + 1}月`,
        value: i,
      }));
    }, []);

    const menuItems = [
      {
        key: '/',
        label: <Link to="/">日历</Link>,
      },
      {
        key: '/admin',
        label: <Link to="/admin">管理后台</Link>,
      },
    ];

    return (
      <Layout.Header className="app-header">
        <div className="header-content">
          <h1 className="header-title">2026年粤剧日历</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {location.pathname === '/' && (
              <>
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
              </>
            )}
            <Menu
              mode="horizontal"
              selectedKeys={[location.pathname]}
              items={menuItems}
              style={{ border: 'none', minWidth: 200 }}
            />
          </div>
        </div>
      </Layout.Header>
    );
  };
  
  const RootApp = () => {
    const [currentDate, setCurrentDate] = useState(defaultDate);
    
    return (
      <Router>
        <Layout style={{ minHeight: '100vh' }}>
          <AppHeader 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate} 
          />
          <Layout.Content style={{ paddingTop: 0 }}>
            <Routes>
              <Route 
                path="/" 
                element={
                  <CalendarApp 
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                  />
                } 
              />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </Layout.Content>
        </Layout>
      </Router>
    );
  };
  
  const CalendarApp = ({ 
    currentDate, 
    onDateChange 
  }: { 
    currentDate: dayjs.Dayjs;
    onDateChange: (date: dayjs.Dayjs) => void;
  }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [events, setEvents] = useState<Event[]>([]);
    const [troupes, setTroupes] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [selectedTroupe, setSelectedTroupe] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [selectedEvents, setSelectedEvents] = useState<any[]>([]);
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
        const [eventsData, troupesData, citiesData] = await Promise.all([
          api.getEventsByMonth(year, month),
          api.getTroupes(),
          api.getCities()
        ]);
        setEvents(eventsData);
        setTroupes(troupesData);
        setCities(citiesData);
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

    // Filter events by selected troupe
    const filteredEvents = useMemo(() => {
      if (!selectedTroupe) return events;
      return events.filter(event => event.troupe === selectedTroupe);
    }, [events, selectedTroupe]);

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
          content: formatContent(values.content),
          type: values.type || 'evening',
        };
        
        await api.createEvent(newEvent);
        
        // 保存到历史记录
        saveHistory('troupe', values.troupe);
        saveHistory('city', values.city);
        saveHistory('location', values.location);
        saveHistory('type', values.type || 'evening');
        
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
      filteredEvents.forEach(event => {
        const dateKey = dayjs(event.date).format('YYYY-MM-DD');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(event);
      });
      return map;
    }, [filteredEvents]);
    
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
        
        // 设置历史值
        setTimeout(() => {
          const lastTroupe = getLastValue('troupe');
          const lastCity = getLastValue('city');
          const lastLocation = getLastValue('location');
          const lastType = getLastValue('type');
          
          editForm.setFieldsValue({
            troupe: lastTroupe,
            city: lastCity,
            location: lastLocation,
            type: lastType || 'evening',
          });
        }, 0);
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
      return <Tag color={color}>{city || ''}</Tag>;
    };

    // 获取剧团颜色
    const getTroupeColor = (troupe: string) => {
      const map: Record<string, string> = {
        广州团: '#2f54eb',
        佛山团: '#f5222d',
        红豆团: '#ff4d4f',
        省一团: '#faad14',
        省二团: '#a0d911',
        深圳团: '#eb2f96',
        珠海团: '#ffc53d',
        省院: '#fa541c',
        大湾区: '#7b189a',
      };
      return map[troupe] || '';
    };

    const troupeRender = (troupe: string) => {
      const color = getTroupeColor(troupe);
      return <Tag color={color}>{troupe}</Tag>;
    };

    const locationRender = (location: string) => {
      return <Tag color="red">{location || ''}</Tag>;
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
        
        return (
          <li key={index} className="item-troupe">
            <Flex gap="4px 0" wrap align="center">
              {troupeRender(item.troupe)}
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
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          padding: '16px 24px',
          gap: 16,
          alignItems: 'center'
        }}>
          <ExportImage events={events} currentDate={currentDate} />
          <Select
            style={{ width: 150 }}
            placeholder="筛选剧团"
            allowClear
            value={selectedTroupe}
            onChange={setSelectedTroupe}
          >
            {troupes.map(troupe => (
              <Select.Option key={troupe} value={troupe}>
                <Tag 
                  color={getTroupeColor(troupe)} 
                  style={{ 
                    marginRight: 8, 
                    minWidth: '64px', 
                    textAlign: 'center',
                    display: 'inline-block'
                  }}
                >
                  {troupe}
                </Tag>
                {troupe}
              </Select.Option>
            ))}
          </Select>
          <Radio.Group 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="calendar">日历</Radio.Button>
            <Radio.Button value="list">列表</Radio.Button>
          </Radio.Group>
        </div>
        
        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16, margin: '0 24px' }}
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
                    <Flex gap="8px" wrap>
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
              label="演出剧目"
              name="content"
              rules={[{ required: true, message: '请输入演出剧目' }]}
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
                  const otherTroupes = troupes.filter(t => !historySet.has(t));
                  return [
                    ...history.map(troupe => (
                      <Select.Option key={`history_${troupe}`} value={troupe}>
                        <Tag color={getTroupeColor(troupe)} style={{ marginRight: 8 }}>
                          {troupe}
                        </Tag>
                      </Select.Option>
                    )),

                    ...otherTroupes.map(troupe => (
                      <Select.Option key={troupe} value={troupe}>
                        <Tag color={getTroupeColor(troupe)} style={{ marginRight: 8 }}>
                          {troupe}
                        </Tag>
                      </Select.Option>
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
                      <Select.Option key={`history_${city}`} value={city}>
                        {city}
                      </Select.Option>
                    )),

                    ...otherCities.map(city => (
                      <Select.Option key={city} value={city}>
                        {city}
                      </Select.Option>
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
              label="场次"
              name="type"
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
