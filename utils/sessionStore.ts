// utils/sessionStore.ts

import NodeCache from 'node-cache';

// Extend the NodeJS Global interface
declare global {
    var sessionCache: NodeCache | undefined;
}

// Initialize the cache if it doesn't exist
const sessionCache = global.sessionCache || new NodeCache();

// Assign the cache to the global object to ensure singleton behavior
if (!global.sessionCache) {
    global.sessionCache = sessionCache;
}

const sessionStore = {
    /**
     * Sets a value in the cache with an optional TTL (time-to-live).
     * @param key - The session ID.
     * @param value - The serialized token cache.
     * @param options - Optional settings, e.g., TTL.
     */
    set: (key: string, value: string, options: { ttl: number }) => {
        console.log(`Setting session: ${key}`);
        const result = sessionCache.set(key, value, options.ttl);
        console.log(`Set result for ${key}: ${result}`);
        return result;
    },

    /**
     * Retrieves a value from the cache.
     * @param key - The session ID.
     * @returns The serialized token cache or undefined.
     */
    get: (key: string) => {
        console.log(`Getting session: ${key}`);
        const value = sessionCache.get<string>(key);
        console.log(`Retrieved session for ${key}: ${value ? 'Found' : 'Not Found'}`);
        return value;
    },

    /**
     * Deletes a value from the cache.
     * @param key - The session ID.
     */
    del: (key: string) => {
        console.log(`Deleting session: ${key}`);
        const result = sessionCache.del(key);
        console.log(`Delete result for ${key}: ${result}`);
        return result;
    }
};

export default sessionStore;