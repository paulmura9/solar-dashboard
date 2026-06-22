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
import { WS_CLIENT_PATH } from "@/lib/ws/constants";

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

  const [client] = useState<DashboardWSClient | null>(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (wsUrl === undefined || wsUrl.length === 0) {
      console.warn(
        "[config] NEXT_PUBLIC_WS_URL is not set - live updates (telemetry and command status) are disabled. Set it in your environment and in the Vercel project settings.",
      );
      return null;
    }

    const supabase = getSupabaseBrowserClient();

    const url = `${wsUrl.replace(/\/+$/, "")}${WS_CLIENT_PATH}`;

    return new DashboardWSClient({
      url,
      getToken: async (): Promise<string | null> => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
      onConnectionChange: (connected: boolean): void => {
        setIsConnected(connected);
      },
      onLog: (level, event, data): void => {
        if (process.env.NODE_ENV === "development") {
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
