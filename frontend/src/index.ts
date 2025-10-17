// Main barrel export file
export { default as App } from './app/App';
export { HomePage } from './pages/Home';
export { DashboardPage } from './pages/Dashboard';
export { ThemeToggle } from './components/shared/ThemeToggle';
export { ImageWithFallback } from './components/shared/ImageWithFallback';

// Re-export commonly used utilities
export * from './lib/utils';
export * from './lib/hooks';
export * from './lib/api';
