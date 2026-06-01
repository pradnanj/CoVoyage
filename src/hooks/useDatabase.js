import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveTrip, getTrip,
  saveMember, getMembers,
  saveHotel, getHotels,
  saveActivity, updateActivityFields, getActivities,
  savePhotos, getPhotos,
  saveExpenses, getExpenses,
} from '../services/database';
import { HOTELS } from '../constants';

// Derive trip ID from URL param (?trip=…) or env, falling back to default
function resolveTripId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlTrip = params.get('trip');
    if (urlTrip) return urlTrip;
  } catch {}
  return import.meta.env.VITE_TRIP_ID || 'trip-2026';
}

// ── BroadcastChannel for instant same-origin cross-tab sync ──────────────────
// Falls back silently if the browser doesn't support it.
function makeChannel(name) {
  try { return new BroadcastChannel(name); } catch { return null; }
}

// ── Normalise a raw activities array ─────────────────────────────────────────
function normaliseActivities(items) {
  return items.map(a => ({
    ...a,
    id:        a.id || a.activityId,
    voters:    Array.isArray(a.voters)   ? a.voters   : [],
    comments:  Array.isArray(a.comments) ? a.comments : [],
    upvotes:   typeof a.upvotes   === 'number' ? a.upvotes   : 0,
    downvotes: typeof a.downvotes === 'number' ? a.downvotes : 0,
    bookedBy:  Array.isArray(a.bookedBy) ? a.bookedBy : [],
  }));
}

// ── Read activities from localStorage (handles both array and object formats) ─
function readActivitiesFromStorage(tripId) {
  try {
    const raw = localStorage.getItem(`crewfare_activities_${tripId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // hooks write an array; localStorage_save writes an object keyed by id
    if (Array.isArray(parsed)) return normaliseActivities(parsed);
    return normaliseActivities(Object.values(parsed));
  } catch { return []; }
}

// ── Read members from localStorage ───────────────────────────────────────────
function readMembersFromStorage(tripId) {
  try {
    const raw = localStorage.getItem(`crewfare_members_${tripId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return Object.values(parsed);
  } catch { return []; }
}

// ── Read hotels from localStorage ────────────────────────────────────────────
function readHotelsFromStorage() {
  try {
    const raw = localStorage.getItem('crewfare_real_hotels');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return null;
  } catch { return null; }
}

// ───── HOOK: Use Members with Database Sync ────────────────────────────────
export const useMembers = (tripId = null) => {
  const TRIP_ID = tripId || resolveTripId();
  const [members, setMembers] = useState(() => readMembersFromStorage(TRIP_ID));
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const applyAndPersist = useCallback((data) => {
    setMembers(data);
    localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(data));
  }, [TRIP_ID]);

  const syncFromDB = useCallback(async (silent = false) => {
    try {
      const data = await getMembers(TRIP_ID);
      if (data.length > 0) applyAndPersist(data);
    } catch (err) {
      if (!silent) console.warn('Members sync failed, using cache:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [TRIP_ID, applyAndPersist]);

  useEffect(() => {
    // Initial DB load
    syncFromDB(false);

    // Poll every 5 s for remote updates
    const interval = setInterval(() => syncFromDB(true), 5000);

    // Instant cross-tab sync via BroadcastChannel
    const ch = makeChannel(`crewfare_members_${TRIP_ID}`);
    channelRef.current = ch;
    if (ch) {
      ch.onmessage = (e) => {
        if (e.data?.type === 'update' && Array.isArray(e.data.members)) {
          setMembers(e.data.members);
        }
      };
    }

    // Instant cross-tab sync via storage event (works across different origins too)
    const onStorage = (e) => {
      if (e.key === `crewfare_members_${TRIP_ID}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMembers(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(interval);
      ch?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [TRIP_ID, syncFromDB]);

  const addMember = useCallback(async (memberData) => {
    const optimistic = (prev) => {
      if (prev.find(m => m.id === memberData.id)) return prev;
      const next = [...prev, memberData];
      localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'update', members: next });
      return next;
    };
    setMembers(optimistic);
    try {
      const saved = await saveMember(TRIP_ID, memberData);
      setMembers(prev => {
        const next = prev.map(m => m.id === saved.id ? saved : m);
        localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(next));
        channelRef.current?.postMessage({ type: 'update', members: next });
        return next;
      });
      return saved;
    } catch (err) {
      console.error('Failed to save member:', err);
    }
  }, [TRIP_ID]);

  const updateMember = useCallback(async (memberId, updates) => {
    setMembers(prev => {
      const next = prev.map(m => m.id === memberId ? { ...m, ...updates } : m);
      localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'update', members: next });
      return next;
    });
    try {
      await saveMember(TRIP_ID, { id: memberId, ...updates });
    } catch (err) {
      console.error('Failed to update member:', err);
    }
  }, [TRIP_ID]);

  return { members, loading, addMember, updateMember };
};

// ───── HOOK: Use Hotels with Database Sync ────────────────────────────────
export const useHotels = (externalHotels = null, tripId = null) => {
  const TRIP_ID = tripId || resolveTripId();
  const channelRef = useRef(null);

  const [hotels, setHotels] = useState(() => {
    if (externalHotels && externalHotels.length > 0) return externalHotels;
    return readHotelsFromStorage() || HOTELS;
  });
  const [loading, setLoading] = useState(true);

  // Merge DB booking data onto the current hotel list without replacing names/images
  const mergeBookings = useCallback((prev, dbData) => {
    if (!dbData || dbData.length === 0) return prev;
    return prev.map(h => {
      const saved = dbData.find(d => d.id === h.id || d.hotelId === h.id);
      return saved ? { ...h, bookedBy: saved.bookedBy || h.bookedBy || [] } : h;
    });
  }, []);

  const syncFromDB = useCallback(async (silent = false) => {
    try {
      const data = await getHotels(TRIP_ID);
      if (data.length > 0) {
        setHotels(prev => {
          const merged = mergeBookings(prev, data);
          localStorage.setItem('crewfare_real_hotels', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      if (!silent) console.warn('Hotels sync failed, using cache:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [TRIP_ID, mergeBookings]);

  // When external (real) hotels arrive or change (e.g. from Marriott API fetch), adopt them
  useEffect(() => {
    if (!externalHotels || externalHotels.length === 0) return;
    setHotels(prev => externalHotels.map(eh => {
      const existing = prev.find(p => p.id === eh.id);
      return existing ? { ...eh, bookedBy: existing.bookedBy || [] } : eh;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((externalHotels || []).map(h => h.id))]);

  useEffect(() => {
    syncFromDB(false);

    // Poll every 5 s — hotels change when members book rooms
    const interval = setInterval(() => syncFromDB(true), 5000);

    // Instant cross-tab sync
    const ch = makeChannel(`crewfare_hotels_${TRIP_ID}`);
    channelRef.current = ch;
    if (ch) {
      ch.onmessage = (e) => {
        if (e.data?.type === 'update' && Array.isArray(e.data.hotels)) {
          setHotels(e.data.hotels);
        }
      };
    }

    const onStorage = (e) => {
      if (e.key === 'crewfare_real_hotels' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) setHotels(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(interval);
      ch?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [TRIP_ID, syncFromDB]);

  const updateHotel = useCallback(async (hotelId, updates) => {
    setHotels(prev => {
      const next = prev.map(h => h.id === hotelId ? { ...h, ...updates } : h);
      localStorage.setItem('crewfare_real_hotels', JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'update', hotels: next });
      return next;
    });
    try {
      await saveHotel(TRIP_ID, { id: hotelId, ...updates });
    } catch (err) {
      console.error('Failed to update hotel:', err);
    }
  }, [TRIP_ID]);

  return { hotels, loading, updateHotel };
};

// ───── HOOK: Use Activities with Database Sync ────────────────────────────
export const useActivities = (tripId = null) => {
  const TRIP_ID = tripId || resolveTripId();
  const [activities, setActivities] = useState(() => readActivitiesFromStorage(TRIP_ID));
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const applyAndPersist = useCallback((data) => {
    const normalised = normaliseActivities(data);
    setActivities(normalised);
    localStorage.setItem(`crewfare_activities_${TRIP_ID}`, JSON.stringify(normalised));
    channelRef.current?.postMessage({ type: 'update', activities: normalised });
  }, [TRIP_ID]);

  const syncFromDB = useCallback(async (silent = false) => {
    try {
      const data = await getActivities(TRIP_ID);
      if (data.length > 0) applyAndPersist(data);
    } catch (err) {
      if (!silent) console.warn('Activities sync failed, using cache:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [TRIP_ID, applyAndPersist]);

  useEffect(() => {
    syncFromDB(false);

    // Poll every 5 s for activities added/voted on by other users
    const interval = setInterval(() => syncFromDB(true), 5000);

    // Instant cross-tab sync via BroadcastChannel
    const ch = makeChannel(`crewfare_activities_${TRIP_ID}`);
    channelRef.current = ch;
    if (ch) {
      ch.onmessage = (e) => {
        if (e.data?.type === 'update' && Array.isArray(e.data.activities)) {
          setActivities(e.data.activities);
        }
      };
    }

    // Instant cross-tab sync via storage event
    const onStorage = (e) => {
      if (e.key === `crewfare_activities_${TRIP_ID}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const arr = Array.isArray(parsed) ? parsed : Object.values(parsed);
          if (arr.length > 0) setActivities(normaliseActivities(arr));
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(interval);
      ch?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [TRIP_ID, syncFromDB]);

  const addActivity = useCallback(async (activityData) => {
    // Optimistic add
    setActivities(prev => {
      if (prev.find(a => a.id === activityData.id || a.activityId === activityData.activityId)) return prev;
      const next = normaliseActivities([...prev, activityData]);
      localStorage.setItem(`crewfare_activities_${TRIP_ID}`, JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'update', activities: next });
      return next;
    });
    try {
      const saved = await saveActivity(TRIP_ID, activityData);
      setActivities(prev => {
        // Replace the optimistic entry with the saved one (same id)
        const exists = prev.find(a => a.id === saved.id || a.activityId === saved.activityId);
        const next = normaliseActivities(exists
          ? prev.map(a => (a.id === saved.id || a.activityId === saved.activityId) ? saved : a)
          : [...prev, saved]
        );
        localStorage.setItem(`crewfare_activities_${TRIP_ID}`, JSON.stringify(next));
        channelRef.current?.postMessage({ type: 'update', activities: next });
        return next;
      });
      return saved;
    } catch (err) {
      console.error('Failed to persist activity:', err);
    }
  }, [TRIP_ID]);

  const updateActivity = useCallback(async (activityId, updates) => {
    // Optimistic merge — preserves all existing fields
    setActivities(prev => {
      const next = normaliseActivities(prev.map(a =>
        (a.id === activityId || a.activityId === activityId) ? { ...a, ...updates } : a
      ));
      localStorage.setItem(`crewfare_activities_${TRIP_ID}`, JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'update', activities: next });
      return next;
    });
    try {
      await updateActivityFields(TRIP_ID, activityId, updates);
    } catch (err) {
      console.error('Failed to persist activity update:', err);
    }
  }, [TRIP_ID]);

  return { activities, loading, addActivity, updateActivity };
};

// ───── HOOK: Use Expenses with Database Sync ─────────────────────────────
export const useExpenses = (tripId = null) => {
  const TRIP_ID = tripId || resolveTripId();
  const channelRef = useRef(null);

  const [expenses, setExpenses] = useState(() => {
    try {
      const raw = localStorage.getItem(`crewfare_expenses_${TRIP_ID}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const persist = useCallback((next) => {
    localStorage.setItem(`crewfare_expenses_${TRIP_ID}`, JSON.stringify(next));
    saveExpenses(TRIP_ID, next).catch(() => {});
    channelRef.current?.postMessage({ type: 'update', expenses: next });
  }, [TRIP_ID]);

  const syncFromDB = useCallback(async (silent = false) => {
    try {
      const data = await getExpenses(TRIP_ID);
      if (Array.isArray(data) && data.length > 0) {
        setExpenses(data);
        localStorage.setItem(`crewfare_expenses_${TRIP_ID}`, JSON.stringify(data));
      }
    } catch (err) {
      if (!silent) console.warn('Expenses sync failed:', err);
    }
  }, [TRIP_ID]);

  useEffect(() => {
    syncFromDB(false);
    const interval = setInterval(() => syncFromDB(true), 5000);

    const ch = makeChannel(`crewfare_expenses_${TRIP_ID}`);
    channelRef.current = ch;
    if (ch) {
      ch.onmessage = (e) => {
        if (e.data?.type === 'update' && Array.isArray(e.data.expenses)) {
          setExpenses(e.data.expenses);
        }
      };
    }

    const onStorage = (e) => {
      if (e.key === `crewfare_expenses_${TRIP_ID}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setExpenses(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(interval);
      ch?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [TRIP_ID, syncFromDB]);

  const addExpense = useCallback((expenseData) => {
    setExpenses(prev => {
      const next = [...prev, expenseData];
      persist(next);
      return next;
    });
  }, [persist]);

  const settleExpense = useCallback((expId, personName) => {
    setExpenses(prev => {
      const next = prev.map(e =>
        e.id === expId && !e.settledBy.includes(personName)
          ? { ...e, settledBy: [...e.settledBy, personName] }
          : e
      );
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteExpense = useCallback((expId) => {
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== expId);
      persist(next);
      return next;
    });
  }, [persist]);

  return { expenses, addExpense, settleExpense, deleteExpense };
};

// ───── HOOK: Use Photos with Database Sync ─────────────────────────────────
// Metadata (id, label, day, tag, caption, uploadedBy, selected) syncs via DynamoDB.
// The actual image src (base64) lives only in localStorage keyed by photo id.
// mergeWithLocalSrc rehydrates each metadata record with its local base64 if available.
function mergeWithLocalSrc(metaList) {
  return metaList.map(p => {
    const src = localStorage.getItem(`crewfare_photo_src_${p.id}`) || p.src || null;
    return { ...p, src };
  });
}

export const usePhotos = (tripId = null) => {
  const TRIP_ID = tripId || resolveTripId();
  const channelRef = useRef(null);

  const [photos, setPhotos] = useState(() => {
    try {
      const raw = localStorage.getItem(`crewfare_photos_meta_${TRIP_ID}`);
      if (raw) return mergeWithLocalSrc(JSON.parse(raw));
    } catch {}
    return [];
  });

  // Persist metadata + each src separately
  const persist = useCallback((next) => {
    // Save metadata (no src) to DynamoDB + localStorage meta key
    savePhotos(TRIP_ID, next).catch(() => {});
    // Also persist per-photo src in individual localStorage keys
    next.forEach(p => {
      if (p.src) {
        try { localStorage.setItem(`crewfare_photo_src_${p.id}`, p.src); } catch {}
      }
    });
    // Broadcast metadata (no src — too large) to other tabs
    const metaOnly = next.map(({ src, ...m }) => m); // eslint-disable-line no-unused-vars
    channelRef.current?.postMessage({ type: 'update', photos: metaOnly });
  }, [TRIP_ID]);

  const syncFromDB = useCallback(async (silent = false) => {
    try {
      const meta = await getPhotos(TRIP_ID);
      if (!Array.isArray(meta) || meta.length === 0) return;
      setPhotos(prev => {
        // Rehydrate with local srcs; keep any local-only photos not yet in DB
        const merged = mergeWithLocalSrc(meta);
        // Add local-only photos (uploaded on this device but not yet in DB)
        prev.forEach(p => {
          if (!merged.find(m => m.id === p.id)) merged.push(p);
        });
        // Only update state if something changed
        if (JSON.stringify(merged.map(p => p.id + (p.caption || ''))) !==
            JSON.stringify(prev.map(p => p.id + (p.caption || '')))) {
          return merged;
        }
        return prev;
      });
    } catch (err) {
      if (!silent) console.warn('Photos sync failed:', err);
    }
  }, [TRIP_ID]);

  useEffect(() => {
    syncFromDB(false);
    const interval = setInterval(() => syncFromDB(true), 5000);

    const ch = makeChannel(`crewfare_photos_${TRIP_ID}`);
    channelRef.current = ch;
    if (ch) {
      ch.onmessage = (e) => {
        if (e.data?.type === 'update' && Array.isArray(e.data.photos)) {
          setPhotos(prev => {
            const merged = mergeWithLocalSrc(e.data.photos);
            prev.forEach(p => { if (!merged.find(m => m.id === p.id)) merged.push(p); });
            return merged;
          });
        }
      };
    }

    const onStorage = (e) => {
      if (e.key === `crewfare_photos_meta_${TRIP_ID}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setPhotos(mergeWithLocalSrc(parsed));
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(interval);
      ch?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [TRIP_ID, syncFromDB]);

  const addPhoto = useCallback((photoData) => {
    setPhotos(prev => {
      if (prev.find(p => p.id === photoData.id)) return prev;
      const next = [...prev, photoData];
      persist(next);
      return next;
    });
  }, [persist]);

  const updatePhoto = useCallback((photoId, updates) => {
    setPhotos(prev => {
      const next = prev.map(p => p.id === photoId ? { ...p, ...updates } : p);
      persist(next);
      return next;
    });
  }, [persist]);

  const removePhoto = useCallback((photoId) => {
    setPhotos(prev => {
      const next = prev.filter(p => p.id !== photoId);
      persist(next);
      try { localStorage.removeItem(`crewfare_photo_src_${photoId}`); } catch {}
      return next;
    });
  }, [persist]);

  return { photos, addPhoto, updatePhoto, removePhoto };
};
