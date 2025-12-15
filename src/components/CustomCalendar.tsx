import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import '../styles/custom-calendar.css';

interface CustomCalendarProps {
  value: dayjs.Dayjs;
  onChange: (date: dayjs.Dayjs) => void;
  cellRender: (date: dayjs.Dayjs) => React.ReactNode;
  onCellClick?: (date: dayjs.Dayjs) => void;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  value,
  onChange,
  cellRender,
  onCellClick
}) => {
  const year = value.year();
  const month = value.month();

  // 获取该月的第一天和最后一天
  const firstDay = dayjs(`${year}-${month + 1}-01`);
  const lastDay = firstDay.endOf('month');
  const daysInMonth = lastDay.date();

  // 获取第一天是周几（0=周日, 1=周一, ..., 6=周六）
  // 调整为周一开始：原周日(0)变成6，原周一(1)变成0
  let firstDayOfWeek: number = firstDay.day();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // 生成日历网格
  const days: (number | null)[] = [];
  
  // 添加前一个月的日期
  const prevMonth = firstDay.subtract(1, 'month');
  const prevMonthDays = prevMonth.daysInMonth();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(-(prevMonthDays - i));
  }

  // 添加当前月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // 添加下一个月的日期填满网格
  const remainingDays = 42 - days.length; // 6行 * 7列
  for (let i = 1; i <= remainingDays; i++) {
    days.push(-(1000 + i)); // 负数表示下一个月的日期
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="custom-calendar">
      <div className="calendar-grid">
        {/* 周头 */}
        {weekDays.map((day) => (
          <div key={`week-${day}`} className="calendar-weekday">
            {day}
          </div>
        ))}

        {/* 日期单元格 */}
        {days.map((dayNum, index) => {
          if (dayNum === null) return null;
          
          let date: dayjs.Dayjs;
          let isCurrentMonth = true;
          let isOtherMonth = false;

          if (dayNum > 0) {
            // 当前月
            date = dayjs(`${year}-${month + 1}-${dayNum}`);
          } else if (dayNum < -999) {
            // 下一个月
            const nextMonth = firstDay.add(1, 'month');
            const actualDay = -(dayNum + 1000);
            date = dayjs(`${nextMonth.year()}-${nextMonth.month() + 1}-${actualDay}`);
            isCurrentMonth = false;
            isOtherMonth = true;
          } else {
            // 前一个月
            const actualDay = prevMonthDays + dayNum + 1;
            date = dayjs(`${prevMonth.year()}-${prevMonth.month() + 1}-${actualDay}`);
            isCurrentMonth = false;
            isOtherMonth = true;
          }

          const isToday = date.isSame(dayjs(), 'day');
          const isSelected = date.isSame(value, 'day');

          return (
            <div
              key={`day-${index}`}
              className={`calendar-cell ${!isCurrentMonth ? 'other-month' : ''} ${
                isToday ? 'today' : ''
              } ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                onChange(date);
                onCellClick?.(date);
              }}
            >
              <div className="cell-date">{Math.abs(dayNum % 1000)}</div>
              <div className="cell-content">{cellRender(date)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
