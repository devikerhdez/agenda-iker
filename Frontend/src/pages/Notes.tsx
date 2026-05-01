import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, FileText, Copy } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useSession } from '../hooks/useSession';
import { apiFetch } from '../lib/api';
import type { Nota } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Notes: React.FC = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<Nota[]>([]);
  const [selectedNote, setSelectedNote] = useState<Nota | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  // States for the active editor

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (session) {
      loadNotes();
    }
  }, [session]);

  // Load active note into editor state when selected changes
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.titulo);
      setContent(selectedNote.contenido || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [selectedNote]);

  const loadNotes = async () => {
    if (!session?.id) return;
    try {
      const result = await apiFetch(`/notas?userId=${session.id}`);
      setNotes(result as Nota[]);
    } catch (err) {
      console.error('Error cargando notas', err);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await apiFetch('/notas', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: session?.id,
          titulo: 'Nueva nota',
          contenido: ''
        })
      });
      setNotes([newNote as Nota, ...notes]);
      setSelectedNote(newNote as Nota);
    } catch (err) {
      console.error('Error creando nota', err);
    }
  };

  const handleDuplicateNote = async (note: Nota, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newNote = await apiFetch('/notas', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: session?.id,
          titulo: `${note.titulo} (copia)`,
          contenido: note.contenido
        })
      });
      setNotes([newNote as Nota, ...notes]);
      setSelectedNote(newNote as Nota);
    } catch (err) {
      console.error('Error duplicando nota', err);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    
    try {
      await apiFetch(`/notas/${noteToDelete}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
      if (selectedNote?.id === noteToDelete) {
        setSelectedNote(null);
      }
      setNoteToDelete(null);
    } catch (err) {
      console.error('Error eliminando nota', err);
    }
  };


  // Auto-save logic
  const handleContentChange = (newTitle: string, newContent: string) => {
    setTitle(newTitle);
    setContent(newContent);
    
    if (!selectedNote) return;

    // Update local state immediately for fast UI
    setNotes(prev => prev.map(n => 
      n.id === selectedNote.id 
        ? { ...n, titulo: newTitle || 'Sin título', contenido: newContent, updated_at: new Date().toISOString() } 
        : n
    ));

    // Debounce the API call
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiFetch(`/notas/${selectedNote.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            titulo: newTitle || 'Sin título',
            contenido: newContent
          })
        });
        // We could reload notes here, but the local optimistic update is usually fine
      } catch (err) {
        console.error('Error guardando nota', err);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Save 1 second after user stops typing
  };

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900/10">
      {/* Navbar Minimalista */}
      <nav className="glass-card bg-opacity-40! backdrop-blur-md sticky top-0 z-20 border-b border-white/10">
        <div className="w-full px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 font-semibold hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Volver a Dashboard</span>
          </button>
          
          <div className="flex items-center gap-4">
            {isSaving && <span className="text-xs opacity-50 flex items-center gap-1"><Save size={12}/> Guardando...</span>}
            <button 
              onClick={handleCreateNote}
              className="p-2 bg-primary/20 hover:bg-primary/40 text-primary rounded-xl transition-colors flex items-center gap-1"
            >
              <Plus size={18} />
              <span className="text-sm font-bold hidden sm:inline">Nueva Nota</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Layout: Sidebar + Editor */}
      <main className="flex-1 flex overflow-hidden max-h-[calc(100vh-3.5rem)]">
        
        {/* Sidebar */}
        <aside className={`w-full md:w-80 border-r border-white/10 flex flex-col glass-card rounded-none! border-y-0! border-l-0! ${selectedNote ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <FileText className="text-primary" size={20} />
            <h2 className="font-bold text-lg">Mis Notas</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {notes.length === 0 ? (
              <p className="text-center opacity-40 p-4 text-sm">No hay notas aún.</p>
            ) : (
              notes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map(note => (
                <div 
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-3 rounded-xl cursor-pointer transition-all group flex flex-col ${
                    selectedNote?.id === note.id 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm truncate pr-2 flex-1">{note.titulo}</h3>
                    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-all shrink-0">
                      <button 
                        onClick={(e) => handleDuplicateNote(note, e)}
                        className="p-1 hover:bg-primary/20 hover:text-primary rounded transition-colors"
                        title="Duplicar"
                      >
                        <Copy size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteToDelete(note.id);
                        }}
                        className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs opacity-50 truncate mb-2">{note.contenido || 'Sin contenido adicional'}</p>
                  <span className="text-[10px] opacity-40">{format(new Date(note.updated_at), "d MMM, HH:mm", { locale: es })}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Editor Area */}
        <section className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/90 relative ${!selectedNote ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {/* Fondo opaco para ocultar la imagen de fondo principal y dar aspecto de documento */}
          <div className="absolute inset-0 bg-white dark:bg-[#1e2330] z-0" style={{ opacity: document.documentElement.getAttribute('data-theme') === 'floral' ? 0.95 : 1 }}></div>

          {!selectedNote ? (
            <div className="text-center opacity-40 z-10">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Selecciona una nota o crea una nueva</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 sm:p-8 z-10 overflow-y-auto">
              <button 
                className="md:hidden flex items-center gap-1 text-sm font-semibold opacity-60 mb-6 hover:opacity-100 transition-opacity w-fit"
                onClick={() => setSelectedNote(null)}
              >
                <ArrowLeft size={16} /> Volver a notas
              </button>

              <input
                type="text"
                value={title}
                onChange={(e) => handleContentChange(e.target.value, content)}
                placeholder="Título de la nota"
                className="text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none mb-6 placeholder:opacity-30 text-slate-800 dark:text-slate-100"
              />
              
              <textarea
                value={content}
                onChange={(e) => handleContentChange(title, e.target.value)}
                placeholder="Empieza a escribir..."
                className="flex-1 w-full resize-none bg-transparent border-none outline-none text-base sm:text-lg leading-relaxed placeholder:opacity-30 text-slate-700 dark:text-slate-300"
              />
            </div>
          )}
        </section>

      </main>

      <ConfirmModal 
        isOpen={!!noteToDelete}
        title="¿Eliminar nota?"
        message="Esta acción no se puede deshacer. La nota se borrará permanentemente."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteNote}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );
};
