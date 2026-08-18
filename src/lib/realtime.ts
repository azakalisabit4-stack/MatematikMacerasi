import "server-only";

import { EventEmitter } from "node:events";

/**
 * Gerçek zamanlı olay yolu (SSE).
 * Tek Node süreci üzerinde çalışır — bu proje için hedeflenen 30-100 eşzamanlı
 * kullanıcıda fazlasıyla yeterlidir ve ek servis/port gerektirmez.
 *
 * Kanallar:
 *   user:<userId>   → bildirim, düello daveti, arkadaş olayları
 *   duel:<duelId>   → düello içi anlık skor/ilerleme
 */

export type RealtimeEvent =
  | { type: "notification"; payload: unknown }
  | { type: "duel:update"; payload: unknown }
  | { type: "duel:invite"; payload: unknown }
  | { type: "duel:finished"; payload: unknown }
  | { type: "presence"; payload: unknown }
  | { type: "ping"; payload: number };

const globalForBus = globalThis as unknown as { __mm_bus?: EventEmitter };
const bus = globalForBus.__mm_bus ?? new EventEmitter();
bus.setMaxListeners(0);
globalForBus.__mm_bus = bus;

export function publishToUser(userId: string, event: RealtimeEvent) {
  bus.emit(`user:${userId}`, event);
}

export function publishToDuel(duelId: string, event: RealtimeEvent) {
  bus.emit(`duel:${duelId}`, event);
}

export function subscribe(channel: string, handler: (event: RealtimeEvent) => void) {
  bus.on(channel, handler);
  return () => bus.off(channel, handler);
}
