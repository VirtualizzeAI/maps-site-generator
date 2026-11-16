"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Toast } from "radix-ui";
import { CircleCheck, CircleX, X } from "lucide-react";

type Notification = {
  variant: "success" | "error";
  title: string;
  description: string;
};
type PendingNotification = Notification & { id: number };
const NotificationContext = createContext<((notification: Notification) => void) | null>(null);

export function ActionNotifications({ children }: { children: React.ReactNode }) {
  // Cada nova leva reinicia a pausa dos timers, inclusive após fechar a última notificação.
  // O provider envolve só os toasts para preservar o estado da página.
  const [batch, setBatch] = useState<{id: number; items: PendingNotification[]}>({id: 0, items: []});
  const notifications = batch.items;
  const nextId = useRef(0);
  const notify = useCallback((notification: Notification) => {
    const id = ++nextId.current;
    setBatch(current => ({id: current.items.length ? current.id : current.id + 1, items: [...current.items, { ...notification, id }]}));
  }, []);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Toast.Provider key={batch.id} swipeDirection="right" duration={5000} label="Notificação">
        {notifications.map(notification => {
          const success = notification.variant === "success";
          const Icon = success ? CircleCheck : CircleX;
          return (
            <Toast.Root key={notification.id} defaultOpen
              type={success ? "background" : "foreground"}
              duration={success ? 5000 : 8000}
              onOpenChange={open => { if (!open) setBatch(current => ({...current, items: current.items.filter(item => item.id !== notification.id)})); }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3 shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right-4 data-[swipe=end]:opacity-0 ${success ? "border-emerald-200" : "border-red-200"}`}>
              <Icon size={20} aria-hidden="true" className={`mt-0.5 shrink-0 ${success ? "text-emerald-600" : "text-red-600"}`} />
              <div className="min-w-0 flex-1">
                <Toast.Title className="text-sm font-semibold text-slate-900">{notification.title}</Toast.Title>
                <Toast.Description className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{notification.description}</Toast.Description>
              </div>
              <Toast.Close aria-label="Fechar notificação" className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500">
                <X size={16} aria-hidden="true" />
              </Toast.Close>
            </Toast.Root>
          );
        })}
        <Toast.Viewport label="Notificações ({hotkey})" className="fixed right-4 top-4 z-[101] m-0 flex max-h-[calc(100dvh_-_2rem)] w-[360px] max-w-[calc(100vw_-_2rem)] list-none flex-col gap-2 overflow-y-auto outline-none" />
      </Toast.Provider>
    </NotificationContext.Provider>
  );
}

export function useActionNotification() {
  const notify = useContext(NotificationContext);
  if (!notify) throw new Error("ActionNotifications deve envolver a aplicação");
  return notify;
}
