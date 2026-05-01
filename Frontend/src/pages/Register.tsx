import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useSession } from '../hooks/useSession';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { Tema } from '../types';
import { UserPlus, Spade, Flower2 } from 'lucide-react';

const themes: { id: Tema; label: string; description: string; icon: React.ReactNode; colorClass: string; bgImage: string }[] = [
  { 
    id: 'casino', 
    label: 'Casino Poker', 
    description: 'Estilo bar de poker con tapete verde y madera.',
    icon: <Spade size={24} />,
    colorClass: 'border-emerald-500 text-emerald-500',
    bgImage: '/assets/casino_bg.png'
  },
  { 
    id: 'floral', 
    label: 'Magia Floral', 
    description: 'Tonos pastel, suaves y primaverales.',
    icon: <Flower2 size={24} />,
    colorClass: 'border-pink-400 text-pink-400',
    bgImage: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=400&auto=format&fit=crop'
  },
];

export const Register: React.FC = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [tema, setTema] = useState<Tema>('casino');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify({ nombre, correo, password, tema })
      });

      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError('Error al crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg glass-card rounded-3xl p-8 shadow-2xl transition-all duration-500">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white/10 rounded-2xl">
            <UserPlus size={32} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2">Crear Cuenta</h1>
        <p className="opacity-70 text-center mb-8">Personaliza tu experiencia desde el primer paso</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Input
                label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
              />
              <Input
                label="Correo electrónico"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@email.com"
                required
              />
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium opacity-80">Elige tu Estilo Visual</label>
              <div className="space-y-3">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTema(t.id)}
                    className={`group relative w-full h-24 rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                      tema === t.id 
                        ? 'border-white scale-[1.02] ring-4 ring-white/10' 
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={t.bgImage} 
                      alt={t.label}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className={`absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors`} />
                    <div className="absolute inset-0 flex items-center p-4 gap-3 text-white">
                      <div className={`p-2 rounded-xl bg-white/20 backdrop-blur-sm`}>
                        {t.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">{t.label}</div>
                        <div className="text-[10px] opacity-80 leading-tight">{t.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-2">
            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrarse'}
            </Button>
          </div>
        </form>

        <p className="text-center mt-6 text-sm opacity-70">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-bold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};
