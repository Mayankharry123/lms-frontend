import { useCallback, useEffect, useState } from 'react';
import {
  createDefaultDashboardCardPreferences,
  getDashboardCardPreferences,
  saveDashboardCardPreferences,
  type DashboardCardPreferences,
  type DashboardView,
} from '../utils/dashboardCardVisibility';

export const useDashboardCardVisibility = () => {
  const [preferences, setPreferences] = useState<DashboardCardPreferences>(getDashboardCardPreferences);

  useEffect(() => {
    saveDashboardCardPreferences(preferences);
  }, [preferences]);

  const isCardVisible = useCallback(
    (view: DashboardView, cardId: string) => preferences[view][cardId] !== false,
    [preferences],
  );

  const toggleCard = useCallback((view: DashboardView, cardId: string) => {
    setPreferences((current) => ({
      ...current,
      [view]: {
        ...current[view],
        [cardId]: current[view][cardId] === false,
      },
    }));
  }, []);

  const resetCards = useCallback(() => {
    setPreferences(createDefaultDashboardCardPreferences());
  }, []);

  return { preferences, isCardVisible, toggleCard, resetCards };
};