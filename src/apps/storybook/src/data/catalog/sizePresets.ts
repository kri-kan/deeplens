import { SizeOption, SizeChartData, SizeCategoryType } from './types';

// -------------------------------------------------------------
// 1. NO SIZE PRESETS: ONE SIZE (UNSTITCHED) & FREE SIZE (STITCHED BLOUSE)
// -------------------------------------------------------------
export const ONE_SIZE_PRESET: SizeOption[] = [
  {
    id: 'one_size',
    label: 'One Size',
    subtitle: '5.5m Saree + 0.8m Unstitched Blouse Piece',
    measurement: 'Length 5.5m · Blouse 80cm',
    badge: 'Unstitched Drape',
  },
];

export const FREE_SIZE_PRESET: SizeOption[] = [
  {
    id: 'free_size',
    label: 'Free Size',
    subtitle: 'Stitched Blouse with Free Size / Alterable Seams',
    measurement: 'Universal Drape · Alterable Seams (Bust 34"-42")',
    badge: 'Alterable Fit',
  },
];

export const UNSTITCHED_DRESS_PRESET: SizeOption[] = [
  {
    id: 'one_size',
    label: 'One Size',
    subtitle: 'Unstitched Dress Material',
    measurement: 'Top 2.5m · Bottom 2.0m · Dupatta 2.25m',
    badge: 'Custom Tailorable',
  },
];

// -------------------------------------------------------------
// 2. LETTER SIZES (Stitched Kurta Sets, Gowns, Ready Dresses)
// -------------------------------------------------------------
export const LETTER_SIZE_PRESET: SizeOption[] = [
  { id: 'XS', label: 'XS', subtitle: 'Bust 32"', measurement: 'Bust 32" · Waist 26"' },
  { id: 'S', label: 'S', subtitle: 'Bust 34"', measurement: 'Bust 34" · Waist 28"' },
  { id: 'M', label: 'M', subtitle: 'Bust 36"', measurement: 'Bust 36" · Waist 30"' },
  { id: 'L', label: 'L', subtitle: 'Bust 38"', measurement: 'Bust 38" · Waist 32"' },
  { id: 'XL', label: 'XL', subtitle: 'Bust 40"', measurement: 'Bust 40" · Waist 34"' },
  { id: '2XL', label: '2XL', subtitle: 'Bust 42"', measurement: 'Bust 42" · Waist 36"' },
  { id: '3XL', label: '3XL', subtitle: 'Bust 44"', measurement: 'Bust 44" · Waist 38"' },
  { id: '4XL', label: '4XL', subtitle: 'Bust 46"', measurement: 'Bust 46" · Waist 40"' },
  { id: '5XL', label: '5XL', subtitle: 'Bust 48"', measurement: 'Bust 48" · Waist 42"' },
];

/** Default selected size range for letter sizing (M through 3XL) */
export const DEFAULT_SELECTED_LETTER_SIZES: string[] = ['M', 'L', 'XL', '2XL', '3XL'];

// -------------------------------------------------------------
// 3. NUMERIC SIZES (Stitched Blouses, Bust / Chest Inches)
// -------------------------------------------------------------
export const BLOUSE_NUMERIC_PRESET: SizeOption[] = [
  { id: '32', label: '32', subtitle: 'Bust 32"', measurement: 'Underbust 26-28"' },
  { id: '34', label: '34', subtitle: 'Bust 34"', measurement: 'Underbust 28-30"' },
  { id: '36', label: '36', subtitle: 'Bust 36"', measurement: 'Underbust 30-32"' },
  { id: '38', label: '38', subtitle: 'Bust 38"', measurement: 'Underbust 32-34"' },
  { id: '40', label: '40', subtitle: 'Bust 40"', measurement: 'Underbust 34-36"' },
  { id: '42', label: '42', subtitle: 'Bust 42"', measurement: 'Underbust 36-38"' },
  { id: '44', label: '44', subtitle: 'Bust 44"', measurement: 'Underbust 38-40"' },
];

// -------------------------------------------------------------
// 4. KIDS SIZES (0-16 Years Ethnic Wear - Matches Admin Order Form)
// -------------------------------------------------------------
export const KIDS_SIZE_PRESET: SizeOption[] = [
  { id: '16', label: '16', subtitle: '6 Month', measurement: 'Chest 16" · Len 8"' },
  { id: '18', label: '18', subtitle: '1 Yrs', measurement: 'Chest 18" · Len 9"' },
  { id: '20', label: '20', subtitle: '2 Yrs', measurement: 'Chest 20" · Len 10"' },
  { id: '22', label: '22', subtitle: '3 Yrs', measurement: 'Chest 22" · Len 11"' },
  { id: '24', label: '24', subtitle: '4 Yrs', measurement: 'Chest 24" · Len 11"' },
  { id: '25', label: '25', subtitle: '5 Yrs', measurement: 'Chest 25" · Len 12"' },
  { id: '26', label: '26', subtitle: '6 Yrs', measurement: 'Chest 26" · Len 12"' },
  { id: '27', label: '27', subtitle: '7 Yrs', measurement: 'Chest 27" · Len 13"' },
  { id: '28', label: '28', subtitle: '8 Yrs', measurement: 'Chest 28" · Len 13"' },
  { id: '30', label: '30', subtitle: '9-10 Y', measurement: 'Chest 30" · Len 14"' },
  { id: '32', label: '32', subtitle: '11-12 Y', measurement: 'Chest 32" · Len 14"' },
  { id: '34', label: '34', subtitle: '13-14 Y', measurement: 'Chest 34" · Len 15"' },
  { id: '36', label: '36', subtitle: '15-16 Y', measurement: 'Chest 36" · Len 15"' },
];

// -------------------------------------------------------------
// 5. SIZE CHART DATA TABLES (For Size Chart Modal)
// -------------------------------------------------------------
// -------------------------------------------------------------
// 5. SIZE CHART DATA TABLES (For Size Chart Modal & Form Factors)
// -------------------------------------------------------------

/** 1. Saree & Unstitched Drape Guide (Universal One Size) */
export const SAREE_DRAPE_CHART: SizeChartData = {
  id: 'chart-saree-drape',
  category: 'saree',
  title: 'Saree & Garment Drape Specifications',
  subtitle: 'Handloom silk specifications with certified Silk Mark standard dimensions. Universal one-size garment.',
  unit: 'in',
  alterationNote: 'Universal Fit: Designed to drape gracefully on all body types and heights (4\'10" to 6\'2") without stitching alterations.',
  columns: [
    { key: 'component', label: 'Component', minWidth: 140 },
    { key: 'length', label: 'Length (m / yd)', minWidth: 140 },
    { key: 'width', label: 'Width / Fall (in / cm)', minWidth: 130 },
    { key: 'notes', label: 'Craft & Finish Details', minWidth: 180 },
  ],
  rows: [
    {
      size: 'saree_body',
      label: 'Saree Body & Pallu',
      chestInches: '5.50 Metres (6.0 Yards)',
      chestCm: '550 cm',
      lengthInches: '46 - 48 Inches',
      lengthCm: '117 - 122 cm',
      notes: 'Continuous weave with Kadwa pallu, bootis and contrast border.',
    },
    {
      size: 'blouse_piece',
      label: 'Unstitched Blouse Piece',
      chestInches: '0.80 Metres (32 Inches)',
      chestCm: '80 cm',
      lengthInches: '44 - 46 Inches',
      lengthCm: '112 - 117 cm',
      notes: 'Attached running fabric with matching border for sleeves and neck.',
    },
    {
      size: 'total_length',
      label: 'Complete Running Length',
      chestInches: '6.30 Metres (6.9 Yards)',
      chestCm: '630 cm',
      lengthInches: '46 - 48 Inches',
      lengthCm: '117 - 122 cm',
      notes: 'Standard certified length meeting Textile Committee norms.',
    },
  ],
  tips: [
    'Tuck-in depth: The saree waistband can be adjusted 2-4 inches higher or lower depending on footwear height.',
    'Pleats count: Standard Nivi drape utilizes 7 to 9 crisp 5-inch pleats for balanced volume and effortless walking.',
    'Pallu drape: 1.2 to 1.5 metres of pallu is traditionally thrown over the left shoulder for an elegant cascading fall.',
  ],
  drapeGuide: {
    sareeLength: '5.5 Metres (6.0 Yards)',
    blousePiece: '0.8 Metres (80 cm)',
    width: '46 - 48 Inches (117 - 122 cm)',
    steps: [
      { title: '1. Basic Waist Tuck', desc: 'Starting at the navel, tuck the plain inner edge into the inskirt, rotating clockwise a full 360 degrees.' },
      { title: '2. Measure the Pallu', desc: 'Bring the ornamental end under your right arm and drape loosely over the left shoulder, letting it hang to mid-calf.' },
      { title: '3. Fold Center Pleats', desc: 'Make 7 to 9 even pleats (approx. 5 inches wide) with the remaining fabric and tuck firmly into the front navel.' },
      { title: '4. Pin & Final Accent', desc: 'Secure the shoulder pleat with a saree pin and adjust the front drape for a seamless contoured silhouette.' },
    ],
  },
  measuringGuide: {
    points: [
      { name: 'Garment Length', desc: 'Total fabric length from inner tail to outer pallu tip (6.3m total including 0.8m blouse piece).' },
      { name: 'Width / Fall', desc: 'Vertical height from top waistband edge to bottom embroidered scalloped border.' },
      { name: 'Blouse Cut', desc: 'Cut along the running demarcation line before stitching blouse.' },
    ],
  },
};

/** 2. Free Size Stitched Blouse (Alterable Fit 34"-42") */
export const FREE_SIZE_STITCHED_BLOUSE_CHART: SizeChartData = {
  id: 'chart-free-size-blouse',
  category: 'blouse',
  title: 'Free Size Stitched Blouse Guide',
  subtitle: 'Ready-to-wear stitched blouse engineered with generous multi-size alteration seam margins.',
  unit: 'in',
  alterationNote: '✨ 2-Inch Interior Seams: Two release stitches on each side allow self-alteration from 34" up to 42" bust.',
  columns: [
    { key: 'parameter', label: 'Garment Metric', minWidth: 150 },
    { key: 'rangeInches', label: 'Fit Range (Inches)', minWidth: 140 },
    { key: 'rangeCm', label: 'Fit Range (Metric)', minWidth: 130 },
    { key: 'details', label: 'Tailoring Details', minWidth: 180 },
  ],
  rows: [
    {
      size: 'bust_range',
      label: 'Bust Fitting Range',
      chestInches: '34" - 42" (Default 38")',
      chestCm: '86 - 106 cm (Default 96 cm)',
      notes: 'Ships at standard 38" bust. Easy release stitches expand to 42".',
    },
    {
      size: 'underbust_waist',
      label: 'Underbust / Waist',
      chestInches: '28" - 36"',
      chestCm: '71 - 91 cm',
      notes: 'Contoured princess-cut darts with back tie-ups (Dori) for snug fit.',
    },
    {
      size: 'front_length',
      label: 'Blouse Front Length',
      chestInches: '14.5" - 15.0"',
      chestCm: '37 - 38 cm',
      notes: 'Measured from high shoulder point down to bottom hemline.',
    },
    {
      size: 'cups_padding',
      label: 'Built-in Padding',
      chestInches: 'Molded Padded Cups',
      chestCm: 'Molded Padded Cups',
      notes: 'Premium light breathable padding; easily removable if desired.',
    },
  ],
  tips: [
    'How to adjust: Simply snip the outermost side seam thread inside the lining to instantly gain 2 inches of bust room.',
    'Back ties: The adjustable tasseled dori at the back allows precision tightening around the upper back and shoulder.',
  ],
  measuringGuide: {
    points: [
      { name: 'Bust Circumference', desc: 'Measure around the fullest part of your bust while wearing your regular bra.' },
      { name: 'Underbust Band', desc: 'Measure snugly right under your bust where the lower blouse band rests.' },
    ],
  },
};

/** 3. Women\'s Numeric Stitched Blouses (32 to 44) */
export const WOMEN_BLOUSE_CHART: SizeChartData = {
  id: 'chart-numeric-blouse',
  category: 'blouse',
  title: 'Stitched Blouse Size Chart (Bust 32" – 44")',
  subtitle: 'Tailored ethnic blouses with princess cut padding and 2-inch side seam margins on both sides.',
  unit: 'in',
  alterationNote: 'Includes a 2-inch extra fabric margin on both interior side seams for quick home or boutique alteration.',
  columns: [
    { key: 'size', label: 'Size (Bust)', minWidth: 100 },
    { key: 'bust', label: 'Bust (in / cm)', minWidth: 120 },
    { key: 'underbust', label: 'Underbust', minWidth: 110 },
    { key: 'shoulder', label: 'Shoulder', minWidth: 100 },
    { key: 'armhole', label: 'Armhole', minWidth: 100 },
    { key: 'length', label: 'Length', minWidth: 90 },
  ],
  rows: [
    {
      size: '32',
      label: '32 (XS)',
      chestInches: '32"',
      chestCm: '81 cm',
      bustInches: '32"',
      bustCm: '81 cm',
      underbustInches: '26 - 27"',
      underbustCm: '66 - 69 cm',
      shoulderInches: '13.5"',
      shoulderCm: '34 cm',
      armholeInches: '14.5"',
      armholeCm: '37 cm',
      lengthInches: '13.5"',
      lengthCm: '34 cm',
    },
    {
      size: '34',
      label: '34 (S)',
      chestInches: '34"',
      chestCm: '86 cm',
      bustInches: '34"',
      bustCm: '86 cm',
      underbustInches: '28 - 29"',
      underbustCm: '71 - 74 cm',
      shoulderInches: '14.0"',
      shoulderCm: '36 cm',
      armholeInches: '15.0"',
      armholeCm: '38 cm',
      lengthInches: '14.0"',
      lengthCm: '36 cm',
    },
    {
      size: '36',
      label: '36 (M)',
      chestInches: '36"',
      chestCm: '91 cm',
      bustInches: '36"',
      bustCm: '91 cm',
      underbustInches: '30 - 31"',
      underbustCm: '76 - 79 cm',
      shoulderInches: '14.5"',
      shoulderCm: '37 cm',
      armholeInches: '15.5"',
      armholeCm: '39 cm',
      lengthInches: '14.5"',
      lengthCm: '37 cm',
    },
    {
      size: '38',
      label: '38 (L)',
      chestInches: '38"',
      chestCm: '96 cm',
      bustInches: '38"',
      bustCm: '96 cm',
      underbustInches: '32 - 33"',
      underbustCm: '81 - 84 cm',
      shoulderInches: '15.0"',
      shoulderCm: '38 cm',
      armholeInches: '16.0"',
      armholeCm: '41 cm',
      lengthInches: '15.0"',
      lengthCm: '38 cm',
    },
    {
      size: '40',
      label: '40 (XL)',
      chestInches: '40"',
      chestCm: '101 cm',
      bustInches: '40"',
      bustCm: '101 cm',
      underbustInches: '34 - 35"',
      underbustCm: '86 - 89 cm',
      shoulderInches: '15.5"',
      shoulderCm: '39 cm',
      armholeInches: '16.5"',
      armholeCm: '42 cm',
      lengthInches: '15.5"',
      lengthCm: '39 cm',
    },
    {
      size: '42',
      label: '42 (2XL)',
      chestInches: '42"',
      chestCm: '106 cm',
      bustInches: '42"',
      bustCm: '106 cm',
      underbustInches: '36 - 37"',
      underbustCm: '91 - 94 cm',
      shoulderInches: '16.0"',
      shoulderCm: '41 cm',
      armholeInches: '17.0"',
      armholeCm: '43 cm',
      lengthInches: '16.0"',
      lengthCm: '41 cm',
    },
    {
      size: '44',
      label: '44 (3XL)',
      chestInches: '44"',
      chestCm: '111 cm',
      bustInches: '44"',
      bustCm: '111 cm',
      underbustInches: '38 - 39"',
      underbustCm: '96 - 99 cm',
      shoulderInches: '16.5"',
      shoulderCm: '42 cm',
      armholeInches: '17.5"',
      armholeCm: '44 cm',
      lengthInches: '16.5"',
      lengthCm: '42 cm',
    },
  ],
  tips: [
    'Measure around the fullest part of your bust while wearing the brassiere you intend to pair with this blouse.',
    'Underbust should be measured around the ribcage directly beneath the bust line.',
    'Padded cups are stitched inside the lining for a flawless lift and structure; can be removed if required.',
  ],
  measuringGuide: {
    points: [
      { name: '1. Bust', desc: 'Fullest measurement around chest across apex of bust.' },
      { name: '2. Underbust', desc: 'Snug band measurement directly underneath the bust.' },
      { name: '3. Shoulder', desc: 'Horizontal tip-to-tip measurement across the upper back.' },
      { name: '4. Armhole', desc: 'Circumference around the curve of the shoulder armpit junction.' },
      { name: '5. Length', desc: 'Vertical distance from shoulder neck point to bottom waistband.' },
    ],
  },
};

/** 4. Kurtis, Anarkalis & Ethnic Dresses (Letter Sizes XS – 5XL) */
export const KURTI_ANARKALI_CHART: SizeChartData = {
  id: 'chart-kurti-anarkali',
  category: 'kurti',
  title: 'Kurti & Anarkali Suit Size Chart (XS – 5XL)',
  subtitle: 'Measurement specifications for Stitched Kurtas, Anarkali Gowns & Co-ord Sets with comfort ease.',
  unit: 'in',
  alterationNote: 'Garments include 2.5 to 3 inches of garment ease over body measurements for relaxed movement.',
  columns: [
    { key: 'size', label: 'Size', minWidth: 80 },
    { key: 'bust', label: 'Bust (in / cm)', minWidth: 120 },
    { key: 'waist', label: 'Waist (in / cm)', minWidth: 110 },
    { key: 'hip', label: 'Hip (in / cm)', minWidth: 110 },
    { key: 'length', label: 'Kurta Length', minWidth: 110 },
    { key: 'flare', label: 'Ghera / Flare', minWidth: 110 },
  ],
  rows: [
    {
      size: 'XS',
      label: 'XS (34)',
      chestInches: '34"',
      chestCm: '86 cm',
      bustInches: '34"',
      bustCm: '86 cm',
      waistInches: '30"',
      waistCm: '76 cm',
      hipInches: '36"',
      hipCm: '91 cm',
      lengthInches: '48"',
      lengthCm: '122 cm',
      flareInches: '110"',
      flareCm: '280 cm',
    },
    {
      size: 'S',
      label: 'S (36)',
      chestInches: '36"',
      chestCm: '91 cm',
      bustInches: '36"',
      bustCm: '91 cm',
      waistInches: '32"',
      waistCm: '81 cm',
      hipInches: '38"',
      hipCm: '96 cm',
      lengthInches: '48"',
      lengthCm: '122 cm',
      flareInches: '115"',
      flareCm: '292 cm',
    },
    {
      size: 'M',
      label: 'M (38)',
      chestInches: '38"',
      chestCm: '96 cm',
      bustInches: '38"',
      bustCm: '96 cm',
      waistInches: '34"',
      waistCm: '86 cm',
      hipInches: '40"',
      hipCm: '101 cm',
      lengthInches: '48"',
      lengthCm: '122 cm',
      flareInches: '120"',
      flareCm: '305 cm',
    },
    {
      size: 'L',
      label: 'L (40)',
      chestInches: '40"',
      chestCm: '101 cm',
      bustInches: '40"',
      bustCm: '101 cm',
      waistInches: '36"',
      waistCm: '91 cm',
      hipInches: '42"',
      hipCm: '106 cm',
      lengthInches: '49"',
      lengthCm: '124 cm',
      flareInches: '125"',
      flareCm: '318 cm',
    },
    {
      size: 'XL',
      label: 'XL (42)',
      chestInches: '42"',
      chestCm: '106 cm',
      bustInches: '42"',
      bustCm: '106 cm',
      waistInches: '38"',
      waistCm: '96 cm',
      hipInches: '44"',
      hipCm: '112 cm',
      lengthInches: '49"',
      lengthCm: '124 cm',
      flareInches: '130"',
      flareCm: '330 cm',
    },
    {
      size: '2XL',
      label: '2XL (44)',
      chestInches: '44"',
      chestCm: '111 cm',
      bustInches: '44"',
      bustCm: '111 cm',
      waistInches: '40"',
      waistCm: '101 cm',
      hipInches: '46"',
      hipCm: '117 cm',
      lengthInches: '50"',
      lengthCm: '127 cm',
      flareInches: '135"',
      flareCm: '343 cm',
    },
    {
      size: '3XL',
      label: '3XL (46)',
      chestInches: '46"',
      chestCm: '117 cm',
      bustInches: '46"',
      bustCm: '117 cm',
      waistInches: '42"',
      waistCm: '107 cm',
      hipInches: '48"',
      hipCm: '122 cm',
      lengthInches: '50"',
      lengthCm: '127 cm',
      flareInches: '140"',
      flareCm: '355 cm',
    },
    {
      size: '4XL',
      label: '4XL (48)',
      chestInches: '48"',
      chestCm: '122 cm',
      bustInches: '48"',
      bustCm: '122 cm',
      waistInches: '44"',
      waistCm: '112 cm',
      hipInches: '50"',
      hipCm: '127 cm',
      lengthInches: '51"',
      lengthCm: '130 cm',
      flareInches: '145"',
      flareCm: '368 cm',
    },
    {
      size: '5XL',
      label: '5XL (50)',
      chestInches: '50"',
      chestCm: '127 cm',
      bustInches: '50"',
      bustCm: '127 cm',
      waistInches: '46"',
      waistCm: '117 cm',
      hipInches: '52"',
      hipCm: '132 cm',
      lengthInches: '51"',
      lengthCm: '130 cm',
      flareInches: '150"',
      flareCm: '381 cm',
    },
  ],
  tips: [
    'For Straight Cut Kurtis, focus primarily on the Bust and Hip measurements.',
    'For Anarkalis & Flared Kurtas, the waist and bust fit are paramount; hips flare freely.',
    'All sets include an elasticated back waistband on pants/palazzos with drawstring adjustment.',
  ],
  measuringGuide: {
    points: [
      { name: '1. Bust', desc: 'Measure circumference at the widest point of the chest.' },
      { name: '2. Waist', desc: 'Measure around your natural waistline, approximately 1-2 inches above navel.' },
      { name: '3. Hip', desc: 'Measure around the fullest part of your hips with feet together.' },
      { name: '4. Length', desc: 'Total vertical height from highest shoulder seam to the lower hem.' },
    ],
  },
};

/** 5. Kids Ethnic Wear (0 – 16 Years) */
export const KIDS_WEAR_CHART: SizeChartData = {
  id: 'chart-kids-wear',
  category: 'kids',
  title: 'Kids Ethnic Wear Size Chart (0 – 16 Years)',
  subtitle: 'Pure cotton inner lining, soft non-scratchy borders, and expandable waistbands for sensitive skin.',
  unit: 'in',
  alterationNote: 'Includes expandable elastic backbands and 1.5-inch hemline folds for growing height.',
  columns: [
    { key: 'size', label: 'Size No.', minWidth: 80 },
    { key: 'age', label: 'Age Group', minWidth: 120 },
    { key: 'chest', label: 'Chest (in / cm)', minWidth: 110 },
    { key: 'length', label: 'Top Length', minWidth: 100 },
    { key: 'waist', label: 'Skirt / Pant', minWidth: 100 },
    { key: 'height', label: 'Child Height', minWidth: 110 },
  ],
  rows: [
    { size: '16', label: '16', age: '0 - 6 Months', chestInches: '16"', chestCm: '41 cm', lengthInches: '8"', lengthCm: '20 cm', waistInches: '16 - 18"', heightCm: '60 - 68 cm' },
    { size: '18', label: '18', age: '6 - 12 Months', chestInches: '18"', chestCm: '46 cm', lengthInches: '9"', lengthCm: '23 cm', waistInches: '18 - 20"', heightCm: '68 - 76 cm' },
    { size: '20', label: '20', age: '1 - 2 Years', chestInches: '20"', chestCm: '51 cm', lengthInches: '10"', lengthCm: '25 cm', waistInches: '20 - 22"', heightCm: '76 - 86 cm' },
    { size: '22', label: '22', age: '2 - 3 Years', chestInches: '22"', chestCm: '56 cm', lengthInches: '11"', lengthCm: '28 cm', waistInches: '21 - 23"', heightCm: '86 - 94 cm' },
    { size: '24', label: '24', age: '3 - 4 Years', chestInches: '24"', chestCm: '61 cm', lengthInches: '11.5"', lengthCm: '29 cm', waistInches: '22 - 24"', heightCm: '94 - 102 cm' },
    { size: '26', label: '26', age: '5 - 6 Years', chestInches: '26"', chestCm: '66 cm', lengthInches: '12.5"', lengthCm: '32 cm', waistInches: '24 - 26"', heightCm: '102 - 114 cm' },
    { size: '28', label: '28', age: '7 - 8 Years', chestInches: '28"', chestCm: '71 cm', lengthInches: '13.5"', lengthCm: '34 cm', waistInches: '25 - 27"', heightCm: '114 - 124 cm' },
    { size: '30', label: '30', age: '9 - 10 Years', chestInches: '30"', chestCm: '76 cm', lengthInches: '14.0"', lengthCm: '36 cm', waistInches: '26 - 28"', heightCm: '124 - 135 cm' },
    { size: '32', label: '32', age: '11 - 12 Years', chestInches: '32"', chestCm: '81 cm', lengthInches: '14.5"', lengthCm: '37 cm', waistInches: '27 - 29"', heightCm: '135 - 145 cm' },
    { size: '34', label: '34', age: '13 - 14 Years', chestInches: '34"', chestCm: '86 cm', lengthInches: '15.0"', lengthCm: '38 cm', waistInches: '28 - 30"', heightCm: '145 - 155 cm' },
    { size: '36', label: '36', age: '15 - 16 Years', chestInches: '36"', chestCm: '91 cm', lengthInches: '15.5"', lengthCm: '39 cm', waistInches: '29 - 31"', heightCm: '155 - 165 cm' },
  ],
  tips: [
    'If child is in-between sizes or taller than average for their age, order one size up.',
    'Pattu Pavadai skirts and Lehengas have elasticated back waistbands and drawstring cords for up to 3 inches of adjustment.',
    'Inner cotton asthar (lining) prevents itching and provides maximum playtime comfort.',
  ],
  measuringGuide: {
    points: [
      { name: '1. Child Height', desc: 'Measure barefoot from the top of the head straight down to the floor.' },
      { name: '2. Chest', desc: 'Measure around the child\'s chest under the armpits.' },
      { name: '3. Skirt Length', desc: 'Measure from the waistline down to the ankle bone.' },
    ],
  },
};

/** 6. Semi-Stitched Lehenga Choli (Customizable Waist & Height) */
export const LEHENGA_CHOLI_CHART: SizeChartData = {
  id: 'chart-lehenga-choli',
  category: 'lehenga',
  title: 'Semi-Stitched Lehenga Choli Specifications',
  subtitle: 'Festive & Bridal semi-stitched lehenga with pre-pleated kalis, inner cancan, and unstitched choli fabric.',
  unit: 'in',
  alterationNote: 'Customizable Waist (28" to 42") and Bust (up to 44") ready for bespoke boutique tailoring.',
  columns: [
    { key: 'component', label: 'Garment Section', minWidth: 140 },
    { key: 'specification', label: 'Measurements', minWidth: 150 },
    { key: 'craftsmanship', label: 'Lining & Construction', minWidth: 180 },
  ],
  rows: [
    {
      size: 'lehenga_skirt',
      label: 'Lehenga Skirt (Ghagra)',
      chestInches: 'Waist: 28" - 42" · Length: 42"',
      chestCm: 'Waist: 71 - 107 cm · Len: 107 cm',
      notes: 'Semi-stitched kalis with pre-stitched canvas belt. Ready for side-zip closure.',
    },
    {
      size: 'ghera_flare',
      label: 'Skirt Flare / Ghera',
      chestInches: '3.80 - 4.20 Metres Flare',
      chestCm: '380 - 420 cm circumference',
      notes: 'Double layer Micro-Cotton lining with heavy Cancan mesh for flared ballgown silhouette.',
    },
    {
      size: 'choli_blouse',
      label: 'Unstitched Blouse / Choli',
      chestInches: '1.00 Metre Fabric (Up to 44" Bust)',
      chestCm: '100 cm fabric',
      notes: 'Front, back, and sleeve embroidery motifs marked for tailored styling.',
    },
    {
      size: 'dupatta_scarf',
      label: 'Festive Dupatta',
      chestInches: '2.50 Metres Length · 40" Width',
      chestCm: '250 cm length · 101 cm width',
      notes: 'Four-side embroidered border lace with finished latkan corner tassels.',
    },
  ],
  tips: [
    'Lehenga waistband is open on one side to allow tailoring to your precise waist and hip contour.',
    'Double Cancan mesh creates a royal high-volume flare without weighing down the garment.',
    'Choli fabric provides generous margins for round neck, sweetheart, or deep back tailoring.',
  ],
  measuringGuide: {
    points: [
      { name: '1. Lehenga Waist', desc: 'Measure right where you prefer to tie your lehenga (usually 1-2 inches below navel).' },
      { name: '2. Lehenga Length', desc: 'Measure from the tying waistband straight down to the floor wearing your heels.' },
      { name: '3. Bust & Arm', desc: 'Standard choli measurement for boutique tailor.' },
    ],
  },
};

/** Helper to automatically resolve the right SizeChartData based on category and variant */
export function resolveSizeChartForProduct(category?: string, variant?: SizeCategoryType, noSizeVariant?: string): SizeChartData {
  const cat = (category || '').toLowerCase();
  if (cat.includes('kid') || variant === 'kids') {
    return KIDS_WEAR_CHART;
  }
  if (cat.includes('lehenga')) {
    return LEHENGA_CHOLI_CHART;
  }
  if (cat.includes('dress') || cat.includes('kurti') || cat.includes('anarkali') || cat.includes('suit') || variant === 'letter') {
    return KURTI_ANARKALI_CHART;
  }
  if (cat.includes('blouse') || variant === 'numeric') {
    if (noSizeVariant === 'free-size' || variant === 'free-size') {
      return FREE_SIZE_STITCHED_BLOUSE_CHART;
    }
    return WOMEN_BLOUSE_CHART;
  }
  // Default for Saree & Unstitched
  if (noSizeVariant === 'free-size') {
    return FREE_SIZE_STITCHED_BLOUSE_CHART;
  }
  return SAREE_DRAPE_CHART;
}

