import React from 'react';
import './DatePickerModal.css';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (depARTDate: string, returnDate?: string) => void;
  departDate: string;
  returnDate: string;
  flightType: 'round-trip' | 'one-way' | 'multi-city';
  fieldType?: 'departure' | 'return'; // Какой тип поля активен
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  onDateSelect,
  departDate,
  returnDate,
  flightType,
  fieldType = 'departure'
}) => {
  // Начальные месяцы для показа (текущий и следующий)
  // Генерируем все месяцы от текущего до сентября 2026
  const generateMonths = () => {
    const months = [];
    const now = new Date();
    const endDate = new Date(2026, 8); // Сентябрь 2026
    
    let currentDate = new Date(now.getFullYear(), now.getMonth());
    
    while (currentDate <= endDate) {
      months.push({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth()
      });
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    }
    
    return months;
  };
  
  const allMonths = generateMonths();
  
  const [selectedRange, setSelectedRange] = React.useState<DateRange>(() => {
    // Для multi-city НЕ инициализируем выбранную дату - календарь всегда пустой
    if (flightType === 'multi-city') {
      return { start: null, end: null };
    }
    const start = departDate ? new Date(departDate) : null;
    const end = flightType === 'round-trip' && returnDate ? new Date(returnDate) : null;
    return { start, end };
  });

  // Для multi-city работаем как для one-way: всегда выбираем только одну дату
  const isSinglePick = flightType !== 'round-trip';

  // Получаем количество дней в месяце
  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Получаем первый день недели месяцы (0 = воскресенье -> сдвигаем на 1)
  const getFirstDayOfMonth = (month: number, year: number): number => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Понедельник = 0
  };

  // Проверяем, является ли дата сегодняшней
  const isToday = (day: number, month: number, year: number): boolean => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  // Проверяем, раньше ли дата сегодняшней
  const isPast = (day: number, month: number, year: number): boolean => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Проверяем, выбрана ли дата (начало или конец диапазона)
  const isSelected = (day: number, month: number, year: number): boolean => {
    const dayDate = new Date(year, month, day);
    
    if (!selectedRange.start) return false;
    
    if (isSinglePick) {
      return dayDate.getTime() === selectedRange.start.getTime();
    }
    
    if (!selectedRange.end) {
      return dayDate.getTime() === selectedRange.start.getTime();
    }
    
    const startDate = selectedRange.start;
    const endDate = selectedRange.end;
    
    return dayDate.getTime() === startDate.getTime() || 
           dayDate.getTime() === endDate.getTime();
  };

  // Проверяем, находится ли дата в промежутке между выбранными датами
  const isInRange = (day: number, month: number, year: number): boolean => {
    if (isSinglePick || !selectedRange.start || !selectedRange.end) return false;
    
    const dayDate = new Date(year, month, day);
    const startDate = selectedRange.start;
    const endDate = selectedRange.end;
    
    // Определяем более раннюю и позднюю дату
    const earlyDate = startDate < endDate ? startDate : endDate;
    const lateDate = startDate < endDate ? endDate : startDate;
    
    return dayDate > earlyDate && dayDate < lateDate;
  };

  // Проверяем, является ли дата выделенной (начало или конец диапазона)
  const isRangeEnd = (day: number, month: number, year: number): boolean => {
    return isSelected(day, month, year);
  };

  // Форматирует дату в YYYY-MM-DD без учета часового пояса
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Обработчик клика по дате в календаре
  const handleDateClick = (day: number, month: number, year: number) => {
    if (isPast(day, month, year)) return;
    
    const clickedDate = new Date(year, month, day);
    
    console.log('DatePicker: Date clicked:', {
      day,
      month,
      year,
      clickedDate: clickedDate.toISOString(),
      selectedRange,
      isSinglePick
    });
    
    if (isSinglePick) {
      setSelectedRange({ start: clickedDate, end: null });
      // Сразу обновляем дату отправления
      const formattedDepart = formatDateLocal(clickedDate);
      console.log('DatePicker: Single pick - formatted date:', formattedDepart);
      onDateSelect(formattedDepart);
    } else {
      if (!selectedRange.start) {
        // Первый клик — выбрать дату вылета
        setSelectedRange({ start: clickedDate, end: null });
        const formattedDepart = formatDateLocal(clickedDate);
        console.log('DatePicker: First click - formatted depart:', formattedDepart);
        onDateSelect(formattedDepart, returnDate || undefined);
      } else if (!selectedRange.end) {
        // Второй клик — если тот же день, позволяем туда-обратно в один день
        const isSameDay = clickedDate.toDateString() === selectedRange.start.toDateString();
        const startDate = selectedRange.start;
        const endDate = clickedDate;
        const sortedStart = startDate < clickedDate ? startDate : endDate;
        const sortedEnd = startDate < clickedDate ? endDate : startDate;
        setSelectedRange({ start: sortedStart, end: sortedEnd });
        const formattedDepart = formatDateLocal(sortedStart);
        const formattedReturn = formatDateLocal(sortedEnd);
        console.log('DatePicker: Second click - formatted dates:', { formattedDepart, formattedReturn });
        onDateSelect(formattedDepart, formattedReturn);
      } else {
        // Третий клик — начать заново с новой даты вылета
        setSelectedRange({ start: clickedDate, end: null });
        const formattedDepart = formatDateLocal(clickedDate);
        console.log('DatePicker: Third click - formatted depart:', formattedDepart);
        onDateSelect(formattedDepart, returnDate || undefined);
      }
    }
  };

  // Обработчик клика по полю выбранной даты
  const handleDateFieldClick = (type: 'start' | 'end') => {
    if (type === 'start') {
      // Начинаем новый выбор с даты отправления
      setSelectedRange({ start: null, end: null });
      // Сбрасываем даты
      onDateSelect('', flightType === 'round-trip' ? '' : undefined);
    } else {
      // Начинаем новый выбор с даты возврата (только если есть начальная дата)
      if (selectedRange.start) {
        setSelectedRange({ start: selectedRange.start, end: null });
      }
    }
  };

  // Форматирование даты для отображения
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    };
    return date.toLocaleDateString('en-GB', options);
  };

  // Derived flags
  const isRoundTrip = flightType === 'round-trip';
  const hasStart = !!selectedRange.start;
  const hasEnd = !!selectedRange.end;
  const isSameDayRoundTrip = isRoundTrip && hasStart && hasEnd && selectedRange.start!.toDateString() === selectedRange.end!.toDateString();
  const doneDisabled = isSinglePick ? !hasStart : !hasStart || !hasEnd;

  // Рендер календаря для месяца
  const renderMonth = (monthData: { year: number; month: number }) => {
    const { year: actualYear, month: actualMonth } = monthData;
    
    const daysInMonth = getDaysInMonth(actualMonth, actualYear);
    const firstDay = getFirstDayOfMonth(actualMonth, actualYear);

    return (
      <div key={`${actualYear}-${actualMonth}`} className="month-container">
        <h3 className="month-title">
          {MONTHS[actualMonth]} {actualYear}
        </h3>
        <div className="days-grid">
          {DAYS.map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="day-cell empty"></div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isPastDay = isPast(day, actualMonth, actualYear);
            const isTodayDay = isToday(day, actualMonth, actualYear);
            const isSelectedDay = isSelected(day, actualMonth, actualYear);
            const isRangeEndDay = isRangeEnd(day, actualMonth, actualYear);
            const sameDayClass = (() => {
              try {
                if (!selectedRange.start) return '';
                if (!selectedRange.end) return '';
                const d = new Date(actualYear, actualMonth, day);
                return d.toDateString() === selectedRange.start.toDateString() && d.toDateString() === selectedRange.end.toDateString() ? ' same-day' : '';
              } catch { return ''; }
            })();
            const isInRangeDay = isInRange(day, actualMonth, actualYear);

            return (
              <div
                key={day}
                className={`day-cell ${isPastDay ? 'past' : ''} ${isTodayDay ? 'today' : ''} ${isSelectedDay ? 'selected' : ''} ${isRangeEndDay ? 'range-end' : ''} ${isInRangeDay ? 'in-range' : ''}${sameDayClass}`}
                onClick={() => !isPastDay && handleDateClick(day, actualMonth, actualYear)}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Обработчик закрытия с применением выбранных дат
  const handleDone = () => {
    if (selectedRange.start) {
      const startStr = formatDateLocal(selectedRange.start);
      const endStr = selectedRange.end ? formatDateLocal(selectedRange.end) : undefined;
      
      if (isSinglePick) {
        onDateSelect(startStr);
      } else {
        onDateSelect(startStr, endStr || undefined);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="date-picker-overlay" onClick={onClose}>
      <div className="date-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="date-picker-header">
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          <h2 className="date-picker-title">When?</h2>
        </div>

        {/* Календарь */}
        <div className="calendar-container">
          {allMonths.map(monthData => renderMonth(monthData))}
        </div>

        {/* Выбранные даты */}
        <div className="selected-dates">
          <div 
            className={`selected-date-field ${flightType === 'round-trip' ? '' : 'single-field'} ${departDate ? 'filled' : ''} ${isSameDayRoundTrip ? 'same-day' : ''}`}
            onClick={() => handleDateFieldClick('start')}
          >
            <svg className="calendar-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm12 6H5v12h14V8zM7 10h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 14h2v2H7v-2zm4 0h2v2h-2v-2z"/></svg>
            <span>{formatDateForDisplay(departDate) || 'Select departure date'}</span>
          </div>
          
          {flightType === 'round-trip' && (
            <div 
              className={`selected-date-field ${returnDate ? 'filled' : ''} ${isSameDayRoundTrip ? 'same-day' : ''}`}
              onClick={() => handleDateFieldClick('end')}
            >
              <svg className="calendar-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm12 6H5v12h14V8zM7 10h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 14h2v2H7v-2zm4 0h2v2h-2v-2z"/></svg>
              <span>{formatDateForDisplay(returnDate) || 'Select return date'}</span>
            </div>
          )}
        </div>

        {/* Кнопка Done */}
        <button className="done-button" onClick={handleDone} disabled={doneDisabled}>
          Done
        </button>
      </div>
    </div>
  );
};

export default DatePickerModal;
