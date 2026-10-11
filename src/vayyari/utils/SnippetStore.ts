import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchApiClient } from '@/api/client';

const STORAGE_KEY = '@deeplens/copy_snippets';
const RECENT_KEY = '@deeplens/recent_copies';

export interface Snippet {
  id: string;
  label: string;
  emoji: string;
  color: string;
  content: string;
  sortOrder: number;
  isActive?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface RecentCopy {
  snippetId: string;
  label: string;
  emoji: string;
  preview: string;
  copiedAt: number;
}

/** Fallback default snippets seeded if offline on first launch */
const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'address',
    label: 'Address',
    emoji: '📍',
    color: '#10B981',
    content:
      'No. 42, Silk Board Layout, 2nd Cross,\nBengaluru, Karnataka – 560068\n\nNearby landmark: Silk Board Junction\nGoogle Maps: https://maps.app.goo.gl/example',
    sortOrder: 0,
    createdAt: Date.now(),
  },
  {
    id: 'payment',
    label: 'Payment Details',
    emoji: '💳',
    color: '#3B82F6',
    content:
      'Payment Options:\n\n• UPI: merchant@upi\n• Google Pay / PhonePe / Paytm accepted\n• Bank Transfer:\n  Account: 000112233445\n  IFSC: SBIN0012345\n  Bank: State Bank of India\n\nPlease share screenshot after payment.',
    sortOrder: 1,
    createdAt: Date.now(),
  },
  {
    id: 'returns',
    label: 'Return Policy',
    emoji: '↩️',
    color: '#F59E0B',
    content:
      'Return & Exchange Policy:\n\n✅ Returns accepted within 7 days of delivery\n✅ Item must be unused and in original packaging\n✅ Exchange available for size/colour issues\n\n❌ No returns on stitched/customised items\n❌ No returns on sale items\n\nTo initiate a return, WhatsApp us with your order ID and reason.',
    sortOrder: 2,
    createdAt: Date.now(),
  },
  {
    id: 'cod',
    label: 'COD Details',
    emoji: '📦',
    color: '#8B5CF6',
    content:
      'Cash on Delivery (COD) is available! 🎉\n\n• Minimum order: ₹499\n• COD charge: ₹50 (waived on orders above ₹1499)\n• Available across most pin codes\n• Payment to be made to delivery partner at doorstep\n\nNote: COD orders require mobile number verification.',
    sortOrder: 3,
    createdAt: Date.now(),
  },
  {
    id: 'damage',
    label: 'Damage Policy',
    emoji: '⚠️',
    color: '#F43F5E',
    content:
      'Damage / Wrong Item Policy:\n\n📸 Please record an unboxing video before opening the parcel.\n\nIf you receive a damaged or wrong item:\n1. WhatsApp us within 48 hours of delivery\n2. Share your order ID + unboxing video\n3. We will arrange a free replacement or full refund\n\n❌ Claims without unboxing video cannot be processed.',
    sortOrder: 4,
    createdAt: Date.now(),
  },
];

/** Read all snippets: fetches from centralized API and caches to AsyncStorage with offline fallback */
export async function getSnippets(): Promise<Snippet[]> {
  try {
    const response = await searchApiClient.get<Snippet[]>('/api/v1/snippets');
    if (Array.isArray(response) && response.length > 0) {
      const sorted = response.sort((a, b) => a.sortOrder - b.sortOrder);
      await saveLocalSnippets(sorted);
      return sorted;
    }
  } catch (apiErr) {
    console.warn('[SnippetStore] Failed to fetch centralized snippets from API, falling back to local cache:', apiErr);
  }

  // Fallback to local AsyncStorage cache
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await saveLocalSnippets(DEFAULT_SNIPPETS);
      return DEFAULT_SNIPPETS;
    }
    const parsed: Snippet[] = JSON.parse(raw);
    return parsed.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return DEFAULT_SNIPPETS;
  }
}

/** Persist snippets locally in AsyncStorage for offline access */
async function saveLocalSnippets(snippets: Snippet[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch (err) {
    console.warn('[SnippetStore] Failed to save snippets to AsyncStorage:', err);
  }
}

/** Add or update a single snippet in database and update local cache */
export async function upsertSnippet(snippet: Snippet): Promise<Snippet> {
  let savedSnippet: Snippet = snippet;
  try {
    const res = await searchApiClient.post<Snippet>('/api/v1/snippets', {
      id: snippet.id,
      label: snippet.label,
      emoji: snippet.emoji,
      color: snippet.color,
      content: snippet.content,
      sortOrder: snippet.sortOrder,
    });
    if (res && res.id) {
      savedSnippet = res;
    }
  } catch (apiErr) {
    console.warn('[SnippetStore] Failed to upsert snippet to centralized API, falling back to local state:', apiErr);
  }

  // Update local cache
  const all = await getLocalSnippets();
  const idx = all.findIndex((s) => s.id === savedSnippet.id);
  if (idx >= 0) {
    all[idx] = savedSnippet;
  } else {
    savedSnippet.sortOrder = all.length;
    all.push(savedSnippet);
  }
  await saveLocalSnippets(all);
  return savedSnippet;
}

/** Delete a snippet by ID in database and update local cache */
export async function deleteSnippet(id: string): Promise<void> {
  try {
    await searchApiClient.delete(`/api/v1/snippets/${id}`);
  } catch (apiErr) {
    console.warn('[SnippetStore] Failed to delete snippet from centralized API:', apiErr);
  }

  // Update local cache
  const all = await getLocalSnippets();
  const filtered = all.filter((s) => s.id !== id);
  filtered.forEach((s, i) => (s.sortOrder = i));
  await saveLocalSnippets(filtered);
}

/** Reorder snippets according to the given array of IDs */
export async function reorderSnippets(orderedIds: string[]): Promise<void> {
  try {
    await searchApiClient.put('/api/v1/snippets/reorder', { orderedIds });
  } catch (apiErr) {
    console.warn('[SnippetStore] Failed to sync reordered snippets to centralized API:', apiErr);
  }

  // Update local cache
  const all = await getLocalSnippets();
  const map = new Map(all.map((s) => [s.id, s]));
  const reordered = orderedIds
    .map((id, i) => {
      const s = map.get(id);
      if (s) s.sortOrder = i;
      return s;
    })
    .filter(Boolean) as Snippet[];
  await saveLocalSnippets(reordered);
}

/** Helper to read cached local snippets directly without API roundtrip */
async function getLocalSnippets(): Promise<Snippet[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SNIPPETS;
    return JSON.parse(raw) as Snippet[];
  } catch {
    return DEFAULT_SNIPPETS;
  }
}

// ---------------------------------------------------------------------------
// Recent Copies (Kept local to device by design)
// ---------------------------------------------------------------------------

const MAX_RECENT = 10;

/** Record a copy event in recents on this device */
export async function recordCopy(snippet: Snippet): Promise<void> {
  const existing = await getRecentCopies();
  const entry: RecentCopy = {
    snippetId: snippet.id,
    label: snippet.label,
    emoji: snippet.emoji,
    preview: snippet.content.slice(0, 80).replace(/\n/g, ' '),
    copiedAt: Date.now(),
  };
  const filtered = existing.filter((r) => r.snippetId !== snippet.id);
  const updated = [entry, ...filtered].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

/** Read recent copies list from this device */
export async function getRecentCopies(): Promise<RecentCopy[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentCopy[];
  } catch {
    return [];
  }
}
