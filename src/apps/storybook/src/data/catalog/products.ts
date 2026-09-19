import { CatalogTestProduct } from './types';
import {
  FREE_SIZE_PRESET,
  LETTER_SIZE_PRESET,
  BLOUSE_NUMERIC_PRESET,
  KIDS_SIZE_PRESET,
  WOMEN_BLOUSE_CHART,
  KIDS_WEAR_CHART,
  SAREE_DRAPE_CHART,
} from './sizePresets';

export const DIVERSE_CATALOG_PRODUCTS: CatalogTestProduct[] = [
  // --------------------------------------------------------------------------
  // 1. SAREE (Free Size / Unstitched Blouse Piece)
  // --------------------------------------------------------------------------
  {
    id: 'prod-saree-vf2b56',
    sku: 'VF2B56',
    title: 'Banarasi Dupion Silk Zari Saree',
    brand: 'VAYYARI HERITAGE',
    category: 'saree',
    categoryLabel: 'Authentic Handloom Saree',
    price: 1169,
    originalPrice: 1438,
    discountPercent: 19,
    rating: 4.8,
    reviewCount: 142,
    inStock: true,
    fabric: 'Dupion Mulberry Silk',
    stitchType: 'Ready to Drape',
    weaveOrigin: 'Varanasi (Banaras)',
    description:
      'Handcrafted Banarasi Dupion Silk saree featuring intricate tested Zari floral motifs and an opulent pallu. Includes attached matching unstitched blouse fabric.',
    highlights: [
      '100% Certified Silk Mark Authenticity',
      'Hand-loomed tested gold & silver Zari weave',
      'Includes 80cm unstitched matching blouse fabric',
      'Rich contrast border suitable for weddings and festivities',
    ],
    sizeConfig: {
      type: 'free-size',
      title: 'Drape Dimensions',
      options: FREE_SIZE_PRESET,
      defaultSelected: 'free_size',
      customNotes: 'Includes 5.5m Saree drape + 0.8m unstitched running blouse fabric attached.',
      sizeChart: SAREE_DRAPE_CHART,
    },
    swatches: {
      violet_plum: {
        label: 'Multicolor & Violet Plum',
        gradient: ['#E91E63', '#7A2E8C'],
        template: 'contrast-border',
        primaryColor: '#E91E63',
        secondaryColor: '#7A2E8C',
        colors: ['#E91E63', '#7A2E8C'],
        colorCount: 2,
        images: [
          { id: '1', label: 'Drape & Zari Border', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/1_6bfadfd5.jpg' },
          { id: '4', label: 'Pleats & Body Weave', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/4_0690ec5f.jpg' },
        ],
      },
      navy_powder: {
        label: 'Navy Blue & Powder Blue',
        gradient: ['#1A2875', '#B8D4E8'],
        template: 'contrast-border',
        primaryColor: '#1A2875',
        secondaryColor: '#B8D4E8',
        colors: ['#1A2875', '#B8D4E8'],
        colorCount: 2,
        images: [
          { id: '3', label: 'Full Ensemble View', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/3_8333ce64.jpg' },
          { id: '5', label: 'Tested Zari Pallu Detail', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/5_23c84a50.jpg' },
        ],
      },
      tangerine_magenta: {
        label: 'Tangerine & Magenta',
        gradient: ['#E8832A', '#CC2D72'],
        template: 'contrast-border',
        primaryColor: '#E8832A',
        secondaryColor: '#CC2D72',
        colors: ['#E8832A', '#CC2D72'],
        colorCount: 2,
        images: [
          { id: '2', label: 'Border Contrast Detail', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/2_94c26917.jpg' },
          { id: '10', label: 'Fabric Texture Close-up', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/10_c1cd4dbd.jpg' },
        ],
      },
      tangerine_ruby: {
        label: 'Tangerine & Ruby Red',
        gradient: ['#E8832A', '#C0392B'],
        template: 'contrast-border',
        primaryColor: '#E8832A',
        secondaryColor: '#C0392B',
        colors: ['#E8832A', '#C0392B'],
        colorCount: 2,
        images: [
          { id: '6', label: 'Grand Pallu Weave', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/6_6034e2b4.jpg' },
          { id: '7', label: 'Draped Look on Mannequin', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/7_4f5e5b1e.jpg' },
        ],
      },
      pine_powder: {
        label: '#1B4D3E & Powder Blue',
        gradient: ['#1B4D3E', '#B8D4E8'],
        template: 'contrast-border',
        primaryColor: '#1B4D3E',
        secondaryColor: '#B8D4E8',
        colors: ['#1B4D3E', '#B8D4E8'],
        colorCount: 2,
        images: [
          { id: '8', label: 'Forest Green Saree Body', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/8_73cb3005.jpg' },
          { id: '9', label: 'Sky Blue Zari Border', url: 'http://media.vayyarifashions.com/store-assets/products/vf2b56/9_06defc48.jpg' },
        ],
      },
    },
    selectedColorDefault: 'violet_plum',
    mediaGallery: [
      'http://media.vayyarifashions.com/store-assets/products/vf2b56/1_6bfadfd5.jpg',
      'http://media.vayyarifashions.com/store-assets/products/vf2b56/2_94c26917.jpg',
      'http://media.vayyarifashions.com/store-assets/products/vf2b56/3_8333ce64.jpg',
      'http://media.vayyarifashions.com/store-assets/products/vf2b56/4_0690ec5f.jpg',
    ],
  },

  // --------------------------------------------------------------------------
  // 2. STITCHED BLOUSE (Numeric Sizes 32 - 44 with Bust Subtitles)
  // --------------------------------------------------------------------------
  {
    id: 'prod-blouse-vf189b',
    sku: 'VF189B',
    title: 'Royal Zari Brocade Princess Cut Padded Blouse',
    brand: 'VAANYA LUXE',
    category: 'blouse',
    categoryLabel: 'Ready Stitched Blouse',
    price: 899,
    originalPrice: 1499,
    discountPercent: 40,
    rating: 4.7,
    reviewCount: 96,
    inStock: true,
    fabric: 'Banarasi Brocade Silk',
    stitchType: 'Stitched',
    weaveOrigin: 'Varanasi',
    description:
      'Premium ready-to-wear Princess cut blouse tailored in pure Banarasi Brocade. Padded cups, sweetheart neckline, and side-seam 2-inch alteration allowance for custom fitting.',
    highlights: [
      'Pre-stitched with premium cotton inner lining',
      'Removable built-in soft padded cups',
      '2-inch fabric margin on both side seams for easy resizing',
      'Back dori tie-up with handmade latkan tassels',
    ],
    sizeConfig: {
      type: 'numeric',
      title: 'Select Bust Size',
      options: BLOUSE_NUMERIC_PRESET,
      defaultSelected: '36',
      customNotes: 'Features 2-inch margin inside each seam. Can be altered up to 2 sizes larger.',
      sizeChart: WOMEN_BLOUSE_CHART,
    },
    swatches: {
      rani_gold: {
        label: 'Rani Pink & Gold Zari',
        gradient: ['#D81B60', '#FBC02D'],
        template: 'contrast-border',
        primaryColor: '#D81B60',
        secondaryColor: '#FBC02D',
        colors: ['#D81B60', '#FBC02D'],
        colorCount: 2,
        images: [
          { id: 'b1', label: 'Front Princess Cut', gradient: ['#D81B60', '#FBC02D'] },
          { id: 'b2', label: 'Back Hook & Dori Latkan', gradient: ['#AD1457', '#F9A825'] },
        ],
      },
      emerald_gold: {
        label: 'Emerald Green & Gold',
        gradient: ['#1B5E20', '#FBC02D'],
        template: 'contrast-border',
        primaryColor: '#1B5E20',
        secondaryColor: '#FBC02D',
        colors: ['#1B5E20', '#FBC02D'],
        colorCount: 2,
        images: [
          { id: 'b3', label: 'Front Sweetheart Neck', gradient: ['#1B5E20', '#FBC02D'] },
        ],
      },
      navy_gold: {
        label: 'Midnight Navy & Tested Zari',
        gradient: ['#0D47A1', '#FFD54F'],
        template: 'contrast-border',
        primaryColor: '#0D47A1',
        secondaryColor: '#FFD54F',
        colors: ['#0D47A1', '#FFD54F'],
        colorCount: 2,
        images: [
          { id: 'b4', label: 'Front & Sleeve Embroidery', gradient: ['#0D47A1', '#FFD54F'] },
        ],
      },
    },
    selectedColorDefault: 'rani_gold',
    mediaGallery: [
      'http://media.vayyarifashions.com/store-assets/products/vf2b56/1_6bfadfd5.jpg',
    ],
  },

  // --------------------------------------------------------------------------
  // 3. DRESS / ANARKALI SUIT (Letter Sizes XS to 3XL)
  // --------------------------------------------------------------------------
  {
    id: 'prod-dress-vf2f4a',
    sku: 'VF2F4A',
    title: 'Fendy Silk Heavy Flared Anarkali Suit Set',
    brand: 'VAANYA COUTURE',
    category: 'dress',
    categoryLabel: 'Stitched Suit & Anarkali',
    price: 1150,
    originalPrice: 1899,
    discountPercent: 39,
    rating: 4.6,
    reviewCount: 64,
    inStock: true,
    fabric: 'Fendy Pure Silk',
    stitchType: 'Stitched',
    weaveOrigin: 'Surat',
    description:
      'Exquisite 3-piece Anarkali ensemble crafted in flowy Fendy Silk with 4-meter full flare. Includes stitched kurta, matching silk santoon pants, and digital print organza dupatta.',
    highlights: [
      '3-Piece Stitched Set (Kurta + Pant + Dupatta)',
      '4-meter circular hem with can-can volume underlay',
      'Breathable pure cotton inner lining',
      'Hand embroidery on yoke and cuffs',
    ],
    sizeConfig: {
      type: 'letter',
      title: 'Select Dress Size',
      options: LETTER_SIZE_PRESET,
      defaultSelected: 'M',
      customNotes: 'Regular relaxed ethnic fit. Size M fits up to 36" bust and 30" waist.',
      sizeChart: WOMEN_BLOUSE_CHART,
    },
    swatches: {
      crimson_wine: {
        label: 'Crimson Wine Silk',
        gradient: ['#880E4F', '#4A148C'],
        template: 'multi-tone',
        primaryColor: '#880E4F',
        secondaryColor: '#4A148C',
        colors: ['#880E4F', '#4A148C'],
        colorCount: 2,
        images: [
          { id: 'd1', label: 'Full 4M Flare View', url: 'http://media.vayyarifashions.com/store-assets/products/vf2f4a/1789207340367_1789207338.jpg' },
          { id: 'd2', label: 'Yoke Zari Embroidery', url: 'http://media.vayyarifashions.com/store-assets/products/vf2f4a/1789207341253_1789207339.jpg' },
          { id: 'd3', label: 'Organza Dupatta Drape', url: 'http://media.vayyarifashions.com/store-assets/products/vf2f4a/1789207341699_1789207339.jpg' },
        ],
      },
      teal_peacock: {
        label: 'Teal & Peacock Blue',
        gradient: ['#00695C', '#01579B'],
        template: 'multi-tone',
        primaryColor: '#00695C',
        secondaryColor: '#01579B',
        colors: ['#00695C', '#01579B'],
        colorCount: 2,
        images: [
          { id: 'd4', label: 'Teal Anarkali Flare', url: 'http://media.vayyarifashions.com/store-assets/products/vf2f4a/1789207340367_1789207338.jpg' },
        ],
      },
    },
    selectedColorDefault: 'crimson_wine',
    mediaGallery: [
      'http://media.vayyarifashions.com/store-assets/products/vf2f4a/1789207340367_1789207338.jpg',
      'http://media.vayyarifashions.com/store-assets/products/vf2f4a/1789207341253_1789207339.jpg',
      'http://media.vayyarifashions.com/store-assets/products/vf2f4a/1789207341699_1789207339.jpg',
    ],
  },

  // --------------------------------------------------------------------------
  // 4. KIDS ETHNIC WEAR (Age-Based & Number Sizes: 16 to 36 / 6M to 16Y)
  // --------------------------------------------------------------------------
  {
    id: 'prod-kids-vf46d',
    sku: 'VF46D',
    title: 'Pavitra Designer Kids Girls Lehenga Choli Set',
    brand: 'VAYYARI JUNIOR',
    category: 'kids',
    categoryLabel: 'Kids Ethnic (6M - 16Y)',
    price: 799,
    originalPrice: 1299,
    discountPercent: 38,
    rating: 4.9,
    reviewCount: 112,
    inStock: true,
    fabric: 'Chanderi Cotton Silk',
    stitchType: 'Stitched',
    weaveOrigin: 'Chanderi',
    description:
      'Authentic festive Lehenga Choli for girls aged 6 months up to 16 years. Crafted in lightweight Chanderi Cotton Silk with soft 100% skin-friendly cotton lining and adjustable waist drawstring.',
    highlights: [
      'Age intervals from 6 Months to 16 Years',
      '100% Cotton skin-friendly inner lining',
      'Elasticated back waistband with drawstring for growing children',
      'Zero-itch tested seams with soft border bindings',
    ],
    sizeConfig: {
      type: 'kids',
      title: 'Select Age / Size No.',
      options: KIDS_SIZE_PRESET,
      defaultSelected: '22',
      customNotes: 'If child is taller than average for their age group, order one size up.',
      sizeChart: KIDS_WEAR_CHART,
    },
    swatches: {
      rani_yellow: {
        label: 'Festive Rani Pink & Haldi Yellow',
        gradient: ['#E91E63', '#FFD600'],
        template: 'contrast-border',
        primaryColor: '#E91E63',
        secondaryColor: '#FFD600',
        colors: ['#E91E63', '#FFD600'],
        colorCount: 2,
        images: [
          { id: 'k1', label: 'Lehenga Choli Set View', url: 'http://media.vayyarifashions.com/store-assets/products/vf46d/1782041799714_1782041799.jpg' },
          { id: 'k2', label: 'Choli Neck & Latkan Details', url: 'http://media.vayyarifashions.com/store-assets/products/vf46d/1782041801162_1782041800.jpg' },
        ],
      },
      peacock_orange: {
        label: 'Peacock Blue & Tangerine',
        gradient: ['#0288D1', '#FF6D00'],
        template: 'contrast-border',
        primaryColor: '#0288D1',
        secondaryColor: '#FF6D00',
        colors: ['#0288D1', '#FF6D00'],
        colorCount: 2,
        images: [
          { id: 'k3', label: 'Boy & Girl Matching Set', url: 'http://media.vayyarifashions.com/store-assets/products/vf46d/1782041799714_1782041799.jpg' },
        ],
      },
    },
    selectedColorDefault: 'rani_yellow',
    mediaGallery: [
      'http://media.vayyarifashions.com/store-assets/products/vf46d/1782041799714_1782041799.jpg',
      'http://media.vayyarifashions.com/store-assets/products/vf46d/1782041801162_1782041800.jpg',
    ],
  },

  // --------------------------------------------------------------------------
  // 5. LEHENGA (Semi-Stitched / Customizable Waist 28"-42")
  // --------------------------------------------------------------------------
  {
    id: 'prod-lehenga-vf2f4f',
    sku: 'VF2F4F',
    title: 'Vichitra Silk Embroidered Semi-Stitched Lehenga Set',
    brand: 'VAANYA BRIDAL',
    category: 'lehenga',
    categoryLabel: 'Bridal & Festive Lehenga',
    price: 1250,
    originalPrice: 2499,
    discountPercent: 50,
    rating: 4.8,
    reviewCount: 88,
    inStock: true,
    fabric: 'Vichitra Silk & Heavy Net',
    stitchType: 'Semi-Stitched',
    weaveOrigin: 'Surat',
    description:
      'Heavy designer wedding Lehenga Set featuring sequin coding embroidery and double-layer can-can mesh. Semi-stitched skirt fits waist 28" to 42". Includes unstitched 1m blouse fabric and bridal net dupatta.',
    highlights: [
      'Semi-stitched skirt with 3.5m flare and built-in can-can',
      'Customizable waist fitting from 28 inches up to 42 inches',
      '1.0m unstitched heavy embroidered blouse fabric',
      '2.5m scalloped bridal net dupatta with 4-side lace',
    ],
    sizeConfig: {
      type: 'free-size',
      title: 'Customizable Sizing',
      options: [
        {
          id: 'semi_stitched',
          label: 'Semi-Stitched',
          subtitle: 'Waist 28" - 42"',
          measurement: 'Skirt Length 42" · Flare 3.5m',
          badge: 'Customizable Fit',
        },
      ],
      defaultSelected: 'semi_stitched',
      customNotes: 'Skirt side seam is open for custom waist tailoring (fits 28" to 42" waist).',
      sizeChart: WOMEN_BLOUSE_CHART,
    },
    swatches: {
      plum_purple: {
        label: 'Royal Plum Purple & Zari',
        gradient: ['#4A148C', '#AB47BC'],
        template: 'solid',
        primaryColor: '#4A148C',
        secondaryColor: '#AB47BC',
        colors: ['#4A148C'],
        colorCount: 2,
        images: [
          { id: 'l1', label: 'Full 3.5M Can-Can Flare', url: 'http://media.vayyarifashions.com/store-assets/products/vf2f4f/1789631678570_1789631676.jpg' },
          { id: 'l2', label: 'Yoke & Waistband Sequin Embroidery', url: 'http://media.vayyarifashions.com/store-assets/products/vf2f4f/1789631678737_1789631676.jpg' },
        ],
      },
      ruby_crimson: {
        label: 'Bridal Ruby Crimson',
        gradient: ['#B71C1C', '#E53935'],
        template: 'solid',
        primaryColor: '#B71C1C',
        secondaryColor: '#E53935',
        colors: ['#B71C1C'],
        colorCount: 2,
        images: [
          { id: 'l3', label: 'Bridal Crimson Flare', url: 'http://media.vayyarifashions.com/store-assets/products/vf2f4f/1789631678570_1789631676.jpg' },
        ],
      },
    },
    selectedColorDefault: 'plum_purple',
    mediaGallery: [
      'http://media.vayyarifashions.com/store-assets/products/vf2f4f/1789631678570_1789631676.jpg',
      'http://media.vayyarifashions.com/store-assets/products/vf2f4f/1789631678737_1789631676.jpg',
    ],
  },
];
