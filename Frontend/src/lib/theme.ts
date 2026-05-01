import type { Tema } from '../types';

export const applyTheme = (tema: Tema | string) => {
  document.documentElement.setAttribute('data-theme', tema);
};
