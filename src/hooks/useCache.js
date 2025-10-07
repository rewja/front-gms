import { useState, useEffect, useCallback, useRef } from 'react';

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // Maximum number of items in cache
  cleanupInterval: 60 * 1000, // 1 minute
};

// Cache storage
let cache = new Map();
let cleanupTimer = null;

// Cleanup expired items
const cleanupExpired = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt && value.expiresAt < now) {
      cache.delete(key);
    }
  }
};

// Start cleanup timer
const startCleanupTimer = () => {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(cleanupExpired, CACHE_CONFIG.cleanupInterval);
};

// Stop cleanup timer
const stopCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};

// Cache hook
export const useCache = () => {
  const [cacheStats, setCacheStats] = useState({
    size: 0,
    hits: 0,
    misses: 0
  });

  // Update cache stats
  const updateStats = useCallback(() => {
    setCacheStats({
      size: cache.size,
      hits: cacheStats.hits,
      misses: cacheStats.misses
    });
  }, [cacheStats.hits, cacheStats.misses]);

  // Get item from cache
  const get = useCallback((key) => {
    const item = cache.get(key);
    
    if (!item) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      cache.delete(key);
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return item.data;
  }, [cacheStats.hits, cacheStats.misses]);

  // Set item in cache
  const set = useCallback((key, data, ttl = CACHE_CONFIG.defaultTTL) => {
    // Remove oldest items if cache is full
    if (cache.size >= CACHE_CONFIG.maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    cache.set(key, { data, expiresAt });
    updateStats();
  }, [updateStats]);

  // Remove item from cache
  const remove = useCallback((key) => {
    cache.delete(key);
    updateStats();
  }, [updateStats]);

  // Clear all cache
  const clear = useCallback(() => {
    cache.clear();
    setCacheStats({ size: 0, hits: 0, misses: 0 });
  }, []);

  // Check if key exists in cache
  const has = useCallback((key) => {
    const item = cache.get(key);
    if (!item) return false;
    
    if (item.expiresAt && item.expiresAt < Date.now()) {
      cache.delete(key);
      return false;
    }
    
    return true;
  }, []);

  // Get cache size
  const size = useCallback(() => {
    return cache.size;
  }, []);

  // Get cache keys
  const keys = useCallback(() => {
    return Array.from(cache.keys());
  }, []);

  // Start cleanup timer on mount
  useEffect(() => {
    startCleanupTimer();
    return () => {
      stopCleanupTimer();
    };
  }, []);

  return {
    get,
    set,
    remove,
    clear,
    has,
    size,
    keys,
    stats: cacheStats
  };
};

// Hook for cached API calls
export const useCachedApi = (apiCall, key, options = {}) => {
  const { get, set, has } = useCache();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const {
    ttl = CACHE_CONFIG.defaultTTL,
    forceRefresh = false,
    dependencies = []
  } = options;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiCall();
      setData(result);
      setLastFetch(Date.now());
      
      // Cache the result
      set(key, result, ttl);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [apiCall, key, ttl, set]);

  // Load data on mount or when dependencies change
  useEffect(() => {
    // Check cache first
    if (!forceRefresh && has(key)) {
      const cachedData = get(key);
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }

    fetchData();
  }, [forceRefresh, has, get, key, fetchData, ...dependencies]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    setData(null);
    setLastFetch(null);
  }, []);

  return {
    data,
    loading,
    error,
    lastFetch,
    refresh,
    invalidate
  };
};

// Hook for paginated data with cache
export const useCachedPagination = (apiCall, baseKey, options = {}) => {
  const { get, set, has } = useCache();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const {
    ttl = CACHE_CONFIG.defaultTTL,
    pageSize = 10,
    forceRefresh = false
  } = options;

  const loadPage = useCallback(async (pageNum) => {
    const cacheKey = `${baseKey}_page_${pageNum}`;
    
    // Check cache first
    if (!forceRefresh && has(cacheKey)) {
      const cachedData = get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await apiCall(pageNum, pageSize);
      
      // Cache the result
      set(cacheKey, result, ttl);
      
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall, baseKey, pageSize, ttl, forceRefresh, has, get, set]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      const result = await loadPage(page + 1);
      
      if (result.data && result.data.length > 0) {
        setData(prev => [...prev, ...result.data]);
        setPage(prev => prev + 1);
        setHasMore(result.data.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      // Error is already set in loadPage
    }
  }, [loading, hasMore, page, pageSize, loadPage]);

  const refresh = useCallback(async () => {
    setData([]);
    setPage(1);
    setHasMore(true);
    
    try {
      const result = await loadPage(1);
      if (result.data) {
        setData(result.data);
        setHasMore(result.data.length === pageSize);
      }
    } catch (err) {
      // Error is already set in loadPage
    }
  }, [loadPage, pageSize]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
};

export default useCache;



