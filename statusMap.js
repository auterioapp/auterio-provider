// Backend order.status -> plain language for the provider-facing UI.
// Verbatim from UX_REDESIGN_BRIEF.md's "Human-Friendly Status Language" table
// (shared with auterio3/statusMap.js — same backend statuses, same copy).
//
// The brief also calls for a description, primary/secondary CTA, and allowed-next-state
// per status ("Each UI status must define..."). Those aren't in the brief's table itself
// (only the empty/error examples are) and aren't invented here — title mapping only, for
// now. Used in screens/JobsScreen.js (shop-status badge fallback) and
// screens/CalendarScreen.js (appointment cancelled/declined label) so far
// (2026-07) — both were real raw-status leaks, not a blanket screen-by-screen
// migration. Most status displays are a different concept (short badges,
// progress-steppers — see SHOP_STATUS_FROM_ORDER_STATUS / MOBILE_STAGE_FROM_STATUS
// in App.js, or utils/jobUtils.js's getJobStatusMeta) and intentionally don't use
// this file; it's for sentence-length status copy specifically, not a universal swap-in.

export const STATUS_TITLE = {
  pending: 'Finding a provider',
  scheduled_pending: 'Waiting for provider confirmation',
  counter_offered: 'Provider suggested a new time',
  confirmed: 'Booking confirmed',
  accepted: 'Provider accepted',
  en_route: 'Provider on the way',
  arrived: 'Provider arrived',
  inspection: 'Inspection in progress',
  estimate_sent: 'Estimate ready',
  estimate_approved: 'Estimate approved',
  estimate_declined: 'Estimate declined',
  in_progress: 'Work in progress',
  completed: 'Service completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

export const STATUS_FLOW = {
  pending: ['accepted', 'cancelled'],
  scheduled: ['confirmed', 'cancelled'],
  scheduled_pending: ['confirmed', 'counter_offered', 'declined', 'cancelled'],
  counter_offered: ['confirmed', 'scheduled_pending', 'declined', 'cancelled'],
  confirmed: ['en_route', 'cancelled'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['inspection', 'cancelled'],
  inspection: ['estimate_sent', 'in_progress', 'cancelled'],
  estimate_sent: ['estimate_approved', 'estimate_declined', 'cancelled'],
  estimate_declined: ['estimate_sent', 'cancelled'],
  estimate_approved: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  declined: [],
};

export const STATUS_META = {
  pending: {
    tone: 'waiting',
    customerSummary: 'We are looking for a provider nearby.',
    providerSummary: 'Open request waiting for a verified provider.',
  },
  scheduled_pending: {
    tone: 'waiting',
    customerSummary: 'Your booking is waiting for provider confirmation.',
    providerSummary: 'Confirm, counter, or decline this scheduled request.',
  },
  counter_offered: {
    tone: 'attention',
    customerSummary: 'The provider suggested another time.',
    providerSummary: 'Waiting for the customer to respond.',
  },
  confirmed: {
    tone: 'positive',
    customerSummary: 'Your booking is confirmed.',
    providerSummary: 'This job is confirmed and ready to start.',
  },
  accepted: {
    tone: 'positive',
    customerSummary: 'A provider accepted your request.',
    providerSummary: 'You accepted this request.',
  },
  en_route: {
    tone: 'active',
    customerSummary: 'Your provider is on the way.',
    providerSummary: 'You are heading to the customer.',
  },
  arrived: {
    tone: 'active',
    customerSummary: 'Your provider has arrived.',
    providerSummary: 'You have arrived at the job location.',
  },
  inspection: {
    tone: 'active',
    customerSummary: 'The inspection is in progress.',
    providerSummary: 'Inspect the vehicle and send an estimate if needed.',
  },
  estimate_sent: {
    tone: 'attention',
    customerSummary: 'Review the estimate to continue.',
    providerSummary: 'Waiting for customer approval.',
  },
  estimate_approved: {
    tone: 'positive',
    customerSummary: 'The estimate is approved.',
    providerSummary: 'The customer approved the estimate.',
  },
  estimate_declined: {
    tone: 'attention',
    customerSummary: 'The estimate was declined.',
    providerSummary: 'Revise the estimate or wait for cancellation.',
  },
  in_progress: {
    tone: 'active',
    customerSummary: 'Work is underway.',
    providerSummary: 'Complete the job when the work is finished.',
  },
  completed: {
    tone: 'positive',
    customerSummary: 'The service is complete.',
    providerSummary: 'This job is complete.',
  },
  cancelled: {
    tone: 'neutral',
    customerSummary: 'This order was cancelled.',
    providerSummary: 'This order was cancelled.',
  },
  declined: {
    tone: 'neutral',
    customerSummary: 'This booking was declined.',
    providerSummary: 'This booking was declined.',
  },
};

export function statusTitle(status) {
  return STATUS_TITLE[status] || status;
}

export function statusSummary(status, audience = 'provider') {
  const meta = STATUS_META[status];
  if (!meta) return '';
  return audience === 'provider' ? meta.providerSummary : meta.customerSummary;
}

export function nextStatuses(status) {
  return STATUS_FLOW[status] || [];
}
