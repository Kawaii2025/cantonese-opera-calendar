import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Calendar, ConfigProvider, Flex, Tag, Layout, Select, Button, Radio, Modal } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import { usePageScroll } from './hooks/usePageScroll';
import './style.css';

const defaultDate = new Date(2025, 2, 1);
let filter = (data: any[]) => data;

// filter = (data) => data.filter((item) => ['广州团'].includes(item.troupe));

const getMonthData = (value: dayjs.Dayjs) => {
  if (value.month() === 8) {
    return 1394;
  }
};

const App = () => {
  const [currentDate, setCurrentDate] = useState(dayjs(defaultDate));
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const monthCellRender = (value: dayjs.Dayjs) => {
    const num = getMonthData(value);
    return num ? (
      <div className="notes-month">
        <section>{num} </section>
        <span> Backlog number </span>
      </div>
    ) : null;
  };

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
      省院: { color: '#fa541c', name: '省院' },
    };
    const { color, name } = map[troupe] || { color: '', name: '' };
    return <Tag color={color}> {name || ''}</Tag>;
  };

  const locationRender = (location: string) => {
    return <Tag color="blue"> {location || ''}</Tag>;
  };

  const dateCellRender = (value: dayjs.Dayjs) => {
    const listData = getListData(value);
    return (
      <ul className="events">
        {listData.map((item, index) => (
          <li key={index} className="item-troupe">
            <Flex gap="4px 0" wrap>
              {troupeRender(item.troupe)}
              {cityRender(item.city)}
              {locationRender(item.location)}
            </Flex>
            <span className="item-content item-play-name">{item.content}</span>
          </li>
        ))}
      </ul>
    );
  };

  const cellRender = (current: dayjs.Dayjs, info: any) => {
    if (info.type === 'date') return dateCellRender(current);
    if (info.type === 'month') return monthCellRender(current);
    return info.originNode;
  };

  return <Calendar cellRender={cellRender} value={currentDate} onChange={setCurrentDate} />;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  
  const RootApp = () => {
    const [currentDate, setCurrentDate] = useState(dayjs(defaultDate));
    usePageScroll(currentDate, setCurrentDate);
    
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
              <Radio.Group value="month" buttonStyle="solid">
                <Radio.Button value="month">月</Radio.Button>
                <Radio.Button value="year">年</Radio.Button>
              </Radio.Group>
            </div>
          </div>
        </Layout.Header>
        <Layout.Content style={{ paddingTop: 0 }}>
          <CalendarApp currentDate={currentDate} onDateChange={setCurrentDate} />
        </Layout.Content>
      </Layout>
    );
  };
  
  const CalendarApp = ({ currentDate, onDateChange }: { currentDate: dayjs.Dayjs; onDateChange: (date: dayjs.Dayjs) => void }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [selectedEvents, setSelectedEvents] = useState<any[]>([]);
    
    const monthCellRender = (value: dayjs.Dayjs) => {
      const num = getMonthData(value);
      return num ? (
        <div className="notes-month">
          <section>{num} </section>
          <span> Backlog number </span>
        </div>
      ) : null;
    };

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
        省院: { color: '#fa541c', name: '省院' },
      };
      const { color, name } = map[troupe] || { color: '', name: '' };
      return <Tag color={color}> {name || ''}</Tag>;
    };

    const locationRender = (location: string) => {
      return <Tag color="blue"> {location || ''}</Tag>;
    };

    const dateCellRender = (value: dayjs.Dayjs) => {
      const listData = getListData(value);
      const displayData = listData.slice(0, 3);
      const remainingCount = listData.length - 3;
      
      const handleCellClick = () => {
        if (listData.length > 0) {
          setSelectedDate(value);
          setSelectedEvents(listData);
          setModalVisible(true);
        }
      };
      
      const renderItem = (item: any, index: number) => (
        <li key={index} className="item-troupe">
          <Flex gap="4px 0" wrap>
            {troupeRender(item.troupe)}
            {cityRender(item.city)}
            {locationRender(item.location)}
          </Flex>
          <span className="item-content item-play-name">{item.content}</span>
        </li>
      );
      
      return (
        <div onClick={handleCellClick} className="date-cell-content">
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
        <Calendar 
          cellRender={cellRender} 
          value={currentDate} 
          onChange={onDateChange} 
          fullscreen={true}
          headerRender={() => null}
        />
        
        <Modal
          title={selectedDate ? `${selectedDate.format('YYYY年MM月DD日')} 演出安排` : '演出安排'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={700}
          className="event-modal"
        >
          <div className="modal-events-list">
            {selectedEvents.map((item, index) => (
              <div key={index} className="modal-event-item">
                <div className="modal-event-header">
                  <Flex gap="4px 0" wrap>
                    {troupeRender(item.troupe)}
                    {cityRender(item.city)}
                    {locationRender(item.location)}
                  </Flex>
                </div>
                <div className="modal-event-content">
                  <strong>{item.content}</strong>
                </div>
                {item.type && (
                  <div className="modal-event-time">
                    {item.type === 'afternoon' ? '下午场' : '晚场'}
                  </div>
                )}
              </div>
            ))}
          </div>
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

const getListData = (value: any) => {
  let listData: any[] = []; // Specify the type of listData

  switch (value.format('YYYY-MM-DD')) {
    case '2025-01-01':
      listData = [
        {
          type: 'night',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;

    case '2025-01-03':
      listData = [
        {
          type: 'night',
          troupe: '深圳团',
          city: '湛江',
          location: '吴川市樟铺镇石狗塘村',
          content: '《巾帼红玉》',
        },
      ];
      break;
    case '2025-01-04':
      listData = [
        {
          type: 'night',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '湛江',
          location: '吴川市樟铺镇石狗塘村',
          content: '《风雨泣萍姬》',
        },
      ];
      break;
    case '2025-01-05':
      listData = [
        {
          type: 'night',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '湛江',
          location: '吴川市樟铺镇石狗塘村',
          content: '《唐明皇与杨贵妃》',
        },
      ];
      break;
    case '2025-01-06':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '广州',
          location: '南沙芦湾村',
          content: '《梁山伯与祝英台》',
        },
      ];
      break;
    case '2025-01-07':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '广州',
          location: '南沙芦湾村',
          content: '《梦断香销四十年》',
        },
      ];
      break;
    case '2025-01-09':
      listData = [
        {
          type: 'night',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-10':
      listData = [
        {
          type: 'night',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-11':
      listData = [
        {
          type: 'night',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '香港',
          location: '西九戏曲中心',
          content: '《晓毅个人艺术专场》',
        },
      ];
      break;
    case '2025-01-12':
      listData = [
        {
          type: 'night',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-14':
      listData = [
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-15':
      listData = [
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '洪梅镇',
          content: '《晓毅个人艺术专场》',
        },
      ];
      break;
    case '2025-01-16':
      listData = [
        {
          type: 'night',
          troupe: '省二团',
          city: '香港',
          location: '西九戏曲中心',
          content: '《三脱状元袍》',
        },
      ];
      break;
    case '2025-01-17':
      listData = [
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'afternoon',
          troupe: '省二团',
          city: '香港',
          location: '西九戏曲中心',
          content: '折子戏专场',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '香港',
          location: '西九戏曲中心',
          content: '《睿王与庄妃》',
        },
      ];
      break;
    case '2025-01-18':
      listData = [
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-19':
      listData = [
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-20':
      listData = [
        {
          type: 'night',
          troupe: '省院',
          city: '广州',
          location: '广东粤剧院',
          content: '湾区有戏2025',
        },
      ];
      break;
    case '2025-01-21':
      listData = [
        {
          type: 'night',
          troupe: '佛山团',
          city: '佛山',
          location: '金马剧场',
          content: '《折子戏晚会》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '广州',
          location: '海珠土华村',
          content: '《洞庭良缘》',
        },
      ];
      break;

    case '2025-01-22':
      listData = [
        {
          type: 'night',
          troupe: '省一团',
          city: '广州',
          location: '海珠土华村',
          content: '《观音情度韦陀天》',
        },
      ];
      break;
    case '2025-01-24':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '广州',
          location: '越秀国际会议中心',
          content: '广州市2025年春节团拜会',
        },
        {
          type: 'night',
          troupe: '广州团',
          city: '香港',
          location: '高山剧场',
          content: '《林冲》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-25':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '香港',
          location: '高山剧场',
          content: '粤剧折子戏专场',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-28':
      listData = [
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-29':
      listData = [
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-30':
      listData = [
        {
          type: 'afternoon',
          troupe: '广州团',
          city: '广州',
          location: '江南大戏院',
          content: '《闹严府》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '北海',
          location: '合浦山口镇',
          content: '西屯聖堂春节联欢晚会',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-01-31':
      listData = [
        {
          type: 'afternoon',
          troupe: '广州团',
          city: '广州',
          location: '江南大戏院',
          content: '《紫钗记》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '北海',
          location: '合浦山口镇',
          content: '《六国大封相》+《梁山伯与祝英台》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '长安沙头金沙影剧院',
          content: '《珍珠塔》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '广州',
          location: '广东粤剧院',
          content: '《刁蛮公主憨驸马》',
        },
      ];
      break;
    case '2025-02-01':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电白区岭门镇山前',
          content: '《范蠡献西施》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '北海',
          location: '合浦山口镇',
          content: '《焚香记》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '长安沙头金沙影剧院',
          content: '《风流才子》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '丽岗镇博青村',
          content: '《观音情度韦陀天》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '广州',
          location: '广东粤剧院',
          content: '《范蠡献西施》',
        },
      ];
      break;
    case '2025-02-02':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电白区岭门镇山前',
          content: '《侠盗娇妻状元郎》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '北海',
          location: '合浦山口镇',
          content: '《唐明皇与杨贵妃》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '厚街涌口村',
          content: '《龙凤争挂帅》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '丽岗镇博青村',
          content: '《宝莲灯》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '广州',
          location: '广东粤剧院',
          content: '《蝶影红梨记》',
        },
      ];
      break;
    case '2025-02-03':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电白区树仔镇旦海村',
          content: '《紫钗记》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '北海',
          location: '合浦山口镇',
          content: '《雾锁东宫》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '厚街涌口村',
          content: '《风流情侠》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '广州',
          location: '广东粤剧院',
          content: '《拜月记》',
        },
      ];
      break;
    case '2025-02-04':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电白区树仔镇旦海村',
          content: '《六国大封相》+《姑缘嫂劫》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '北海',
          location: '合浦山口镇',
          content: '《赵子龙保主过江》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '厚街涌口村',
          content: '《帝女花》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '广州',
          location: '广东粤剧院',
          content: '《伦文叙传奇》',
        },
      ];
      break;
    case '2025-02-05':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电白区树仔镇旦海村',
          content: '《唐明皇与杨贵妃》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州笪桥镇水塘村',
          content: '《南唐李后主》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '厚街涌口村',
          content: '《鸳鸯泪洒莫愁湖》',
        },
      ];
      break;
    case '2025-02-06':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '湛江',
          location: '吴川塘缀镇乐根村',
          content: '《范蠡献西施》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州笪桥镇水塘村',
          content: '《董生与李氏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '茂名',
          location: '电白马踏镇禄岳',
          content: '《吕布与貂蝉》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '茂名',
          location: '化州笪桥镇高志塘村',
          content: '《真假美猴王》',
        },
      ];
      break;
    case '2025-02-07':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '湛江',
          location: '吴川塘缀镇乐根村',
          content: '《梦断香销四十年》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州笪桥镇水塘村',
          content: '《吕布与貂蝉》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '茂名',
          location: '电白马踏镇禄岳',
          content: '《风流情侠》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '电白旦场镇旦场村',
          content: '《睿王与庄妃》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '茂名',
          location: '化州笪桥镇高志塘村',
          content: '《刁蛮公主憨驸马》',
        },
      ];
      break;
    case '2025-02-08':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '茂名影剧院',
          content: '《梁山伯与祝英台》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '茂名',
          location: '电白马踏镇禄岳',
          content: '《风雨泣萍姬》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '电白旦场镇旦场村',
          content: '《唐宫香梦证前盟》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '茂名',
          location: '化州笪桥镇高志塘村',
          content: '《五女拜寿》',
        },
      ];
      break;
    case '2025-02-09':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '茂名影剧院',
          content: '《范蠡献西施》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '化州良光镇茅山村',
          content: '《狸猫换太子》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '茂名',
          location: '电白旦场镇旦场村',
          content: '《范蠡献西施》',
        },
      ];
      break;
    case '2025-02-10':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州杨梅镇黄槐垌村',
          content: '《南唐李后主》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '化州良光镇茅山村',
          content: '《谯国夫人》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '茂名',
          location: '电白旦场镇旦场村',
          content: '《兰陵王》',
        },
      ];
      break;
    case '2025-02-11':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州杨梅镇黄槐垌村',
          content: '《赵子龙保主过江》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '东城影剧院',
          content: '《唐明皇与杨贵妃》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '化州良光镇茅山村',
          content: '《五女拜寿》',
        },
      ];
      break;
    case '2025-02-12':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州杨梅镇黄槐垌村',
          content: '《范蠡献西施》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '东城影剧院',
          content: '《帝女花》',
        },
        {
          type: 'night',
          troupe: '省二团',
          city: '广州',
          location: '广州大剧院',
          content: '《白蛇传·情》',
        },
      ];
      break;
    case '2025-02-13':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州良光镇金玉堂村',
          content: '《吕布与貂蝉》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '茂名',
          location: '东城影剧院',
          content: '《赵子龙保主过江》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '电白岭门镇山后文化广场',
          content: '《洞庭良缘》',
        },
      ];
      break;
    case '2025-02-14':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州良光镇金玉堂村',
          content: '《梦断香销四十年》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '东莞',
          location: '东城影剧院',
          content: '《范蠡献西施》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '电白岭门镇山后文化广场',
          content: '《白蛇传·情》',
        },
      ];
      break;
    case '2025-02-15':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '东莞',
          location: '东莞影剧院',
          content: '《闹严府》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州良光镇金玉堂村',
          content: '《赵子龙保主过江》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '电白岭门镇山后文化广场',
          content: '《唐宫香梦证前盟》',
        },
      ];
      break;
    case '2025-02-16':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '东莞',
          location: '东莞影剧院',
          content: '《姑缘嫂劫》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州杨梅镇官地村',
          content: '《焚香记》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '深圳',
          location: '凤凰剧场',
          content: '《三脱状元袍》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '茂名',
          location: '电白岭门镇山后文化广场',
          content: '《鹊桥会》',
        },
      ];
      break;
    case '2025-02-17':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州杨梅镇官地村',
          content: '《搜书院》',
        },
      ];
      break;
    case '2025-02-18':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州杨梅镇官地村',
          content: '《刁蛮公主憨驸马》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '北海',
          location: '合浦县山口镇',
          content: '《鹊桥会》',
        },
      ];
      break;
    case '2025-02-19':
      listData = [
        {
          type: 'night',
          troupe: '深圳团',
          city: '广州',
          location: '文化公园中心台',
          content: '《风流情侠》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '北海',
          location: '合浦县山口镇',
          content: '《程婴救孤》',
        },
      ];
      break;
    case '2025-02-20':
      listData = [
        {
          type: 'night',
          troupe: '深圳团',
          city: '广州',
          location: '文化公园中心台',
          content: '《红丝错》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '北海',
          location: '合浦县山口镇',
          content: '《白蛇传·情》',
        },
      ];
      break;
    case '2025-02-21':
      listData = [
        {
          type: 'night',
          troupe: '深圳团',
          city: '广州',
          location: '文化公园中心台',
          content: '《吕布与貂蝉》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '北海',
          location: '合浦县山口镇',
          content: '《谯国夫人》',
        },
      ];
      break;
    case '2025-02-22':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '广州',
          location: '江南大戏院',
          content: '《刁蛮公主憨驸马》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '广州',
          location: '文化公园中心台',
          content: '《伦文叙传奇》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '北海',
          location: '合浦县山口镇',
          content: '《钟馗》',
        },
      ];
      break;
    case '2025-02-23':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '广州',
          location: '江南大戏院',
          content: '《赵子龙保主过江》',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
      ];
      break;
    case '2025-02-27':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '香港',
          location: '新光戏院',
          content: '《秦王孟姜》(群星版)',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '东莞',
          location: '万江区龙湾梓公园',
          content: '《洞庭良缘》',
        },
      ];
      break;
    case '2025-02-28':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '湛江',
          location: '黄陂镇石头坉村',
          content: '《唐明皇与杨贵妃》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '香港',
          location: '新光戏院',
          content: '《秦王孟姜》(群星版)',
        },
        {
          type: 'afternoon',
          troupe: '佛山团',
          city: '佛山',
          location: '祖庙万福台',
          content: '《粤剧折子戏》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '东莞',
          location: '万江区龙湾梓公园',
          content: '《观音情度韦陀天》',
        },
      ];
      break;
    case '2025-03-01':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '湛江',
          location: '黄陂镇石头坉村',
          content: '《三看御妹》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州长岐黄沙村',
          content: '《刁蛮公主憨驸马》',
        },
      ];
      break;
    case '2025-03-02':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '湛江',
          location: '黄陂镇石头坉村',
          content: '《紫钗记》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州长岐黄沙村',
          content: '《梁山伯与祝英台》',
        },
      ];
      break;
    case '2025-03-03':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州长岐黄沙村',
          content: '《黄飞虎反五关》',
        },
      ];
      break;
    case '2025-03-04':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '化州长岐黄沙村',
          content: '《六月雪》',
        },
      ];
      break;
    case '2025-03-07':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '广州',
          location: '红线女大剧院',
          content: '《大吉岛的春天》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '深圳',
          location: '深圳戏院',
          content: '《范蠡献西施》',
        },
      ];
      break;
    case '2025-03-08':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '广州',
          location: '红线女大剧院',
          content: '《大吉岛的春天》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '深圳',
          location: '深圳戏院',
          content: '《刁蛮公主憨驸马》',
        },
      ];
      break;
    case '2025-03-09':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '广州',
          location: '越秀公园红棉舞台',
          content: '英雄花开英雄城 折子戏专场',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '鳌头镇北淦黄箩村',
          content: '《焚香记》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '湛江',
          location: '吴川黄陂镇高屋村篮球场',
          content: '《伦文叙传奇》',
        },
      ];
      break;
    case '2025-03-10':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '鳌头镇北淦黄箩村',
          content: '《搜书院》',
        },
        {
          type: 'night',
          troupe: '省一团',
          city: '湛江',
          location: '黄陂镇高屋村篮球场',
          content: '《荆钗记》',
        },
      ];
      break;
    case '2025-03-11':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '茂南区镇盛镇彭村',
          content: '《春花秋月何时了》',
        },
      ];
      break;
    case '2025-03-12':
      listData = [
        {
          type: 'night',
          troupe: '红豆团',
          city: '茂名',
          location: '茂南区镇盛镇彭村',
          content: '《焚香记》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '深圳',
          location: '南山区大冲大王古庙',
          content: '《紫钗记》',
        },
      ];
      break;
    case '2025-03-13':
      listData = [
        {
          type: 'night',
          troupe: '深圳团',
          city: '深圳',
          location: '南山区大冲大王古庙',
          content: '《风雨泣萍姬》',
        },
      ];
      break;
    case '2025-03-14':
      listData = [
        {
          type: 'night',
          troupe: '深圳团',
          city: '深圳',
          location: '南山区大冲大王古庙',
          content: '《范蠡献西施》',
        },
      ];
      break;
    case '2025-03-16':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '广州',
          location: '越秀公园红棉舞台',
          content: '英雄花开英雄城 折子戏专场',
        },
      ];
      break;
    case '2025-03-17':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电城镇文屋头村',
          content: '《范蠡献西施》',
        },
      ];
      break;
    case '2025-03-18':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电城镇文屋头村',
          content: '《唐明皇与杨贵妃》',
        },
      ];
      break;
    case '2025-03-19':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电城镇文屋头村',
          content: '《侠盗娇妻状元郎》',
        },
      ];
      break;
    case '2025-03-20':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '茂名',
          location: '电城镇文屋头村',
          content: '《梦断香销四十年》',
        },
      ];
      break;
    case '2025-03-23':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '广州',
          location: '越秀公园红棉舞台',
          content: '英雄花开英雄城 折子戏专场',
        },
      ];
      break;
    case '2025-03-25':
      listData = [
        {
          type: 'night',
          troupe: '省一团',
          city: '湛江',
          location: '坡头区官渡镇北马文化楼',
          content: '《洞庭良缘》',
        },
      ];
      break;
    case '2025-03-26':
      listData = [
        {
          type: 'night',
          troupe: '省一团',
          city: '湛江',
          location: '坡头区官渡镇北马文化楼',
          content: '《白蛇传.情》',
        },
      ];
      break;
    case '2025-03-28':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '香港',
          location: '高山剧场',
          content: '《洛神》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '湛江',
          location: '博铺文化活动中心',
          content: '《焚香记》',
        },
        {
          type: 'night',
          troupe: '深圳团',
          city: '深圳',
          location: '深圳戏院',
          content: '《伦文叙传奇》',
        },
      ];
      break;
    case '2025-03-29':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '香港',
          location: '高山剧场',
          content: '粤剧折子戏专场',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '湛江',
          location: '博铺文化活动中心',
          content: '《搜书院》',
        },
      ];
      break;
    case '2025-03-30':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '香港',
          location: '高山剧场',
          content: '《顺治与董鄂妃》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '湛江',
          location: '博铺文化活动中心',
          content: '《一把存忠剑》',
        },
      ];
      break;
    case '2025-03-31':
      listData = [
        {
          type: 'night',
          troupe: '广州团',
          city: '香港',
          location: '高山剧场',
          content: '《南唐李后主》',
        },
        {
          type: 'night',
          troupe: '红豆团',
          city: '湛江',
          location: '博铺文化活动中心',
          content: '《唐明皇与杨贵妃》',
        },
      ];
      break;
    default:
  }
  return filter(listData) || [];
};
