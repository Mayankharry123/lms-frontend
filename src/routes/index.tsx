import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { AuthSessionHandler } from './guards';
import { publicRoutes } from './public.routes';
import { protectedRoutes } from './protected.routes';

export const AppRoutes: React.FC = () => (
  <Router>
    <AuthSessionHandler />
    <Routes>
      {publicRoutes}
      {protectedRoutes}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  </Router>
);
