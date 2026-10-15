import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppConfig, defaultConfig, loadConfig, saveConfig } from './config';

interface ConfigContextValue {
  config: AppConfig;
  ready: boolean;
  update: (patch: Partial<AppConfig>) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: defaultConfig,
  ready: false,
  update: async () => {},
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadConfig().then((c) => {
      setConfig(c);
      setReady(true);
    });
  }, []);

  const update = async (patch: Partial<AppConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    await saveConfig(next);
  };

  return (
    <ConfigContext.Provider value={{ config, ready, update }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
