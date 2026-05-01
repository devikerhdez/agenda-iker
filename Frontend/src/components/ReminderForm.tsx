import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Prioridad, Notificacion } from '../types';
import { Trash2, Plus } from 'lucide-react';

interface ReminderFormProps {
  onSubmit: (data: { 
    titulo: string; 
    descripcion: string; 
    fecha_hora: string; 
    prioridad: Prioridad;
    notificaciones?: Notificacion[];
  }) => void;
  isLoading?: boolean;
}

export const ReminderForm: React.FC<ReminderFormProps> = ({ onSubmit, isLoading }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  
  const [quiereNotificacion, setQuiereNotificacion] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([
    { fecha_hora: '', tipo: 'email' }
  ]);

  const handleAddNotificacion = () => {
    setNotificaciones([...notificaciones, { fecha_hora: '', tipo: 'email' }]);
  };

  const handleRemoveNotificacion = (index: number) => {
    setNotificaciones(notificaciones.filter((_, i) => i !== index));
  };

  const handleChangeNotificacion = (index: number, field: keyof Notificacion, value: string) => {
    const newNotifs = [...notificaciones];
    newNotifs[index] = { ...newNotifs[index], [field]: value };
    setNotificaciones(newNotifs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fechaHora) return;

    // Validate notifications if checked
    let notifsToSubmit: Notificacion[] = [];
    if (quiereNotificacion) {
      notifsToSubmit = notificaciones
        .filter(n => n.fecha_hora) // Only valid dates
        .map(n => ({
          ...n,
          fecha_hora: new Date(n.fecha_hora).toISOString()
        }));
    }

    onSubmit({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      fecha_hora: new Date(fechaHora).toISOString(),
      prioridad,
      notificaciones: notifsToSubmit.length > 0 ? notifsToSubmit : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Ej: Reunión de equipo"
        required
      />
      
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">Descripción (Opcional)</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none h-24"
          placeholder="Añade más detalles..."
        />
      </div>

      <Input
        label="Fecha y Hora"
        type="datetime-local"
        value={fechaHora}
        onChange={(e) => setFechaHora(e.target.value)}
        required
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">Prioridad</label>
        <div className="grid grid-cols-3 gap-2">
          {(['baja', 'media', 'muy_alta'] as Prioridad[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrioridad(p)}
              className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
                prioridad === p 
                  ? 'bg-primary/20 border-primary text-primary' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {p === 'muy_alta' ? 'Muy Alta' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Section */}
      <div className="pt-2 border-t border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={quiereNotificacion}
            onChange={(e) => setQuiereNotificacion(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary focus:ring-offset-slate-900 bg-slate-800"
          />
          <span className="text-sm font-medium text-slate-200">¿Quieres recibir notificaciones?</span>
        </label>

        {quiereNotificacion && (
          <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            {notificaciones.map((notif, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <Input
                    label={`Notificación ${index + 1} - Fecha y Hora`}
                    type="datetime-local"
                    value={notif.fecha_hora}
                    onChange={(e) => handleChangeNotificacion(index, 'fecha_hora', e.target.value)}
                    required={quiereNotificacion}
                  />
                </div>
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Medio</label>
                  <select
                    value={notif.tipo}
                    onChange={(e) => handleChangeNotificacion(index, 'tipo', e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-[9px] text-sm text-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value="email">Email</option>
                    <option value="movil">Móvil (Push)</option>
                    <option value="ambas">Ambas</option>
                  </select>
                </div>
                {notificaciones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNotificacion(index)}
                    className="p-2 mb-0.5 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleAddNotificacion}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir otra notificación
            </Button>
          </div>
        )}
      </div>

      <div className="pt-4">
        <Button type="submit" fullWidth disabled={isLoading || !titulo || !fechaHora}>
          {isLoading ? 'Guardando...' : 'Crear Recordatorio'}
        </Button>
      </div>
    </form>
  );
};
