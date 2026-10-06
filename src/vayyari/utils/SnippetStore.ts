import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@deeplens/copy_snippets';
const RECENT_KEY = '@deeplens/recent_copies';

export interface Snippet {
  id: string;
  label: string;
  emoji: string;
  color: string;
  content: string;
  sortOrder: number;
  createdAt: number;
}

export interface RecentCopy {
  snippetId: string;
  label: string;
  emoji: string;
  preview: string;
  copiedAt: number;
}

/** Default snippets seeded on first launch */
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

/** Read all snippets from AsyncStorage; seeds defaults if empty */
export async function getSnippets(): Promise<Snippet[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await saveAllSnippets(DEFAULT_SNIPPETS);
      return DEFAULT_SNIPPETS;
    }
    const parsed: Snippet[] = JSON.parse(raw);
    return parsed.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return DEFAULT_SNIPPETS;
  }
}

/** Persist the full snippets array */
async function saveAllSnippets(snippets: Snippet[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

/** Add or update a single snippet */
export async function upsertSnippet(snippet: Snippet): Promise<void> {
  const all = await getSnippets();
  const idx = all.findIndex((s) => s.id === snippet.id);
  if (idx >= 0) {
    all[idx] = snippet;
  } else {
    snippet.sortOrder = all.length;
    all.push(snippet);
  }
  await saveAllSnippets(all);
}

/** Delete a snippet by ID */
export async function deleteSnippet(id: string): Promise<void> {
  const all = await getSnippets();
  const filtered = all.filter((s) => s.id !== id);
  // Re-index sortOrder
  filtered.forEach((s, i) => (s.sortOrder = i));
  await saveAllSnippets(filtered);
}

/** Reorder snippets (drag & drop / future use) */
export async function reorderSnippets(orderedIds: string[]): Promise<void> {
  const all = await getSnippets();
  const map = new Map(all.map((s) => [s.id, s]));
  const reordered = orderedIds
    .map((id, i) => {
      const s = map.get(id);
      if (s) s.sortOrder = i;
      return s;
    })
    .filter(Boolean) as Snippet[];
  await saveAllSnippets(reordered);
}

// ---------------------------------------------------------------------------
// Recent Copies
// ---------------------------------------------------------------------------

const MAX_RECENT = 10;

/** Record a copy event in recents */
export async function recordCopy(snippet: Snippet): Promise<void> {
  const existing = await getRecentCopies();
  const entry: RecentCopy = {
    snippetId: snippet.id,
    label: snippet.label,
    emoji: snippet.emoji,
    preview: snippet.content.slice(0, 80).replace(/\n/g, ' '),
    copiedAt: Date.now(),
  };
  // Remove previous entry for same snippet to avoid duplicates, then prepend
  const filtered = existing.filter((r) => r.snippetId !== snippet.id);
  const updated = [entry, ...filtered].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

/** Read recent copies list */
export async function getRecentCopies(): Promise<RecentCopy[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentCopy[];
  } catch {
    return [];
  }
}
