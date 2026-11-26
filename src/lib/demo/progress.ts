"use client";

import { useSyncExternalStore } from "react";

/**
 * Demo mode only: quests the visitor has marked fixed, kept in this browser.
 * Real quests are verified by reading GitHub, never by taking anyone's word.
 */

const KEY = "revenant:demo-fixes:v1";
const EMPTY: ReadonlySet<string> = new Set();

let cache: ReadonlySet<string> | null = null;
const listeners = new Set<() => void>();

function read(): ReadonlySet<string> {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

function write(next: ReadonlySet<string>) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* storage blocked: progress lasts for this visit only */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useDemoFixes(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function fixDemoQuest(id: string) {
  const current = read();
  if (current.has(id)) return;
  write(new Set([...current, id]));
}

/** Forget fixes for some quests (one grave), or all of them. */
export function resetDemoFixes(ids?: string[]) {
  if (!ids) return write(new Set());
  const drop = new Set(ids);
  write(new Set([...read()].filter((id) => !drop.has(id))));
}
