/**
 * Theme Utilities
 * 
 * Handles dark/light theme configuration
 */

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  theme: Theme;
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
    border?: string;
  };
}

/**
 * Get current theme
 */
export function getCurrentTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = localStorage.getItem('paymind-theme');
  if (stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
    return stored as Theme;
  }

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'auto';
  }

  return 'light';
}

/**
 * Set theme
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('paymind-theme', theme);
  applyTheme(theme);
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return;
  }

  const root = document.documentElement;
  
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  }
}

/**
 * Initialize theme on page load
 */
export function initializeTheme(): void {
  const theme = getCurrentTheme();
  applyTheme(theme);

  // Listen for system theme changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (getCurrentTheme() === 'auto') {
        applyTheme('auto');
      }
    });
  }
}

/**
 * Get theme-aware color
 */
export function getThemeColor(color: 'primary' | 'secondary' | 'background' | 'text' | 'border'): string {
  const theme = getCurrentTheme();
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const colors = {
    light: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#ffffff',
      text: '#1f2937',
      border: '#e5e7eb',
    },
    dark: {
      primary: '#60a5fa',
      secondary: '#a78bfa',
      background: '#111827',
      text: '#f9fafb',
      border: '#374151',
    },
  };

  return colors[isDark ? 'dark' : 'light'][color];
}

