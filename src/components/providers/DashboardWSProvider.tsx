"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DashboardWSClient } from "@/lib/ws/client";

interface DashboardWSContextValue {
  client: DashboardWSClient | null;
  isConnected: boolean;
}

const DashboardWSContext = createContext<DashboardWSContextValue>({
  client: null,
  isConnected: false,
});

interface DashboardWSProviderProps {
  children: ReactNode;
}

export function DashboardWSProvider({
  children,
}: DashboardWSProviderProps): React.ReactElement {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Lazy init: construct the client once, but only if NEXT_PUBLIC_WS_URL is set.
  // Constructing the class is side-effect-free; the actual socket open happens
  // in the effect below.
  const [client] = useState<DashboardWSClient | null>(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (wsUrl === undefined || wsUrl.length === 0) return null;

    const supabase = getSupabaseBrowserClient();

    return new DashboardWSClient({
      url: wsUrl,
      getToken: async (): Promise<string | null> => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
      onConnectionChange: (connected: boolean): void => {
        setIsConnected(connected);
      },
      onLog: (level, event, data): void => {
        if (process.env.NODE_ENV === "development") {
          // dev: structured logging point for the WS client
          console[level](`[ws] ${event}`, data ?? "");
        }
      },
    });
  });

  useEffect(() => {
    if (client === null) return;
    void client.connect();
    return (): void => {
      client.disconnect();
    };
  }, [client]);

  return (
    <DashboardWSContext.Provider value={{ client, isConnected }}>
      {children}
    </DashboardWSContext.Provider>
  );
}

export function useDashboardWS(): DashboardWSContextValue {
  return useContext(DashboardWSContext);
}
