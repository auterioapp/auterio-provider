// Design tokens for the provider app. Canonical values, resolved from:
// - UX_REDESIGN_BRIEF.md (spacing, radius, touch target, semantic color names)
// - a literal audit of hex/spacing/radius/fontSize usage across screens/ + components/
//   (both apps: 4806 hardcoded hex occurrences, 3073 spacing, 908 radius, 1431 fontSize)
// Same values as auterio3/theme.js on purpose — one brand palette, same key names.
//
// Not yet imported anywhere — screens still use inline values. Migration is tracked
// separately per screen; this file is the target, not yet the source of truth in the app.

export const colors = {
  // semantic — names match UX_REDESIGN_BRIEF.md's "Recommended tokens" list
  primary: '#F04416',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
  neutral: '#9CA3AF',
  text: '#17191D',
  mutedText: '#5E646D',
  surface: '#F3F4F5',
  surfaceRaised: '#FFFFFF',
  border: '#ECEEF0',
};

// Semantic text presets — kept from the previous version of this file (already
// audited against real screen usage, not invented). Prefer these over raw
// fontSize where the role matches; fall back to fontSize below for anything
// that isn't a nav header / card title / body / label / meta.
export const type = {
  screenTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: colors.text },
  body:        { fontSize: 14, fontWeight: '600', color: colors.text },
  label:       { fontSize: 12, fontWeight: '700', color: colors.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 },
  meta:        { fontSize: 12, fontWeight: '600', color: colors.mutedText },
};

// UX_REDESIGN_BRIEF.md's recommended scale (4, 8, 12, 16, 24, 32). Real usage
// audit shows 20pt spacing at 133 occurrences — heavier than several values
// already in this scale — and is NOT included here. Flagged, not resolved:
// either fold those call sites into 16/24 during migration, or extend the
// scale with a `xxl: 20` step.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Deliberately 8/12/14, not UX_REDESIGN_BRIEF.md's 8/12/16 — this file
// already shipped that decision (previous version of this same file) based
// on real usage (14pt: 167 occurrences vs 16pt: 27 across both apps).
// `full` is new: covers the borderRadius:999 pill/avatar pattern.
export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  full: 9999,
};

export const touchTarget = { min: 44 };

// Not specified in UX_REDESIGN_BRIEF.md. Proposed from the real fontSize
// audit (28 distinct values in use, no scale — 11-16px form an unbroken
// staircase with no clear steps). Prefer `type` above for the five named
// roles it covers; this is the fallback for everything else. Confirm before
// treating as final — unlike spacing/radius, there's no brief value here.
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
};
