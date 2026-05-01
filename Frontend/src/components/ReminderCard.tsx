import React from 'react';
import type { Recordatorio } from '../types';
import { Clock, CheckCircle2, Circle } from 'lucide-react';
import { formatDistanceToNow, isPast, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReminderCardProps {
  reminder: Recordatorio;
  onToggleComplete: (id: string, completado: boolean) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

const priorityStyles = {
  baja: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  media: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  muy_alta: 'text-red-400 bg-red-400/10 border-red-400/20'
};

const priorityLabels = {
  baja: 'Baja',
  media: 'Media',
  muy_alta: 'Prioritaria'
};

export const ReminderCard: React.FC<ReminderCardProps> = ({ reminder, onToggleComplete, isSelected, onSelect }) => {
  const date = new Date(reminder.fecha_hora);
  const past = isPast(date) && !reminder.completado;
  
  return (
    <div className={`p-4 flex items-start gap-4 transition-all ${
      reminder.completado ? 'opacity-50' : past ? 'bg-red-500/5' : ''
    } ${isSelected ? 'bg-primary/10' : ''}`}>
      
      <div className="mt-1 shrink-0 flex items-center gap-3">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary cursor-pointer"
        />
        <button 
          onClick={() => onToggleComplete(reminder.id, !reminder.completado)}
          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
        >
          {reminder.completado ? (
            <CheckCircle2 className="text-primary" size={24} />
          ) : (
            <Circle className="opacity-30" size={24} />
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className={`text-base font-bold truncate ${reminder.completado ? 'line-through opacity-60' : ''}`}>
            {reminder.titulo}
          </h4>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityStyles[reminder.prioridad]}`}>
            {priorityLabels[reminder.prioridad]}
          </span>
        </div>
        
        {reminder.descripcion && (
          <p className="text-sm opacity-70 mb-2 line-clamp-2 leading-relaxed">
            {reminder.descripcion}
          </p>
        )}
        
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${past ? 'text-red-400' : 'opacity-50'}`}>
          <Clock size={14} />
          <span>
            {format(date, 'HH:mm')} ({formatDistanceToNow(date, { addSuffix: true, locale: es })})
          </span>
        </div>
      </div>
    </div>
  );
};
