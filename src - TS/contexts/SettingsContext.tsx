
"use client";

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface SettingsContextType {
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isLoading] = useState<boolean>(false);

  const value = useMemo(() => ({
    isLoading,
  }), [isLoading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}

