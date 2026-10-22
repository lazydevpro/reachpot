'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PublicDeployment } from '@/lib/shared/protocol';
import { usePoll } from './api';

const Ctx = createContext<{ deployment?: PublicDeployment; error?: string }>({});

export function DeploymentProvider({ children }: { children: ReactNode }) {
  const { data, error } = usePoll<PublicDeployment>('/api/config');
  return <Ctx.Provider value={{ deployment: data, error }}>{children}</Ctx.Provider>;
}

export const useDeployment = () => useContext(Ctx);
