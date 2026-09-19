import { SizeOption, SizeChartData } from './types';

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
];

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
export const WOMEN_BLOUSE_CHART: SizeChartData = {
  title: 'Stitched Blouse Size Chart',
  subtitle: 'All blouses feature a 2-inch interior seam allowance for easy letting out or taking in.',
  unit: 'in',
  columns: [
    { key: 'size', label: 'Size (Bust)' },
    { key: 'chest', label: 'Bust (in / cm)' },
    { key: 'waist', label: 'Underbust (in / cm)' },
    { key: 'shoulder', label: 'Shoulder (in)' },
    { key: 'length', label: 'Front Length (in)' },
  ],
  rows: [
    { size: '32', label: '32 (XS)', chestInches: '32"', chestCm: '81 cm', waistInches: '26-28"', waistCm: '66-71 cm', shoulderInches: '13.5"', lengthInches: '13.5"' },
    { size: '34', label: '34 (S)', chestInches: '34"', chestCm: '86 cm', waistInches: '28-30"', waistCm: '71-76 cm', shoulderInches: '14.0"', lengthInches: '14.0"' },
    { size: '36', label: '36 (M)', chestInches: '36"', chestCm: '91 cm', waistInches: '30-32"', waistCm: '76-81 cm', shoulderInches: '14.5"', lengthInches: '14.5"' },
    { size: '38', label: '38 (L)', chestInches: '38"', chestCm: '96 cm', waistInches: '32-34"', waistCm: '81-86 cm', shoulderInches: '15.0"', lengthInches: '15.0"' },
    { size: '40', label: '40 (XL)', chestInches: '40"', chestCm: '101 cm', waistInches: '34-36"', waistCm: '86-91 cm', shoulderInches: '15.5"', lengthInches: '15.5"' },
    { size: '42', label: '42 (2XL)', chestInches: '42"', chestCm: '106 cm', waistInches: '36-38"', waistCm: '91-96 cm', shoulderInches: '16.0"', lengthInches: '16.0"' },
    { size: '44', label: '44 (3XL)', chestInches: '44"', chestCm: '111 cm', waistInches: '38-40"', waistCm: '96-101 cm', shoulderInches: '16.5"', lengthInches: '16.5"' },
  ],
  tips: [
    'Measure around the fullest part of your bust while wearing the brassiere you intend to pair.',
    'Blouses come with padded cups that can be easily removed by tailor if preferred.',
    '2 inches of additional fabric margin is stitched into both sides for alteration flexibility.',
  ],
};

export const KIDS_WEAR_CHART: SizeChartData = {
  title: 'Kids Ethnic Wear Size Chart (0 - 16 Years)',
  subtitle: 'Tailored for comfort with breathable inner cotton lining and adjustable waist drawstrings.',
  unit: 'in',
  columns: [
    { key: 'size', label: 'Size No.' },
    { key: 'age', label: 'Recommended Age' },
    { key: 'chest', label: 'Chest (in / cm)' },
    { key: 'length', label: 'Choli Length (in)' },
    { key: 'waist', label: 'Lehenga Waist (in)' },
  ],
  rows: [
    { size: '16', label: '16', age: '0 - 6 Months', chestInches: '16"', chestCm: '41 cm', lengthInches: '8"', waistInches: '16-18"' },
    { size: '18', label: '18', age: '6 - 12 Months', chestInches: '18"', chestCm: '46 cm', lengthInches: '9"', waistInches: '18-20"' },
    { size: '20', label: '20', age: '1 - 2 Years', chestInches: '20"', chestCm: '51 cm', lengthInches: '10"', waistInches: '20-22"' },
    { size: '22', label: '22', age: '2 - 3 Years', chestInches: '22"', chestCm: '56 cm', lengthInches: '11"', waistInches: '21-23"' },
    { size: '24', label: '24', age: '3 - 4 Years', chestInches: '24"', chestCm: '61 cm', lengthInches: '11.5"', waistInches: '22-24"' },
    { size: '26', label: '26', age: '5 - 6 Years', chestInches: '26"', chestCm: '66 cm', lengthInches: '12.5"', waistInches: '24-26"' },
    { size: '28', label: '28', age: '7 - 8 Years', chestInches: '28"', chestCm: '71 cm', lengthInches: '13.5"', waistInches: '25-27"' },
    { size: '30', label: '30', age: '9 - 10 Years', chestInches: '30"', chestCm: '76 cm', lengthInches: '14.0"', waistInches: '26-28"' },
    { size: '32', label: '32', age: '11 - 12 Years', chestInches: '32"', chestCm: '81 cm', lengthInches: '14.5"', waistInches: '27-29"' },
    { size: '34', label: '34', age: '13 - 14 Years', chestInches: '34"', chestCm: '86 cm', lengthInches: '15.0"', waistInches: '28-30"' },
    { size: '36', label: '36', age: '15 - 16 Years', chestInches: '36"', chestCm: '91 cm', lengthInches: '15.5"', waistInches: '29-31"' },
  ],
  tips: [
    'If child is in-between sizes or taller than average, we recommend ordering one size up.',
    'Lehengas have elasticated back waistbands and drawstring cords for up to 3 inches adjustment.',
  ],
};

export const SAREE_DRAPE_CHART: SizeChartData = {
  title: 'Saree & Drape Measurements',
  subtitle: 'Authentic Indian Handloom Silk specifications with certified Silk Mark standard dimensions.',
  unit: 'in',
  columns: [
    { key: 'component', label: 'Component' },
    { key: 'length', label: 'Length' },
    { key: 'width', label: 'Width / Height' },
    { key: 'notes', label: 'Details' },
  ],
  rows: [
    { size: 'saree', label: 'Saree Drape', chestInches: '5.5 Meters (6 Yards)', lengthInches: '46 - 48 Inches (1.2m)', notes: 'Full body with tested Zari pallu and borders' },
    { size: 'blouse', label: 'Blouse Fabric', chestInches: '0.80 Meters (80 cm)', lengthInches: '44 Inches width', notes: 'Unstitched running fabric matching border work' },
  ],
  tips: [
    'Sarees are standard one-size draping garments that comfortably fit any height up to 6 feet.',
    'Blouse piece is attached at the inner edge of the saree and can be trimmed for custom tailoring.',
  ],
};
