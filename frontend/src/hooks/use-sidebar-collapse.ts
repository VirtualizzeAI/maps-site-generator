"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "virtualizze_sidebar_collapsed";
const CHANGE_EVENT = "virtualizze:sidebar-collapse";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function useSidebarCollapse() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggleCollapsed() {
    localStorage.setItem(STORAGE_KEY, String(!collapsed));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { collapsed, toggleCollapsed };
}
