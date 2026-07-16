export function getJobProgressIndex(status) {
  if (status === 'accepted') return 0;
  if (status === 'on_the_way') return 1;
  if (status === 'arrived') return 2;
  if (status === 'inspection' || status === 'estimate' || status === 'waiting_approval') return 3;
  if (status === 'completed') return 4;
  return 0;
}

// Mobile job card (closed/unopened) — 6 stages: Confirmed, On the way, Arrived,
// Inspection, In Progress, Completed. Diagnosis/estimate/waiting-for-approval all
// collapse into "Inspection" here; the detail lives inside the opened job screen.
export function getJobStatusMeta(status) {
  if (status === 'accepted') return { label: 'CONFIRMED', actionLabel: 'Navigate', actionIcon: 'navigate-outline', color: '#2563EB' };
  if (status === 'en_route' || status === 'on_the_way') return { label: 'ON THE WAY', actionLabel: 'Navigate', actionIcon: 'navigate-outline', color: '#F04416' };
  if (status === 'arrived') return { label: 'ARRIVED', actionLabel: 'Start Inspection', actionIcon: 'construct-outline', color: '#22C55E' };
  if (status === 'inspection' || status === 'estimate' || status === 'estimate_sent' || status === 'waiting_approval') {
    return { label: 'INSPECTION', actionLabel: 'Continue Diagnosis', actionIcon: 'construct-outline', color: '#F04416' };
  }
  if (status === 'in_progress' || status === 'estimate_approved') return { label: 'IN PROGRESS', actionLabel: 'Mark Ready', actionIcon: 'construct-outline', color: '#2563EB' };
  if (status === 'completed') return { label: 'COMPLETED', actionLabel: 'Receipt', actionIcon: 'receipt-outline', color: '#22C55E' };
  // Shop-only fallback statuses (the card normally reads job.shopStatus via SHOP_STATUS_BADGE instead).
  if (status === 'checked_in') return { label: 'CHECKED IN', actionLabel: 'Start Inspection', actionIcon: 'search-outline', color: '#2563EB' };
  if (status === 'awaiting_approval') return { label: 'AWAITING APPROVAL', actionLabel: 'Message Customer', actionIcon: 'chatbubble-outline', color: '#D97706' };
  if (status === 'ready_for_pickup') return { label: 'READY FOR PICKUP', actionLabel: 'Mark Complete', actionIcon: 'checkmark-circle-outline', color: '#16A34A' };
  return { label: 'ON THE WAY', actionLabel: 'Navigate', actionIcon: 'navigate-outline', color: '#F04416' };
}

export function getWorkflowJobStatus(baseStatus, workflow) {
  if (!workflow?.stage || workflow.stage === 'details') return baseStatus;
  if (workflow.stage === 'route') return 'on_the_way';
  if (workflow.stage === 'arrived') return 'arrived';
  if (workflow.stage === 'diagnosis') return 'inspection';
  if (workflow.stage === 'estimate') return 'estimate';
  if (workflow.stage === 'approval') return 'waiting_approval';
  if (workflow.stage === 'working') return 'in_progress';
  if (workflow.stage === 'complete_review') return 'in_progress';
  if (workflow.stage === 'completed') return 'completed';
  return baseStatus;
}

export function getJobStatusNote(status, job) {
  if (status === 'waiting_approval') {
    if (job.estimateSentAt) {
      const mins = Math.floor((Date.now() - new Date(job.estimateSentAt).getTime()) / 60000);
      if (mins < 1) return 'Waiting approval';
      if (mins < 60) return `Waiting ${mins} min`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `Waiting ${h}h ${m}m` : `Waiting ${h}h`;
    }
    return 'Waiting approval';
  }
  if (status === 'arrived') return 'Ready for checklist';
  if (status === 'inspection') return 'Diagnosis in progress';
  if (status === 'estimate') return 'Preparing estimate';
  if (status === 'completed') return 'Receipt ready';
  return job.eta ? `${job.eta} away` : '15 min away';
}
