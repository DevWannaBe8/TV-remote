export const theme = {
  colors: {
    background: '#0B0D10',
    surface: '#15181D',
    surfaceAlt: '#1D2127',
    border: '#2A2F37',
    text: '#E8EAED',
    textMuted: '#8A919C',
    accent: '#3D7EFF',
    accentPressed: '#2C63D9',
    danger: '#E5484D',
    success: '#2FB86E',
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
  },
  spacing: (n: number) => n * 4,
  font: {
    family: undefined as string | undefined,
    sizeXs: 12,
    sizeSm: 14,
    sizeMd: 16,
    sizeLg: 20,
    sizeXl: 26,
  },
};
