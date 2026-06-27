export function getJobProgressIndex(status) {
  if (status === 'accepted') return 0;
  if (status === 'on_the_way') return 1;
  if (status === 'arrived') return 2;
  if (status === 'inspection' || status === 'estimate' || status === 'waiting_approval') return 3;
  if (status === 'completed') return 4;
  return 0;
}

export function getJobStatusMeta(status) {
  if (status === 'arrived') return { label: 'ARRIVED', actionLabel: 'Start Inspection', actionIcon: 'construct-outline', color: '#22C55E' };
  if (status === 'inspection') return { label: 'WORKING', actionLabel: 'Continue Diagnosis', actionIcon: 'construct-outline', color: '#F04416' };
  if (status === 'estimate') return { label: 'BUILD ESTIMATE', actionLabel: 'Send Estimate', actionIcon: 'document-text-outline', color: '#F04416' };
  if (status === 'waiting_approval') return { label: 'WAITING APPROVAL', actionLabel: 'Message Customer', actionIcon: 'chatbubble-outline', color: '#1F6BFF' };
  if (status === 'completed') return { label: 'COMPLETED', actionLabel: 'Receipt', actionIcon: 'receipt-outline', color: '#22C55E' };
  return { label: 'ON THE WAY', actionLabel: 'Navigate', actionIcon: 'navigate-outline', color: '#F04416' };
}

export function getWorkflowJobStatus(baseStatus, workflow) {
  if (!workflow?.stage || workflow.stage === 'details') return baseStatus;
  if (workflow.stage === 'route') return 'on_the_way';
  if (workflow.stage === 'arrived') return 'arrived';
  if (workflow.stage === 'diagnosis') return 'inspection';
  if (workflow.stage === 'estimate') return 'estimate';
  if (workflow.stage === 'approval') return 'waiting_approval';
  if (workflow.stage === 'working') return 'inspection';
  if (workflow.stage === 'complete_review') return 'inspection';
  if (workflow.stage === 'completed') return 'completed';
  return baseStatus;
}

export function getJobStatusNote(status, job) {
  if (status === 'waiting_approval') return 'Waiting 12 min';
  if (status === 'arrived') return 'Ready for checklist';
  if (status === 'inspection') return 'Diagnosis in progress';
  if (status === 'estimate') return 'Preparing estimate';
  if (status === 'completed') return 'Receipt ready';
  return job.eta ? `${job.eta} away` : '15 min away';
}
