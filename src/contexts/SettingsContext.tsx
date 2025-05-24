
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type SettingsContextType = {
  useDemoData: boolean;
  setUseDemoData: (useDemo: boolean) => void;
  isLoading: boolean; // To handle initial load from localStorage
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [useDemoData, setUseDemoDataState] = useState<boolean>(true); // Default to true
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedSetting = localStorage.getItem('useDemoData');
      if (storedSetting !== null) {
        setUseDemoDataState(JSON.parse(storedSetting));
      }
    } catch (error) {
      console.error("Error reading 'useDemoData' from localStorage", error);
      // Keep default if error
    }
    setIsLoading(false);
  }, []);

  const setUseDemoData = useCallback((useDemo: boolean) => {
    try {
      localStorage.setItem('useDemoData', JSON.stringify(useDemo));
      setUseDemoDataState(useDemo);
    } catch (error) {
      console.error("Error saving 'useDemoData' to localStorage", error);
    }
  }, []);

  const value = { useDemoData, setUseDemoData, isLoading };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}
