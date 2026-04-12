/**
 * Offline Queue Manager - IndexedDB Persistence
 * Ensures tenant payments and maintenance reports survive offline periods
 */

interface QueueItem {
  id: string;
  transactionType: string; // 'payment', 'maintenance_report', 'review', 'booking'
  entityId: string;
  timestamp: number;
  data: Record<string, any>;
  retryCount: number;
  lastError?: string;
  synced: boolean;
}

class OfflineQueueManager {
  private dbName = 'LEA_OFFLINE';
  private storeName = 'transactions';
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // exponential backoff

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('transactionType', 'transactionType', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Add transaction to queue
   */
  async enqueue(
    transactionType: string,
    entityId: string,
    data: Record<string, any>
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const item: QueueItem = {
      id: `${transactionType}-${entityId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transactionType,
      entityId,
      timestamp: Date.now(),
      data,
      retryCount: 0,
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(item);

      request.onsuccess = () => {
        console.log(`Queued offline transaction: ${item.id}`);
        resolve(item.id);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending transactions
   */
  async getPending(): Promise<QueueItem[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync pending transactions with server
   */
  async syncQueue(syncHandler: (item: QueueItem) => Promise<void>): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return { successful: 0, failed: 0, errors: [] };
    }

    this.syncInProgress = true;
    const results = { successful: 0, failed: 0, errors: [] as any[] };

    try {
      const pendingItems = await this.getPending();

      for (const item of pendingItems) {
        const delayMs = this.RETRY_DELAYS[Math.min(item.retryCount, this.RETRY_DELAYS.length - 1)];

        try {
          await syncHandler(item);
          await this.markSynced(item.id);
          results.successful++;
          console.log(`Synced: ${item.id}`);
        } catch (error) {
          item.retryCount++;
          item.lastError = error instanceof Error ? error.message : 'Unknown error';

          if (item.retryCount <= this.MAX_RETRIES) {
            await this.updateItem(item);
            console.log(`Will retry ${item.id} in ${delayMs}ms (attempt ${item.retryCount})`);
          } else {
            await this.markFailed(item.id, item.lastError);
            results.failed++;
            results.errors.push({
              id: item.id,
              error: `Failed after ${this.MAX_RETRIES} retries: ${item.lastError}`
            });
            console.error(`Failed permanently: ${item.id}`);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }

    return results;
  }

  /**
   * Mark item as synced
   */
  private async markSynced(itemId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(itemId);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        item.synced = true;
        const updateRequest = store.put(item);

        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Mark item as failed
   */
  private async markFailed(itemId: string, error: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      store.delete(itemId); // Remove after max retries

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Update item
   */
  private async updateItem(item: QueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all synced items (optional cleanup)
   */
  async clearSynced(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('synced');
      const range = IDBKeyRange.only(true);
      const request = index.getAll(range);

      request.onsuccess = () => {
        const storeTransaction = this.db!.transaction([this.storeName], 'readwrite');
        const delStore = storeTransaction.objectStore(this.storeName);

        for (const item of request.result) {
          delStore.delete(item.id);
        }

        storeTransaction.oncomplete = () => resolve();
        storeTransaction.onerror = () => reject(storeTransaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// Global singleton
let queueManager: OfflineQueueManager | null = null;

export async function initializeOfflineQueue(): Promise<OfflineQueueManager> {
  if (!queueManager) {
    queueManager = new OfflineQueueManager();
    await queueManager.initialize();
  }
  return queueManager;
}

export function getOfflineQueue(): OfflineQueueManager {
  if (!queueManager) {
    throw new Error('Offline queue not initialized. Call initializeOfflineQueue first.');
  }
  return queueManager;
}

export default OfflineQueueManager;
