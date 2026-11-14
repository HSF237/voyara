/**
 * Scene colours for the globe, derived from the brand tokens (deep tropical
 * green, sand gold) but tuned for a lit sphere, where the flat UI values look
 * either muddy or harsh.
 */
export type GlobePalette = {
  ocean: string;
  oceanShade: string;
  rim: string;
  land: string;
  glow: string;
  glowStrength: number;
  arc: string;
  pin: string;
};

export const GLOBE_PALETTES: Record<'light' | 'dark', GlobePalette> = {
  light: {
    ocean: '#1f6f5c',
    oceanShade: '#134a3d',
    rim: '#8fd0bd',
    land: '#f4efe2',
    glow: '#1f6f5c',
    glowStrength: 0.42,
    arc: '#f0b454',
    pin: '#f0b454',
  },
  dark: {
    ocean: '#143029',
    oceanShade: '#0b1a16',
    rim: '#3d8f7b',
    land: '#5fc4aa',
    glow: '#4fb39a',
    glowStrength: 0.34,
    arc: '#f0b95a',
    pin: '#f0b95a',
  },
};
