import React, { useState } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  isToday, addMonths, subMonths 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Recordatorio } from '../types';

interface CalendarProps {
  reminders: Recordatorio[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ reminders, selectedDate, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="glass-card p-4 rounded-3xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => (
          <div key={day} className="text-center text-[10px] font-black uppercase tracking-tighter opacity-40 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const dayReminders = reminders.filter(r => isSameDay(new Date(r.fecha_hora), day));
          const hasReminders = dayReminders.length > 0;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={`relative flex flex-col items-center justify-center h-10 w-full rounded-xl transition-all ${
                !isCurrentMonth ? 'opacity-20 pointer-events-none' :
                isSelected ? 'bg-primary text-white font-black shadow-lg scale-110 z-10' :
                today ? 'ring-2 ring-primary/50 text-primary font-bold' :
                'hover:bg-white/10 font-medium'
              }`}
            >
              <span className="text-sm">{format(day, 'd')}</span>
              {hasReminders && (
                <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected || today ? 'bg-white' : 'bg-primary'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
