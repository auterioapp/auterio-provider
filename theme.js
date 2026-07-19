// Design tokens for the provider app. This file does not change any existing
// screen on its own — it's a shared source of truth for new/updated styles.
// Values were chosen as the most-used existing value for each semantic role
// (audited across screens/*.js and App.js), not invented from scratch, so
// migrating a screen to these tokens should not change how it looks.

export const colors = {
  // Brand / calls to action
  accent: '#F04416',

  // Semantic status
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',

  // Text
  ink: '#17191D',       // primary text
  muted: '#5E646D',     // secondary text — meta, subtitles, hints
  mutedLight: '#9CA3AF', // placeholder text, disabled labels

  // Surfaces
  surface: '#F3F4F5',   // card background
  surfaceRaised: '#FFFFFF',
  border: '#ECEEF0',
};

export const type = {
  screenTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },     // nav header title
  cardTitle:   { fontSize: 14, fontWeight: '700', color: colors.ink },     // row/card title (most-used pattern in the app)
  body:        { fontSize: 14, fontWeight: '600', color: colors.ink },    // primary value/content text
  label:       { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }, // small section labels
  meta:        { fontSize: 12, fontWeight: '600', color: colors.muted },  // secondary/meta text
};

export const radius = {
  sm: 8,   // inline cards, rows
  lg: 14,  // modal sheets, larger panels
};
