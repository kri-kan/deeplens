import { StoreCurationMediaItem, StoreColorGroup, StoreAuditLogEntry } from './types';

export const INITIAL_COLOR_GROUPS: StoreColorGroup[] = [
  {
    id: 'cg-emerald',
    name: 'Emerald Green & Gold Zari',
    colorwayCode: 'VF2B58-EMR',
    template: 'contrast-border',
    slotA: '#1B4D3E', // Emerald Green body (80%)
    slotB: '#D4AF37', // Antique Gold Zari border (20%)
    isAvailable: true,
  },
  {
    id: 'cg-crimson',
    name: 'Crimson Red & Rani Pink',
    colorwayCode: 'VF2B58-RED',
    template: 'multi-tone',
    slotA: '#C0392B', // Ruby Red
    slotB: '#E91E63', // Rani Pink
    isAvailable: true,
  },
  {
    id: 'cg-royal',
    name: 'Royal Blue & Silver Weft',
    colorwayCode: 'VF2B58-BLU',
    template: 'solid',
    slotA: '#1A2875', // Navy / Royal Blue
    isAvailable: true,
  },
  {
    id: 'cg-peacock',
    name: 'Peacock 3-Color Festive Pie',
    colorwayCode: 'VF2B58-PCK',
    template: 'multi-shade',
    slotA: '#2035C0', // Royal Blue
    slotB: '#1E8C4E', // Emerald
    slotC: '#C4A43A', // Antique Gold
    colors: ['#2035C0', '#1E8C4E', '#C4A43A'],
    colorCount: 3,
    isAvailable: true,
  },
];

export const MOCK_CURATION_MEDIA: StoreCurationMediaItem[] = [
  {
    id: 'm-1',
    uri: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/be0f2da8-68ee-462a-8703-f0cfa1dd289c/thumbnail?spec=large',
    thumbnailUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    mediaType: 'image',
    sortOrder: 1,
    isHero: true,
    isQualified: true,
    isCommon: false,
    colorGroupId: 'cg-crimson',
    dwellTimeSeconds: 4.8,
    title: 'Full Front Drape - Crimson Red Body',
    detectedColors: [
      { hex: '#C0392B', name: 'Ruby Red', percentage: 68.2 },
      { hex: '#D4AF37', name: 'Antique Gold', percentage: 22.4 },
      { hex: '#722B2B', name: 'Wine Maroon', percentage: 9.4 },
    ],
  },
  {
    id: 'm-2',
    uri: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/d883ef2e-4977-40d6-89f3-fc2d07d4207b/thumbnail?spec=large',
    thumbnailUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    mediaType: 'image',
    sortOrder: 2,
    isHero: false,
    isQualified: true,
    isCommon: true, // ★ Common to all variants (Zari Pallu Detail)
    dwellTimeSeconds: 6.2,
    title: 'Zari Pallu Craft Close-up (Universal Craft)',
    detectedColors: [
      { hex: '#D4AF37', name: 'Antique Gold', percentage: 74.5 },
      { hex: '#C49678', name: 'Rose Gold', percentage: 18.2 },
      { hex: '#FCFCFA', name: 'Pure White', percentage: 7.3 },
    ],
  },
  {
    id: 'm-3',
    uri: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/b711695c-b308-493d-80c2-ce13fe7a2fb1/thumbnail?spec=large',
    thumbnailUri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    mediaType: 'image',
    sortOrder: 3,
    isHero: false,
    isQualified: true,
    isCommon: false,
    colorGroupId: 'cg-emerald',
    dwellTimeSeconds: 5.1,
    title: 'Front Drape - Bottle Emerald Green',
    detectedColors: [
      { hex: '#1B4D3E', name: 'Emerald', percentage: 71.0 },
      { hex: '#D4AF37', name: 'Antique Gold', percentage: 19.5 },
      { hex: '#1E8C4E', name: 'Forest Green', percentage: 9.5 },
    ],
  },
  {
    id: 'm-4',
    uri: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/6e85a0be-44bc-4e18-89e2-832bf4aea178/thumbnail?spec=large',
    thumbnailUri: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=80',
    rawVideoUrl: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/6e85a0be-44bc-4e18-89e2-832bf4aea178/raw',
    mediaType: 'video',
    durationSeconds: 14,
    sortOrder: 4,
    isHero: false,
    isQualified: true,
    isCommon: false,
    colorGroupId: 'cg-crimson',
    dwellTimeSeconds: 8.5,
    title: 'Model Drape Movement & Fall Reel',
    detectedColors: [
      { hex: '#C0392B', name: 'Ruby Red', percentage: 60.1 },
      { hex: '#D4AF37', name: 'Antique Gold', percentage: 25.0 },
    ],
  },
  {
    id: 'm-5',
    uri: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/4e772ccb-30cf-457e-80f9-c0bf35845101/thumbnail?spec=large',
    thumbnailUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    mediaType: 'image',
    sortOrder: 5,
    isHero: false,
    isQualified: true,
    isCommon: false,
    colorGroupId: 'cg-emerald',
    dwellTimeSeconds: 3.9,
    title: 'Pleats & Border Detail - Emerald Shade',
    detectedColors: [
      { hex: '#1B4D3E', name: 'Emerald', percentage: 66.8 },
      { hex: '#D4AF37', name: 'Antique Gold', percentage: 21.2 },
    ],
  },
  {
    id: 'm-6',
    uri: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/f87e715f-fcd4-4d2f-89ff-3ff157601dea/thumbnail?spec=large',
    thumbnailUri: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80',
    rawVideoUrl: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/f87e715f-fcd4-4d2f-89ff-3ff157601dea/raw',
    mediaType: 'video',
    durationSeconds: 12,
    sortOrder: 6,
    isHero: false,
    isQualified: true,
    isCommon: true, // ★ Common to all variants (Artisan Weave Inspection)
    dwellTimeSeconds: 9.1,
    title: 'Handloom Shuttle Weave Inspection (Artisan Proof)',
    detectedColors: [
      { hex: '#D4AF37', name: 'Antique Gold', percentage: 55.0 },
      { hex: '#EDE8D5', name: 'Cream Beige', percentage: 32.0 },
    ],
  },
  {
    id: 'm-7',
    uri: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/7e297a5a-04a2-4906-8289-3963c841835f/thumbnail?spec=large',
    thumbnailUri: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
    rawVideoUrl: 'http://krikanserver.taild227d9.ts.net:5000/api/v1/catalog/media/7e297a5a-04a2-4906-8289-3963c841835f/raw',
    mediaType: 'video',
    durationSeconds: 15,
    sortOrder: 7,
    isHero: false,
    isQualified: false, // Disqualified: vendor studio duplicate / blurry lighting
    isCommon: false,
    colorGroupId: 'cg-emerald',
    dwellTimeSeconds: 1.2,
    title: 'Raw Vendor Chat Clip (Low Light / Excluded)',
    detectedColors: [
      { hex: '#595959', name: 'Charcoal', percentage: 52.0 },
      { hex: '#1B4D3E', name: 'Emerald', percentage: 30.0 },
    ],
  },
];

export const MOCK_CURATION_AUDIT_LOGS: StoreAuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: 'Today, 03:15 AM',
    author: 'Krishna Kanth (Lead)',
    actionText: 'Updated Sale Price from ₹11,999 to ₹10,999 (27% OFF MRP).',
  },
  {
    id: 'log-2',
    timestamp: 'Today, 03:00 AM',
    author: 'Krishna Kanth (Lead)',
    actionText: "Linked 'Royal Blue (VF2B58-BLU)' as color variant under Heritage Collection.",
  },
  {
    id: 'log-3',
    timestamp: 'Today, 02:45 AM',
    author: 'System (Kafka Worker)',
    actionText: 'Ingested raw product data & 7 media assets (4 photos, 3 videos) for VF2B58.',
  },
];
