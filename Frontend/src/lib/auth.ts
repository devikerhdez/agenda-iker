import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export interface SessionData {
  id: string;
  nombre: string;
  tema: string;
}

export const saveSession = (user: SessionData) => {
  localStorage.setItem('agenda_session', JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem('agenda_session');
};

export const getSession = (): SessionData | null => {
  const data = localStorage.getItem('agenda_session');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
};
