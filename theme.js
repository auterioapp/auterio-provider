// Design tokens for the provider app. Canonical values, resolved from a
// literal audit of hex/spacing/radius/fontSize usage across screens/ +
// components/ (both apps: 4806 hardcoded hex occurrences, 3073 spacing, 908
// radius, 1431 fontSize) plus direct product decisions where the audit alone
// didn't settle it (spacing scale, semantic color names, touch target).
// Same values as auterio3/theme.js on purpose — one brand palette, same key names.
//
// Not yet imported anywhere — screens still use inline values. Migration is tracked
// separately per screen; this file is the target, not yet the source of truth in the app.

export const colors = {
  // semantic, not random — one token per role, not per screen
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

  // Added after the auterio3/TrackingScreen.js pilot found both were real,
  // recurring roles (not one-off mistakes) that colors.border/warning don't
  // cover without a visible color change.
  borderStrong: '#E1E4E8', // second, slightly darker border/divider gray — distinct role from `border`, not a typo of it
  attention: '#EAB308',    // "needs your input" (e.g. estimate ready) — visibly different from `warning`, don't conflate
};

// Solid hex + 2-digit alpha suffix (React Native accepts #RRGGBBAA), e.g.
// withAlpha(colors.primary, '20') === '#F0441620'. Covers the many
// rgba(...)-tinted backgrounds/borders in the audit instead of naming a
// fixed set of opacity steps that won't match every screen's needs.
export function withAlpha(hex, alphaHex) {
  return `${hex}${alphaHex}`;
}

// Semantic text presets — kept from the previous version of this file (already
// audited against real screen usage, not invented). Prefer `typography` below
// for new components; these remain for the nav-header/card-title/meta roles
// they were already tuned for.
export const type = {
  screenTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: colors.text },
  body:        { fontSize: 14, fontWeight: '600', color: colors.text },
  label:       { fontSize: 12, fontWeight: '700', color: colors.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 },
  meta:        { fontSize: 12, fontWeight: '600', color: colors.mutedText },
};

// Chosen scale: 4, 8, 12, 16, 24, 32. Real usage audit shows 20pt spacing at
// 133 occurrences — heavier than several values already in this scale — and
// is NOT included here. Flagged, not resolved: either fold those call sites
// into 16/24 during migration, or extend the scale with a `xxl: 20` step.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Deliberately 8/12/14, not 8/12/16 — this file already shipped that
// decision (previous version of this same file) based on real usage (14pt:
// 167 occurrences vs 16pt: 27 across both apps). Re-confirmed 2026-07-23.
// `full` is new: covers the borderRadius:999 pill/avatar pattern.
export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  full: 9999,
};

export const touchTarget = { min: 44 };

// Proposed from the real fontSize audit (28 distinct values in use, no scale
// — 11-16px form an unbroken staircase with no clear steps), not from any
// external doc. Prefer `type` above for the five named roles it covers;
// this is the fallback/base scale for everything else, and what
// `typography` below is built from.
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
};

// Named text roles built on the fontSize scale above. Prefer these over raw
// fontSize in new components — `title`/`heading`/`body`/`caption`/`label`
// name the job, not the pixel value.
export const typography = {
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  heading: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  body: { fontSize: fontSize.base, fontWeight: '500', color: colors.text },
  caption: { fontSize: fontSize.sm, fontWeight: '500', color: colors.mutedText },
  label: { fontSize: fontSize.xs, fontWeight: '700', color: colors.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 },
};

// Status-name -> color, for StatusBadge and anywhere else that renders a
// backend/workflow state. Aliases into `colors` rather than new hex values —
// `error` here is `colors.danger`, `pending` is `colors.neutral` — so there's
// one hex per role, looked up under whichever name fits the call site.
export const status = {
  pending: colors.neutral,
  info: colors.info,
  success: colors.success,
  warning: colors.warning,
  error: colors.danger,
  neutral: colors.neutral,
};
