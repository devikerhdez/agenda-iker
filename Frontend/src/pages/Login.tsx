import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { saveSession } from '../lib/auth';
import { useSession } from '../hooks/useSession';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password })
      });

      saveSession({
        id: user.id,
        nombre: user.nombre,
        tema: user.tema
      });
      
      document.documentElement.setAttribute('data-theme', user.tema);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Credenciales incorrectas o error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl transition-all">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-white/10 rounded-2xl">
            <LogIn size={32} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2">Bienvenido</h1>
        <p className="opacity-70 text-center mb-8">Inicia sesión para acceder a tu agenda personalizada</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
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
          />
          
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm opacity-70">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-bold hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
};
