export const Colors = {
  primary: '#087F5B',
  primaryDark: '#066A4C',
  primaryLight: '#E6F5EF',
  primarySoft: '#F1FAF6',
  onPrimary: '#FFFFFF',
  success: '#12A36F',
  successDark: '#0E8A5E',
  successLight: '#E8F8F1',
  danger: '#E5484D',
  dangerLight: '#FDEBEC',
  warning: '#F59E0B',
  warningLight: '#FFF5DD',
  info: '#3B82F6',
  infoLight: '#EAF2FF',
  background: '#F6F6F4',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F3F1',
  card: '#FFFFFF',
  border: '#E5E7E4',
  borderStrong: '#D6DAD6',
  text: '#151716',
  textSecondary: '#6B716D',
  textMuted: '#9AA09C',
  white: '#FFFFFF',
  overlay: 'rgba(12,16,14,0.55)',
  scanner: '#101312',
} as const;

export type ColorName = keyof typeof Colors;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const FontSizes = {
  micro: 11,
  xs: 12,
  sm: 14,
  body: 15,
  md: 16,
  section: 17,
  lg: 18,
  xl: 22,
  title: 24,
  xxl: 28,
  display: 32,
} as const;

export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const LineHeights = {
  sm: 18,
  tight: 20,
  normal: 22,
  md: 24,
  relaxed: 24,
  lg: 28,
  xl: 32,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#0F1A15',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F1A15',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  float: {
    shadowColor: '#0F1A15',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primary: {
    shadowColor: '#087F5B',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const Sizes = {
  buttonHeight: 52,
  buttonHeightLg: 56,
  iconButton: 42,
  tapTarget: 44,
  avatarSm: 38,
  avatarMd: 46,
  avatarLg: 64,
  avatarXl: 92,
  progressHeight: 6,
} as const;

