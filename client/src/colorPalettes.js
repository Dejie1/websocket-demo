// Color Palettes for the Drawing App

// Original basic palette
export const basicColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#FF8A80', '#81C784', 
  '#64B5F6', '#FFB74D', '#F06292', '#A1887F'
];

// Gecko Green palette - from lightest to darkest
export const geckoGreenPalette = [
  '#E8FCC9',  // Gecko Green (100) 
  '#CDF995',  // Gecko Green (200)
  '#A6EF5F',  // Gecko Green (300)
  '#80E038',  // Gecko Green (400)
  '#4BCC00',  // Gecko Green (500) - Default
  '#35AF00',  // Gecko Green (600)
  '#239200',  // Gecko Green (700)
  '#157600',  // Gecko Green (800)
  '#096100'   // Gecko Green (900)
];

// Extended color palette combining basic + gecko greens
export const extendedPalette = [
  ...basicColors,
  ...geckoGreenPalette
];

// Color palette with names for display (optional)
export const namedColors = {
  // Basic Colors
  '#FF6B6B': 'Coral Red',
  '#4ECDC4': 'Turquoise',
  '#45B7D1': 'Sky Blue',
  '#96CEB4': 'Mint Green',
  '#FFEAA7': 'Cream Yellow',
  '#DDA0DD': 'Plum',
  '#FF8A80': 'Light Coral',
  '#81C784': 'Light Green',
  '#64B5F6': 'Light Blue',
  '#FFB74D': 'Orange',
  '#F06292': 'Pink',
  '#A1887F': 'Brown',
  
  // Gecko Green Variants
  '#E8FCC9': 'Gecko Green (100)',
  '#CDF995': 'Gecko Green (200)',
  '#A6EF5F': 'Gecko Green (300)',
  '#80E038': 'Gecko Green (400)',
  '#4BCC00': 'Gecko Green (500)',
  '#35AF00': 'Gecko Green (600)',
  '#239200': 'Gecko Green (700)',
  '#157600': 'Gecko Green (800)',
  '#096100': 'Gecko Green (900)'
};

// Default export - can be switched between different palettes
export default extendedPalette;