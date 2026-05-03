import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { LogOut, Plus, Calendar as CalendarIcon, ListTodo, BellOff, BellRing } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { clearSession } from '../lib/auth';
import { apiFetch } from '../lib/api';
import type { Recordatorio, Prioridad } from '../types';
import { Calendar } from '../components/Calendar';
import { ReminderCard } from '../components/ReminderCard';
import { ReminderForm } from '../components/ReminderForm';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { isSameDay, isBefore, startOfDay } from 'date-fns';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { requestPushPermission, subscribeToPushNotifications } from '../lib/push';

export const Dashboard: React.FC = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [reminders, setReminders] = useState<Recordatorio[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'pending' | 'completed' | 'cycles'>('all');
  
  // Selección múltiple (Gmail style)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');

  const handleSubscribePush = async () => {
    if (!session?.id) return;
    setPushStatus('loading');
    const granted = await requestPushPermission();
    if (!granted) {
      setPushStatus('denied');
      return;
    }
    const ok = await subscribeToPushNotifications(session.id);
    setPushStatus(ok ? 'ok' : 'idle');
  };

  useEffect(() => {
    if (session) {
      loadReminders();
      // Intentar suscripción automática si ya tiene permiso
      if (Notification.permission === 'granted') {
        subscribeToPushNotifications(session.id).then(ok => {
          if (ok) setPushStatus('ok');
        });
      }
    }
  }, [session]);

  const loadReminders = async () => {
    if (!session?.id) return;
    try {
      const result = await apiFetch(`/reminders?userId=${session.id}`);
      setReminders(result as Recordatorio[]);
    } catch (err) {
      console.error('Error cargando recordatorios', err);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleCreateReminder = async (data: { titulo: string; descripcion: string; fecha_hora: string; prioridad: Prioridad; es_recurrente?: boolean; dias_repeticion?: number[]; notificaciones?: any[] }) => {
    setIsSubmitting(true);
    try {
      await apiFetch('/reminders', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: session?.id,
          ...data
        })
      });
      await loadReminders();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creando recordatorio', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (id: string, completado: boolean) => {
    try {
      await apiFetch(`/reminders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completado })
      });
      setReminders(prev => prev.map(r => r.id === id ? { ...r, completado } : r));
    } catch (err) {
      console.error('Error actualizando', err);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'complete') => {
    if (selectedIds.size === 0) return;
    
    try {
      await apiFetch('/reminders/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action
        })
      });
      
      if (action === 'delete') {
        setReminders(prev => prev.filter(r => !selectedIds.has(r.id)));
      } else {
        setReminders(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, completado: true } : r));
      }
      setSelectedIds(new Set());
      setConfirmDeleteAll(false);
    } catch (err) {
      console.error('Error en acción por lote', err);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === displayedReminders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedReminders.map(r => r.id)));
    }
  };

  const selectByDate = (range: 'past' | 'today') => {
    const now = new Date();
    let filteredIds: string[] = [];
    
    if (range === 'past') {
      filteredIds = reminders.filter(r => isBefore(new Date(r.fecha_hora), startOfDay(now))).map(r => r.id);
    } else if (range === 'today') {
      filteredIds = reminders.filter(r => isSameDay(new Date(r.fecha_hora), now)).map(r => r.id);
    }
    
    setSelectedIds(new Set(filteredIds));
  };

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  const pendingReminders = reminders.filter(r => !r.es_recurrente && !r.completado);
  const completedReminders = reminders.filter(r => !r.es_recurrente && r.completado);
  const cycleReminders = reminders.filter(r => r.es_recurrente);
  
  let baseReminders = reminders.filter(r => !r.es_recurrente); // default for 'all'
  if (viewMode === 'pending') baseReminders = pendingReminders;
  if (viewMode === 'completed') baseReminders = completedReminders;
  if (viewMode === 'cycles') baseReminders = cycleReminders;

  const displayedReminders = selectedDate && viewMode !== 'cycles'
    ? baseReminders.filter(r => isSameDay(new Date(r.fecha_hora), selectedDate))
    : baseReminders;

  const groupedReminders = displayedReminders.reduce((acc, r) => {
    const dateKey = new Date(r.fecha_hora).toLocaleDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(r);
    return acc;
  }, {} as Record<string, Recordatorio[]>);
  
  const sortedDates = Object.keys(groupedReminders).sort((a, b) => {
    const dateA = groupedReminders[a][0].fecha_hora;
    const dateB = groupedReminders[b][0].fecha_hora;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-30">
        <div className="h-[env(safe-area-inset-top)] bg-slate-950/80 backdrop-blur-md" />
        <nav className="glass-card bg-opacity-20! backdrop-blur-md border-b border-white/10 shadow-lg">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl">
              <CalendarIcon size={24} className="text-primary" />
              <span>D'Agenda</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline opacity-80">
                ¡Hola, <span className="font-bold">{session.nombre}</span>! 👋
              </span>
              <button 
                onClick={() => navigate('/notas')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-sm font-bold rounded-xl transition-all border border-white/10"
              >
                Notas
              </button>
              {/* Push Notification Bell */}
              <button
                onClick={handleSubscribePush}
                disabled={pushStatus === 'loading'}
                title={
                  pushStatus === 'ok' ? 'Notificaciones activas' :
                  pushStatus === 'denied' ? 'Permiso denegado — actívalo en ajustes del navegador' :
                  'Activar notificaciones push'
                }
                className={`p-2 rounded-xl transition-all border ${
                  pushStatus === 'ok'
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : pushStatus === 'denied'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-white/10 border-white/10 opacity-60 hover:opacity-100'
                }`}
              >
                {pushStatus === 'denied'
                  ? <BellOff size={18} />
                  : <BellRing size={18} className={pushStatus === 'loading' ? 'animate-pulse' : ''} />
                }
              </button>
              <button 
                onClick={handleLogout}
                className="opacity-60 hover:opacity-100 transition-opacity p-2 rounded-xl bg-white/10"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </nav>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full flex-1">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ListTodo className="text-primary" size={24} />
              <h2 className="text-2xl font-bold">
                {selectedDate ? `Día ${selectedDate.toLocaleDateString()}` : 'Recordatorios'}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                className="shadow-lg shadow-primary/30"
                onClick={() => {
                  if (selectedDate) {
                    setSelectedDate(null);
                  } else {
                    setSelectedDate(new Date());
                  }
                  setViewMode('all');
                }}
              >
                {selectedDate ? 'Ver todos' : 'Ver hoy'}
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setViewMode('cycles')}
                className={viewMode === 'cycles' ? 'shadow-lg shadow-primary/30 ring-2 ring-white/20' : 'opacity-80'}
              >
                Ver ciclos
              </Button>
              <Button onClick={() => setIsModalOpen(true)} size="sm">
                <Plus size={18} className="mr-1" />
                Nuevo
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-3 glass-card rounded-2xl bg-primary/5 border-primary/20">
            <div className="flex items-center gap-4">
              <input 
                type="checkbox" 
                checked={selectedIds.size === displayedReminders.length && displayedReminders.length > 0}
                onChange={selectAll}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary cursor-pointer"
              />
              <div className="flex gap-2">
                <button onClick={() => selectByDate('past')} className="text-xs font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors">Pasados</button>
                <button onClick={() => selectByDate('today')} className="text-xs font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors">Hoy</button>
              </div>
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                <span className="text-sm font-bold text-primary">{selectedIds.size} seleccionados</span>
                <button 
                  onClick={() => handleBulkAction('complete')}
                  className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                  title="Marcar como completados"
                >
                  <ListTodo size={20} />
                </button>
                <button 
                  onClick={() => setConfirmDeleteAll(true)}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Borrar seleccionados"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {displayedReminders.length === 0 ? (
              <div className="text-center py-12 glass-card rounded-3xl border-dashed">
                <p className="opacity-50">No hay tareas para mostrar.</p>
              </div>
            ) : (
              sortedDates.map(dateKey => (
                <div key={dateKey} className="space-y-3">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 bg-white/80 dark:bg-slate-900/80 px-4 py-2 rounded-xl border border-white/20 w-fit sticky top-20 z-10 shadow-sm">
                    {viewMode === 'cycles' ? 'Ciclos de Repetición' : dateKey}
                  </h3>
                  <div className="space-y-3">
                    {groupedReminders[dateKey].map(reminder => (
                      <div key={reminder.id} className="glass-card rounded-2xl overflow-hidden transition-transform hover:scale-[1.01]">
                        <ReminderCard 
                          reminder={reminder} 
                          onToggleComplete={handleToggleComplete}
                          isSelected={selectedIds.has(reminder.id)}
                          onSelect={() => toggleSelect(reminder.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-3xl overflow-hidden p-1">
            <Calendar reminders={reminders} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
          
          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              Tu Resumen
            </h3>
            <div className="space-y-4">
              <button 
                onClick={() => setViewMode('pending')}
                className={`w-full flex justify-between items-center p-3 rounded-2xl transition-colors ${viewMode === 'pending' ? 'bg-primary/20 ring-2 ring-primary/50' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span className="opacity-80">Pendientes</span>
                <span className="font-bold text-xl text-primary">{pendingReminders.length}</span>
              </button>
              <button 
                onClick={() => setViewMode('completed')}
                className={`w-full flex justify-between items-center p-3 rounded-2xl transition-colors ${viewMode === 'completed' ? 'bg-white/20 ring-2 ring-white/50' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span className="opacity-80">Completados</span>
                <span className="font-bold text-xl opacity-60">{completedReminders.length}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <ConfirmModal 
        isOpen={confirmDeleteAll}
        title="¿Borrar seleccionados?"
        message={`Estás a punto de borrar ${selectedIds.size} recordatorios de forma permanente.`}
        confirmLabel="Borrar todo"
        onConfirm={() => handleBulkAction('delete')}
        onCancel={() => setConfirmDeleteAll(false)}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Nuevo Recordatorio"
      >
        <div className="p-1">
          <ReminderForm onSubmit={handleCreateReminder} isLoading={isSubmitting} />
        </div>
      </Modal>
    </div>
  );
};
