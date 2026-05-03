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
    es_recurrente?: boolean;
    dias_repeticion?: number[];
    notificaciones?: Notificacion[];
  }) => void;
  isLoading?: boolean;
}

export const ReminderForm: React.FC<ReminderFormProps> = ({ onSubmit, isLoading }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  
  type FormNotif = Notificacion & { misma_hora?: boolean };
  
  const [quiereNotificacion, setQuiereNotificacion] = useState(false);
  const [notificaciones, setNotificaciones] = useState<FormNotif[]>([
    { fecha_hora: '', tipo: 'email', misma_hora: false }
  ]);

  const [esRecurrente, setEsRecurrente] = useState(false);
  const [diasRepeticion, setDiasRepeticion] = useState<number[]>([]);

  const toggleDia = (dia: number) => {
    if (diasRepeticion.includes(dia)) {
      setDiasRepeticion(diasRepeticion.filter(d => d !== dia));
    } else {
      setDiasRepeticion([...diasRepeticion, dia]);
    }
  };

  const diasSemana = [
    { label: 'L', value: 1 },
    { label: 'M', value: 2 },
    { label: 'X', value: 3 },
    { label: 'J', value: 4 },
    { label: 'V', value: 5 },
    { label: 'S', value: 6 },
    { label: 'D', value: 0 }
  ];

  const handleAddNotificacion = () => {
    setNotificaciones([...notificaciones, { fecha_hora: '', tipo: 'email' }]);
  };

  const handleRemoveNotificacion = (index: number) => {
    setNotificaciones(notificaciones.filter((_, i) => i !== index));
  };

  const handleChangeNotificacion = (index: number, field: keyof FormNotif, value: any) => {
    const newNotifs = [...notificaciones];
    newNotifs[index] = { ...newNotifs[index], [field]: value };
    setNotificaciones(newNotifs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fechaHora) return;

    // Resolver fechaHora
    let finalFechaHora = fechaHora;
    if (esRecurrente && fechaHora.length <= 5) {
      const today = new Date().toISOString().split('T')[0];
      finalFechaHora = `${today}T${fechaHora}`;
    }

    let notifsToSubmit: Notificacion[] = [];
    if (quiereNotificacion) {
      notifsToSubmit = notificaciones
        .filter(n => n.fecha_hora || n.misma_hora)
        .map(n => {
          let computed = n.fecha_hora;
          if (n.misma_hora) {
            computed = finalFechaHora;
          } else if (esRecurrente && computed.length <= 5) {
            const today = new Date().toISOString().split('T')[0];
            computed = `${today}T${computed}`;
          }
          return {
            tipo: n.tipo,
            fecha_hora: new Date(computed).toISOString()
          };
        });
    }

    onSubmit({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      fecha_hora: new Date(finalFechaHora).toISOString(),
      prioridad,
      es_recurrente: esRecurrente,
      dias_repeticion: esRecurrente ? diasRepeticion : [],
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

      <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">
            {esRecurrente ? 'Hora (Base del ciclo)' : 'Fecha y Hora (Base del recordatorio)'}
          </label>
          <input
            type={esRecurrente ? "time" : "datetime-local"}
            value={esRecurrente && fechaHora.includes('T') ? fechaHora.split('T')[1].substring(0, 5) : fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            onClick={(e) => (e.target as HTMLInputElement).showPicker()}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-[9px] text-sm text-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div className="pt-2 border-t border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={esRecurrente}
              onChange={(e) => setEsRecurrente(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary focus:ring-offset-slate-900 bg-slate-800"
            />
            <span className="text-sm font-medium text-slate-200">¿Repetir este recordatorio (Ciclo semanal)?</span>
          </label>

          {esRecurrente && (
            <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium text-slate-400">Selecciona los días para generar instancias semanales automáticamente:</label>
              <div className="flex flex-wrap gap-2">
                {diasSemana.map(dia => (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDia(dia.value)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      diasRepeticion.includes(dia.value)
                        ? 'bg-primary text-slate-900 shadow-lg shadow-primary/30 scale-110'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {dia.label}
                  </button>
                ))}
              </div>
              {diasRepeticion.length === 0 && (
                <p className="text-xs text-rose-400 mt-1">Selecciona al menos un día para repetir</p>
              )}
            </div>
          )}
        </div>
      </div>

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
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-300">Notificación {index + 1}</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notif.misma_hora}
                        onChange={(e) => handleChangeNotificacion(index, 'misma_hora', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary focus:ring-offset-slate-900 bg-slate-800"
                      />
                      <span className="text-xs text-slate-300">Recibir en el mismo momento</span>
                    </label>
                  </div>
                  {!notif.misma_hora && (
                    <input
                      type={esRecurrente ? "time" : "datetime-local"}
                      value={esRecurrente && notif.fecha_hora.includes('T') ? notif.fecha_hora.split('T')[1].substring(0, 5) : notif.fecha_hora}
                      onChange={(e) => handleChangeNotificacion(index, 'fecha_hora', e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                      required={quiereNotificacion && !notif.misma_hora}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-[9px] text-sm text-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary transition-all mt-1"
                    />
                  )}
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
        <Button type="submit" fullWidth disabled={isLoading || !titulo || !fechaHora || (esRecurrente && diasRepeticion.length === 0)}>
          {isLoading ? 'Guardando...' : 'Crear Recordatorio'}
        </Button>
      </div>
    </form>
  );
};
