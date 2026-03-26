"use client";

import { getApiBaseUrl } from "@/lib/api/http";
import type {
  NotificationsErrorEvent,
  NotificationsNewEvent,
  NotificationsReadAllEvent,
  NotificationsReadEvent,
  NotificationsReadyEvent,
  NotificationsUnreadCountEvent,
} from "@/lib/types";

type SocketHandler = (payload?: unknown) => void;

interface SocketLike {
  on: (event: string, handler: SocketHandler) => void;
  off: (event: string, handler?: SocketHandler) => void;
  disconnect: () => void;
  auth?: Record<string, string>;
  connected?: boolean;
}

interface WindowWithSocketIo extends Window {
  io?: (
    url: string,
    options?: {
      auth?: Record<string, string>;
      transports?: string[];
      reconnection?: boolean;
      timeout?: number;
    },
  ) => SocketLike;
}

interface ConnectNotificationsOptions {
  token?: string;
  getToken?: () => string | null;
  onReady?: (payload: NotificationsReadyEvent) => void;
  onNew?: (payload: NotificationsNewEvent) => void;
  onUnreadCount?: (payload: NotificationsUnreadCountEvent) => void;
  onRead?: (payload: NotificationsReadEvent) => void;
  onReadAll?: (payload: NotificationsReadAllEvent) => void;
  onError?: (payload: NotificationsErrorEvent) => void;
}

const SOCKET_IO_CDN_URL = "https://cdn.socket.io/4.7.5/socket.io.min.js";
let loadPromise: Promise<void> | null = null;

function getSocketBaseUrl() {
  const apiBase = getApiBaseUrl().replace(/\/+$/, "");
  return apiBase.replace(/\/api\/v1$/i, "");
}

function loadSocketIoScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Socket.IO can only run in browser"));
  }

  if ((window as WindowWithSocketIo).io) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SOCKET_IO_CDN_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Socket.IO runtime"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function connectNotificationsSocket(
  options: ConnectNotificationsOptions,
) {
  await loadSocketIoScript();

  const socketFactory = (window as WindowWithSocketIo).io;
  if (!socketFactory) {
    throw new Error("Socket.IO runtime not available");
  }

  const resolveToken = () => options.getToken?.() ?? options.token ?? "";
  const initialToken = resolveToken();
  if (!initialToken) {
    throw new Error("Missing realtime auth token");
  }

  const socket = socketFactory(`${getSocketBaseUrl()}/notifications`, {
    auth: {
      token: initialToken,
    },
    transports: ["websocket"],
    reconnection: true,
    timeout: 10000,
  });

  const handlers: Array<{ event: string; handler: SocketHandler }> = [
    {
      event: "notifications:ready",
      handler: (payload) =>
        options.onReady?.(payload as NotificationsReadyEvent),
    },
    {
      event: "notifications:new",
      handler: (payload) => options.onNew?.(payload as NotificationsNewEvent),
    },
    {
      event: "notifications:unread-count",
      handler: (payload) =>
        options.onUnreadCount?.(payload as NotificationsUnreadCountEvent),
    },
    {
      event: "notifications:read",
      handler: (payload) => options.onRead?.(payload as NotificationsReadEvent),
    },
    {
      event: "notifications:read-all",
      handler: (payload) =>
        options.onReadAll?.(payload as NotificationsReadAllEvent),
    },
    {
      event: "notifications:error",
      handler: (payload) => options.onError?.(payload as NotificationsErrorEvent),
    },
    {
      event: "reconnect_attempt",
      handler: () => {
        const nextToken = resolveToken();
        if (nextToken) {
          socket.auth = { token: nextToken };
        }
      },
    },
  ];

  handlers.forEach(({ event, handler }) => {
    socket.on(event, handler);
  });

  return () => {
    handlers.forEach(({ event, handler }) => {
      socket.off(event, handler);
    });
    socket.disconnect();
  };
}
