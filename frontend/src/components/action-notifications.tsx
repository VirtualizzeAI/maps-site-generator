"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertDialog } from "radix-ui";
import { CircleCheck, CircleX, X } from "lucide-react";

type Notification = {
  variant: "success" | "error";
  title: string;
  description: string;
};
type PendingNotification = Notification & { returnFocus: HTMLElement | null };
const NotificationContext = createContext<((notification: Notification) => void) | null>(null);

export function ActionNotifications({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<PendingNotification[]>([]);
  const actionRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    function rememberFocus(event: FocusEvent) {
      if (event.target instanceof HTMLElement && event.target !== document.body && !event.target.closest('[role="alertdialog"]')) {
        lastFocusedRef.current = event.target;
      }
    }
    document.addEventListener("focusin", rememberFocus);
    return () => document.removeEventListener("focusin", rememberFocus);
  }, []);
  const notify = useCallback((notification: Notification) => {
    const returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement : lastFocusedRef.current;
    setQueue(current => [...current, { ...notification, returnFocus }]);
  }, []);
  const notification = queue[0];
  const success = notification?.variant === "success";
  const Icon = success ? CircleCheck : CircleX;
  function close() {
    returnFocusRef.current = notification?.returnFocus || null;
    setQueue(current => current.slice(1));
  }

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <AlertDialog.Root open={!!notification} onOpenChange={open => { if (!open) close(); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <AlertDialog.Content
            onOpenAutoFocus={event => { event.preventDefault(); actionRef.current?.focus(); }}
            onCloseAutoFocus={event => { event.preventDefault(); if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus(); }}
            className="fixed left-1/2 top-1/2 z-[101] max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-8"
          >
            <AlertDialog.Cancel asChild>
              <button type="button" aria-label="Fechar notificação" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500">
                <X size={18} aria-hidden="true" />
              </button>
            </AlertDialog.Cancel>
            <div className={`mb-5 grid h-16 w-16 place-items-center rounded-2xl ${success ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              <Icon size={34} aria-hidden="true" />
            </div>
            <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${success ? "text-emerald-700" : "text-red-700"}`}>{success ? "Tudo certo" : "A ação não foi concluída"}</p>
            <AlertDialog.Title className="pr-3 text-xl font-bold text-slate-900">{notification?.title}</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{notification?.description}</AlertDialog.Description>
            <AlertDialog.Action asChild>
              <button ref={actionRef} type="button" className={`mt-7 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${success ? "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-200" : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-200"}`}>
                Entendi
              </button>
            </AlertDialog.Action>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </NotificationContext.Provider>
  );
}

export function useActionNotification() {
  const notify = useContext(NotificationContext);
  if (!notify) throw new Error("ActionNotifications deve envolver a aplicação");
  return notify;
}
