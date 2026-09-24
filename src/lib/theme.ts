export type Theme = 'dark' | 'light';

const THEME_KEY = 'theme';
const MOTD_KEY = 'motd-seen';

// Runs in <head> before first paint: applies the theme and arms the one-time MOTD playback on "/".
export const bootScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.dataset.theme=t}catch(e){d.dataset.theme='dark'}try{if(location.pathname==='/'&&!sessionStorage.getItem('${MOTD_KEY}')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.motdPlay='';sessionStorage.setItem('${MOTD_KEY}','1')}}catch(e){}})();`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this page view.
  }
}

export function toggleTheme(): void {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}
