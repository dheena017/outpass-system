/**
 * Offline Queue Manager for Location Updates
 * Buffers location updates when disconnected and syncs them when reconnected
 */

export interface QueueEntry {
  requestId: number;
  location: any;
  timestamp: string;
  id: string;
}

class OfflineLocationQueue {
  queue: QueueEntry[] = [];
  storageKey: string = 'outpass_location_queue';

  constructor() {
    this.queue = [];
    this.storageKey = 'outpass_location_queue';
    this.loadFromStorage();
  }

  enqueue(requestId: number, location: any): QueueEntry {
    const entry: QueueEntry = {
      requestId,
      location,
      timestamp: new Date().toISOString(),
      id: `${requestId}-${Date.now()}-${Math.random()}`,
    };

    this.queue.push(entry);
    this.saveToStorage();

    return entry;
  }

  getAll(): QueueEntry[] {
    return [...this.queue];
  }

  getByRequestId(requestId: number): QueueEntry[] {
    return this.queue.filter((entry) => entry.requestId === requestId);
  }

  remove(entryId: string) {
    this.queue = this.queue.filter((entry) => entry.id !== entryId);
    this.saveToStorage();
  }

  clear() {
    this.queue = [];
    this.saveToStorage();
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  private saveToStorage() {
    try {
      const limitedQueue = this.queue.slice(-100);
      localStorage.setItem(this.storageKey, JSON.stringify(limitedQueue));
    } catch (err) {
      console.error('Failed to save queue to localStorage:', err);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (err) {
      console.error('Failed to load queue from localStorage:', err);
      this.queue = [];
    }
  }

  getStats() {
    const byRequest: Record<number, number> = {};
    this.queue.forEach((entry) => {
      if (!byRequest[entry.requestId]) {
        byRequest[entry.requestId] = 0;
      }
      byRequest[entry.requestId] += 1;
    });

    return {
      total: this.queue.length,
      byRequest,
      oldestEntry: this.queue.length > 0 ? this.queue[0].timestamp : null,
      newestEntry: this.queue.length > 0 ? this.queue[this.queue.length - 1].timestamp : null,
    };
  }
}

export const offlineLocationQueue = new OfflineLocationQueue();
export default offlineLocationQueue;
