/**
 * @file App.tsx
 * @description Root application component. Wraps the LMS UI with global error handling,
 *              sidebar permission context, and client-side routing (`AppRoutes`).
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import ErrorBoundary from './components/ui/ErrorBoundary';
import { SidebarMenuProvider } from './context/SidebarMenuContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppRoutes } from './routes';

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <SidebarMenuProvider>
          <AppRoutes />
        </SidebarMenuProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
