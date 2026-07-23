// Backend order.status -> plain language for the provider-facing UI.
// Verbatim from UX_REDESIGN_BRIEF.md's "Human-Friendly Status Language" table
// (shared with auterio3/statusMap.js — same backend statuses, same copy).
//
// The brief also calls for a description, primary/secondary CTA, and allowed-next-state
// per status ("Each UI status must define..."). Those aren't in the brief's table itself
// (only the empty/error examples are) and aren't invented here — title mapping only, for
// now. Not yet imported anywhere; screens still branch on raw order.status /
// job.shopStatus directly (see SHOP_STATUS_FROM_ORDER_STATUS / MOBILE_STAGE_FROM_STATUS
// in App.js, which are a different, workflow-stage mapping — this is the display-copy one).

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
  in_progress: 'Work in progress',
  completed: 'Service completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

export function statusTitle(status) {
  return STATUS_TITLE[status] || status;
}
