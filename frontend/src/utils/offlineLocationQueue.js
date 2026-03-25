/**
 * Offline Queue Manager for Location Updates
 * Buffers location updates when disconnected and syncs them when reconnected
 */

class OfflineLocationQueue {
  constructor() {
    this.queue = [];
    this.storageKey = 'outpass_location_queue';
    this.loadFromStorage();
  }

  /**
   * Add a location update to the queue
   * @param {number} requestId - The outpass request ID
   * @param {Object} location - Location data {latitude, longitude, accuracy, battery_level}
   * @returns {Object} Queue entry with timestamp
   */
  enqueue(requestId, location) {
    const entry = {
      requestId,
      location,
      timestamp: new Date().toISOString(),
      id: `${requestId}-${Date.now()}-${Math.random()}`, // Unique ID for tracking
    };
    
    this.queue.push(entry);
    this.saveToStorage();
    
    return entry;
  }

  /**
   * Get all queued updates
   * @returns {Array} All queued location updates
   */
  getAll() {
    return [...this.queue];
  }

  /**
   * Get queued updates for a specific request
   * @param {number} requestId - The outpass request ID
   * @returns {Array} Queued updates for that request
   */
  getByRequestId(requestId) {
    return this.queue.filter((entry) => entry.requestId === requestId);
  }

  /**
   * Remove an entry from the queue after successful sync
   * @param {string} entryId - The entry ID to remove
   */
  remove(entryId) {
    this.queue = this.queue.filter((entry) => entry.id !== entryId);
    this.saveToStorage();
  }

  /**
   * Clear all queued updates
   */
  clear() {
    this.queue = [];
    this.saveToStorage();
  }

  /**
   * Get the number of pending updates
   * @returns {number} Queue size
   */
  size() {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   * @returns {boolean} True if queue is empty
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Save queue to localStorage
   * @private
   */
  saveToStorage() {
    try {
      // Limit queue to 100 entries to avoid localStorage size issues
      const limitedQueue = this.queue.slice(-100);
      localStorage.setItem(this.storageKey, JSON.stringify(limitedQueue));
    } catch (err) {
      console.error('Failed to save queue to localStorage:', err);
    }
  }

  /**
   * Load queue from localStorage
   * @private
   */
  loadFromStorage() {
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

  /**
   * Get statistics about the queue
   * @returns {Object} Queue statistics
   */
  getStats() {
    const byRequest = {};
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

// Export singleton instance
export const offlineLocationQueue = new OfflineLocationQueue();

export default offlineLocationQueue;
