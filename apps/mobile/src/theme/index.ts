// PaperApe Design System — matches web globals.css
export const colors = {
  // Backgrounds
  bg0: '#d4c8a8',
  bg1: '#e8dfc8',
  bg2: '#c9bb96',
  bg3: '#b8a97e',
  bgGlass: 'rgba(212,200,168,0.85)',

  // Text
  t0: '#1a1207',
  t1: '#3d3222',
  t2: '#6b5d45',
  t3: '#9a8b6e',

  // Borders
  border0: 'rgba(90,70,40,0.12)',
  border1: 'rgba(90,70,40,0.2)',
  border2: 'rgba(90,70,40,0.35)',

  // Accent
  accent: '#2c5f8a',
  accentLight: '#3a7ab5',
  accentDark: '#1e4060',

  // Semantic
  green: '#2d6b3f',
  greenDim: '#1f5530',
  greenBg: 'rgba(45,107,63,0.08)',
  red: '#8b2020',
  redDim: '#6d1818',
  redBg: 'rgba(139,32,32,0.08)',
  gold: '#8b6914',
  goldBg: 'rgba(139,105,20,0.08)',
  cyan: '#2a7065',

  // UI
  white: '#ffffff',
  black: '#000000',
  card: '#ede5cd',
  cardHover: '#e5dbc0',
  tabActive: '#2d6b3f',
  tabInactive: '#9a8b6e',
};

export const typography = {
  heading: {
    fontFamily: 'SpecialElite',
    fontWeight: '400' as const,
  },
  body: {
    fontFamily: 'CourierPrime',
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontFamily: 'CourierPrime-Bold',
    fontWeight: '700' as const,
  },
  mono: {
    fontFamily: 'CourierPrime',
    fontWeight: '400' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 3,
  md: 4,
  lg: 5,
  xl: 6,
  full: 999,
};

export const shadows = {
  paper: {
    shadowColor: 'rgba(60,40,10,1)',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: 'rgba(60,40,10,1)',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
};
