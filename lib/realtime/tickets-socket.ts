"use client";

import { getApiBaseUrl } from "@/lib/api/http";
import type {
  TicketsErrorEvent,
  TicketsMessageEvent,
  TicketsReadyEvent,
  TicketsSubscribedEvent,
  TicketsUpdatedEvent,
} from "@/lib/types";

type SocketHandler = (payload?: unknown) => void;

interface SocketLike {
  on: (event: string, handler: SocketHandler) => void;
  off: (event: string, handler?: SocketHandler) => void;
  emit: (event: string, payload?: unknown) => void;
  disconnect: () => void;
  auth?: Record<string, string>;
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

interface ConnectTicketsOptions {
  token?: string;
  getToken?: () => string | null;
  onReady?: (payload: TicketsReadyEvent) => void;
  onSubscribed?: (payload: TicketsSubscribedEvent) => void;
  onMessage?: (payload: TicketsMessageEvent) => void;
  onTicketUpdated?: (payload: TicketsUpdatedEvent) => void;
  onError?: (payload: TicketsErrorEvent) => void;
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

export async function connectTicketsSocket(options: ConnectTicketsOptions) {
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

  const socket = socketFactory(`${getSocketBaseUrl()}/tickets`, {
    auth: {
      token: initialToken,
    },
    transports: ["websocket"],
    reconnection: true,
    timeout: 10000,
  });

  const handlers: Array<{ event: string; handler: SocketHandler }> = [
    {
      event: "tickets:ready",
      handler: (payload) => options.onReady?.(payload as TicketsReadyEvent),
    },
    {
      event: "tickets:subscribed",
      handler: (payload) =>
        options.onSubscribed?.(payload as TicketsSubscribedEvent),
    },
    {
      event: "tickets:message",
      handler: (payload) => options.onMessage?.(payload as TicketsMessageEvent),
    },
    {
      event: "tickets:ticket-updated",
      handler: (payload) =>
        options.onTicketUpdated?.(payload as TicketsUpdatedEvent),
    },
    {
      event: "tickets:error",
      handler: (payload) => options.onError?.(payload as TicketsErrorEvent),
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

  return {
    subscribe(ticketId: string) {
      socket.emit("tickets:subscribe", { ticketId });
    },
    unsubscribe(ticketId: string) {
      socket.emit("tickets:unsubscribe", { ticketId });
    },
    disconnect() {
      handlers.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
      socket.disconnect();
    },
  };
}
