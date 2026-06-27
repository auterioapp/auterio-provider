import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useScrollToTop(scrollSignal) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (!scrollSignal) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    });
  }, [scrollSignal]);
  return scrollRef;
}

// ─── Network ─────────────────────────────────────────────────────────────────

export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    if (contentType.includes('application/json') && text) {
      const payload = JSON.parse(text);
      message = payload.error || payload.message || message;
    } else if (text) {
      message = `${message} ${text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`;
    }
    throw new Error(message);
  }
  if (!text) return null;
  if (!contentType.includes('application/json')) throw new Error(`Expected JSON, received ${contentType || 'unknown content type'}`);
  return JSON.parse(text);
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

export function pulseTabChange() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// ─── Job status helpers ───────────────────────────────────────────────────────

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

export function getBackendStatusFromWorkflowStage(stage) {
  if (stage === 'route') return 'en_route';
  if (stage === 'arrived' || stage === 'diagnosis' || stage === 'estimate') return 'arrived';
  if (stage === 'approval') return 'estimate_sent';
  if (stage === 'working' || stage === 'complete_review') return 'in_progress';
  if (stage === 'completed') return 'completed';
  return null;
}

// ─── Service type lookup ──────────────────────────────────────────────────────

const SERVICE_TYPES = [
  { title: 'Towing', icon: 'car-sport-outline', matches: ['tow', 'towing', 'transport', 'flatbed', 'эваку'] },
  { title: 'Jump Start', icon: 'battery-charging-outline', matches: ['jump', 'jump start', 'battery jump', 'boost', 'start car', 'dead battery'] },
  { title: 'Battery Replacement', icon: 'battery-full-outline', matches: ['battery replacement', 'replace battery', 'new battery'] },
  { title: 'Tire Change', icon: 'disc-outline', matches: ['tire', 'tyre', 'flat', 'wheel', 'колес', 'шина'] },
  { title: 'Diagnostics', icon: 'speedometer-outline', matches: ['diagnostic', 'diagnostics', 'check engine', 'scan'] },
  { title: 'Mobile Mechanic', icon: 'construct-outline', matches: ['mechanic', 'repair', 'mobile service', 'fix', 'engine'] },
  { title: 'Lockout', icon: 'lock-open-outline', matches: ['lockout', 'locked', 'keys'] },
  { title: 'Fuel Delivery', icon: 'water-outline', matches: ['fuel', 'gas', 'petrol'] },
];

const SERVICE_FLOW_SCHEMAS = {
  towing: {
    title: 'Towing',
    icon: 'car-sport-outline',
    requiredPhotos: [
      { key: 'front', label: 'Front of vehicle', hint: 'License plate must be readable' },
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable' },
      { key: 'odometer', label: 'Odometer', hint: 'Mileage reading must be visible' },
      { key: 'tow_access', label: 'Tow access', hint: 'Show access path and vehicle position for towing' },
    ],
    intakeQuestions: [
      { key: 'vehicle_undrivable', label: 'Is the vehicle completely undrivable?' },
      { key: 'road_type', label: 'Are you on a highway?' },
      { key: 'injury', label: 'Is anyone injured?' },
      { key: 'keys_available', label: 'Are the keys available?' },
    ],
    diagnosis: {
      title: 'Towing Readiness',
      metric: { key: 'towAccess', label: 'Tow Access Clearance', icon: 'resize-outline', unit: '' },
      checks: [
        { key: 'vehicleRolls', icon: 'car-sport-outline', label: 'Vehicle Rolls', options: [{ label: 'Rolls', value: 'rolls' }, { label: 'Does Not Roll', value: 'locked' }] },
        { key: 'steering', icon: 'git-branch-outline', label: 'Steering Condition', options: [{ label: 'Steers', value: 'steers' }, { label: 'Locked', value: 'locked' }] },
        { key: 'towMethod', icon: 'trail-sign-outline', label: 'Tow Method', options: [{ label: 'Wheel Lift', value: 'wheel_lift' }, { label: 'Flatbed', value: 'flatbed' }] },
      ],
      fallbackRecommendations: ['Tow Service'],
    },
  },
  jump_start: {
    title: 'Jump Start',
    icon: 'battery-charging-outline',
    requiredPhotos: [
      { key: 'front', label: 'Front of vehicle', hint: 'License plate must be readable' },
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable' },
      { key: 'odometer', label: 'Odometer', hint: 'Mileage reading must be visible' },
      { key: 'battery_area', label: 'Battery area', hint: 'Show battery terminals or jump points if accessible' },
    ],
    intakeQuestions: [
      { key: 'interior_lights', label: 'Are the interior lights working?' },
      { key: 'engine_clicks', label: 'Does the engine click when starting?' },
      { key: 'battery_age', label: 'Is the battery older than 3 years?' },
    ],
    diagnosis: {
      title: 'Battery & Electrical System',
      metric: { key: 'batteryVoltage', label: 'Battery Voltage', icon: 'battery-half-outline', unit: 'V', keyboardType: 'decimal-pad' },
      checks: [
        { key: 'jumpStart', icon: 'flash-outline', label: 'Jump Start Result', options: [{ label: 'Vehicle Started', value: 'started' }, { label: 'Vehicle Did Not Start', value: 'not_started' }] },
        { key: 'alternator', icon: 'battery-charging-outline', label: 'Charging System (Alternator)', options: [{ label: 'Alternator OK', value: 'ok' }, { label: 'Alternator Failed', value: 'failed' }] },
        { key: 'loadTest', icon: 'shield-checkmark-outline', label: 'Battery Load Test', options: [{ label: 'Good', value: 'good' }, { label: 'Weak', value: 'weak' }, { label: 'Bad', value: 'bad' }] },
      ],
      fallbackRecommendations: ['Electrical System Check'],
    },
  },
  battery_replacement: {
    title: 'Battery Replacement',
    icon: 'battery-full-outline',
    requiredPhotos: [
      { key: 'front', label: 'Front of vehicle', hint: 'License plate must be readable' },
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable' },
      { key: 'odometer', label: 'Odometer', hint: 'Mileage reading must be visible' },
      { key: 'battery_area', label: 'Battery area', hint: 'Show current battery label and terminals' },
    ],
    intakeQuestions: [
      { key: 'interior_lights', label: 'Are the interior lights working?' },
      { key: 'engine_clicks', label: 'Does the engine click when starting?' },
      { key: 'battery_age', label: 'Is the battery older than 3 years?' },
    ],
    diagnosis: {
      title: 'Battery Replacement Check',
      metric: { key: 'batteryVoltage', label: 'Battery Voltage', icon: 'battery-half-outline', unit: 'V', keyboardType: 'decimal-pad' },
      checks: [
        { key: 'batteryFitment', icon: 'barcode-outline', label: 'Battery Fitment', options: [{ label: 'Matched', value: 'matched' }, { label: 'Mismatch', value: 'mismatch' }] },
        { key: 'terminalCondition', icon: 'hardware-chip-outline', label: 'Terminal Condition', options: [{ label: 'Clean', value: 'clean' }, { label: 'Corroded', value: 'corroded' }] },
        { key: 'systemTest', icon: 'checkmark-circle-outline', label: 'Post-install Test', options: [{ label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }] },
      ],
      fallbackRecommendations: ['Battery Replacement'],
    },
  },
  lockout: {
    title: 'Lockout',
    icon: 'lock-open-outline',
    requiredPhotos: [
      { key: 'front', label: 'Front of vehicle', hint: 'License plate must be readable' },
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable if accessible' },
      { key: 'door_area', label: 'Door area', hint: 'Show the affected door/lock area' },
    ],
    intakeQuestions: [
      { key: 'keys_inside', label: 'Are keys inside the vehicle?' },
      { key: 'engine_running', label: 'Is the engine running?' },
      { key: 'child_or_pet_inside', label: 'Is there a child or pet inside?' },
    ],
    diagnosis: {
      title: 'Lockout Verification',
      checks: [
        { key: 'ownershipVerified', icon: 'shield-checkmark-outline', label: 'Ownership / Permission', options: [{ label: 'Verified', value: 'verified' }, { label: 'Not Verified', value: 'not_verified' }] },
        { key: 'entryMethod', icon: 'lock-open-outline', label: 'Entry Method', options: [{ label: 'Standard Entry', value: 'standard' }, { label: 'Key Service', value: 'key_service' }] },
        { key: 'damageCheck', icon: 'car-outline', label: 'Damage Check', options: [{ label: 'No Damage', value: 'no_damage' }, { label: 'Damage Present', value: 'damage' }] },
      ],
      fallbackRecommendations: ['Lockout Service'],
    },
  },
  tire_change: {
    title: 'Tire Change',
    icon: 'disc-outline',
    requiredPhotos: [
      { key: 'front', label: 'Front of vehicle', hint: 'License plate must be readable' },
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable' },
      { key: 'odometer', label: 'Odometer', hint: 'Mileage reading must be visible' },
      { key: 'problem', label: 'Problem tire', hint: 'Show the flat/damaged tire and wheel position' },
    ],
    intakeQuestions: [
      { key: 'vehicle_moves', label: 'Can the vehicle still move?' },
      { key: 'spare_tire', label: 'Do you have a spare tire?' },
    ],
    diagnosis: {
      title: 'Tire & Wheel System',
      metric: { key: 'tirePressure', label: 'Tire Pressure', icon: 'speedometer-outline', unit: 'PSI', keyboardType: 'decimal-pad' },
      checks: [
        { key: 'tireDamage', icon: 'disc-outline', label: 'Tire Damage', options: [{ label: 'Repairable', value: 'repairable' }, { label: 'Not Repairable', value: 'not_repairable' }] },
        { key: 'spareTire', icon: 'ellipse-outline', label: 'Spare Tire', options: [{ label: 'Available', value: 'available' }, { label: 'Not Available', value: 'not_available' }] },
        { key: 'wheelCondition', icon: 'radio-button-on-outline', label: 'Wheel / Rim Condition', options: [{ label: 'OK', value: 'ok' }, { label: 'Damaged', value: 'damaged' }] },
      ],
      fallbackRecommendations: ['Tire Change Labor'],
    },
  },
  mobile_mechanic: {
    title: 'Mobile Mechanic',
    icon: 'construct-outline',
    requiredPhotos: [
      { key: 'front', label: 'Front of vehicle', hint: 'License plate must be readable' },
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable' },
      { key: 'odometer', label: 'Odometer', hint: 'Mileage reading must be visible' },
      { key: 'problem', label: 'Problem area', hint: 'Capture warning lights, leak, smoke, or affected part' },
    ],
    intakeQuestions: [
      { key: 'drivable', label: 'Is the vehicle drivable?' },
      { key: 'safe_location', label: 'Are you in a safe location?' },
      { key: 'immediate_help', label: 'Do you need immediate help?' },
    ],
    diagnosis: {
      title: 'General Mechanical Diagnosis',
      checks: [
        { key: 'visualInspection', icon: 'eye-outline', label: 'Visual Inspection', options: [{ label: 'Normal', value: 'normal' }, { label: 'Issue Found', value: 'issue_found' }] },
        { key: 'scanResult', icon: 'speedometer-outline', label: 'Scan / Warning Lights', options: [{ label: 'No Codes', value: 'no_codes' }, { label: 'Codes Present', value: 'codes_present' }] },
        { key: 'safeToDrive', icon: 'shield-checkmark-outline', label: 'Safe To Drive', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      ],
      fallbackRecommendations: ['General Diagnostics'],
    },
  },
};

const DEMO_SERVICE_BY_ID = {
  9025: { title: 'Towing', icon: 'car-sport-outline' },
  4427: { title: 'Jump Start', icon: 'battery-charging-outline' },
  9462: { title: 'Tire Change', icon: 'disc-outline' },
};

const DEMO_REQUEST_DETAILS_BY_ID = {
  9025: { vehicle: 'Toyota Highlander - 2018', location: '123 Main St, San Francisco, CA', distance: '5.2 mi away' },
  4427: { vehicle: 'Honda Civic - 2020', location: '456 Oak Ave, San Francisco, CA', distance: '6.8 mi away' },
  9462: { vehicle: 'Nissan Altima - 2019', location: '789 Pine St, San Francisco, CA', distance: '3.1 mi away' },
};

const DEMO_VIN_BY_JOB_ID = {
  'job-12345': '5TDJZRFH8JS12345',
  'job-12346': '2HGFC2F59LH12346',
  'job-12347': '5UXKR0C54H012347',
};

// ─── Service meta ─────────────────────────────────────────────────────────────

export function getRawServiceTitle(order) {
  if (typeof order.service === 'string' && order.service.trim()) return order.service.trim();
  return (
    order.issueName ||
    order.serviceType ||
    order.serviceName ||
    order.requestedService ||
    order.recommendedService ||
    order.issue?.name ||
    order.issue?.title ||
    order.service?.type ||
    order.service?.issueName ||
    order.service?.recommendedService ||
    order.service?.name ||
    order.problem ||
    order.issue ||
    order.selectedProblem ||
    order.title ||
    ''
  );
}

export function getServiceTypeText(order) {
  const rawService = [
    getRawServiceTitle(order),
    order.category,
    order.service?.category,
    order.service?.description,
    order.issue?.category,
    order.orderContext?.issue,
    order.orderContext?.problem,
    order.orderContext?.service,
    order.orderContext?.serviceType,
    order.orderContext?.recommendedService,
  ].filter(Boolean).join(' ');
  return String(rawService).trim().toLowerCase();
}

export function getServiceMeta(order) {
  const serviceText = getServiceTypeText(order);
  const matched = SERVICE_TYPES.find(type => type.matches.some(match => serviceText.includes(match)));
  if (matched) return { title: matched.title, icon: matched.icon };

  const explicitTitle = getRawServiceTitle(order);
  if (explicitTitle && explicitTitle.toLowerCase() !== 'service request') {
    return { title: explicitTitle, icon: order.icon || order.service?.icon || 'construct-outline' };
  }

  const demoService = DEMO_SERVICE_BY_ID[String(order.id || order.number || '')];
  if (demoService) return demoService;

  return {
    title: 'Service Request',
    icon: order.icon || order.service?.icon || 'receipt-outline',
  };
}

export function getServiceTitle(order) {
  return getServiceMeta(order).title;
}

export function getOrderServiceType(order) {
  const explicitType = order.serviceType || order.service?.serviceType || order.service?.typeKey || order.orderContext?.serviceType;
  if (explicitType && SERVICE_FLOW_SCHEMAS[explicitType]) return explicitType;
  const serviceText = getServiceTypeText(order);
  if (serviceText.includes('tow')) return 'towing';
  if (serviceText.includes('jump') || serviceText.includes('dead battery') || serviceText.includes('boost')) return 'jump_start';
  if (serviceText.includes('lock') || serviceText.includes('key')) return 'lockout';
  if (serviceText.includes('tire') || serviceText.includes('tyre') || serviceText.includes('flat') || serviceText.includes('wheel')) return 'tire_change';
  if (serviceText.includes('battery replacement') || serviceText.includes('replace battery')) return 'battery_replacement';
  return 'mobile_mechanic';
}

export function getServiceFlowSchema(order) {
  return SERVICE_FLOW_SCHEMAS[getOrderServiceType(order)] || SERVICE_FLOW_SCHEMAS.mobile_mechanic || {
    title: 'Mobile Mechanic',
    icon: 'construct-outline',
    requiredPhotos: [
      { key: 'front', label: 'Front of vehicle', hint: 'License plate must be readable' },
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable' },
      { key: 'odometer', label: 'Odometer', hint: 'Mileage reading must be visible' },
      { key: 'problem', label: 'Problem area', hint: 'Capture the visible issue or affected area' },
    ],
    intakeQuestions: [],
  };
}

export function getDiagnosisSchema(order) {
  const schema = getServiceFlowSchema(order);
  return schema.diagnosis || SERVICE_FLOW_SCHEMAS.mobile_mechanic.diagnosis || {
    title: `${schema.title || 'Service'} Diagnosis`,
    checks: [
      { key: 'visualInspection', icon: 'eye-outline', label: 'Visual Inspection', options: [{ label: 'Normal', value: 'normal' }, { label: 'Issue Found', value: 'issue_found' }] },
      { key: 'safeToProceed', icon: 'shield-checkmark-outline', label: 'Safe To Proceed', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
    ],
    fallbackRecommendations: ['General Diagnostics'],
  };
}

export function isTowingService(order) {
  const serviceText = getServiceTypeText(order);
  return serviceText.includes('tow') || serviceText.includes('эваку') || serviceText.includes('буксир');
}

// ─── Order / vehicle data ─────────────────────────────────────────────────────

export function getDemoRequestDetails(order) {
  return DEMO_REQUEST_DETAILS_BY_ID[String(order.id || order.number || '')] || {};
}

export function getRequestLocation(order) {
  const demo = getDemoRequestDetails(order);
  return (
    order.pickup?.address ||
    order.location?.address ||
    order.address ||
    order.selectedAddress ||
    order.orderContext?.location ||
    order.orderContext?.address ||
    demo.location ||
    'Location pending'
  );
}

export function getRequestDistance(order) {
  const demo = getDemoRequestDetails(order);
  return order.distance || order.orderContext?.distance || demo.distance || 'Distance pending';
}

export function getDropoffAddress(order) {
  return (
    (typeof order.dropoff === 'string' ? order.dropoff : '') ||
    order.dropoff?.address ||
    (typeof order.dropOff === 'string' ? order.dropOff : '') ||
    order.dropOff?.address ||
    (typeof order.destination === 'string' ? order.destination : '') ||
    order.destination?.address ||
    order.towDestination?.address ||
    order.service?.dropoffAddress ||
    order.service?.destinationAddress ||
    order.dropoffAddress ||
    order.destinationAddress ||
    'Drop-off location pending'
  );
}

export function getVehicleLabel(order) {
  const demo = getDemoRequestDetails(order);
  const make = order.vehicle?.make;
  const model = order.vehicle?.model;
  const year = order.vehicle?.year;
  const label = [make, model].filter(Boolean).join(' ');
  if (label && year) return `${label} - ${year}`;
  if (label) return label;
  if (year) return `Vehicle - ${year}`;
  if (demo.vehicle) return demo.vehicle;
  return 'Vehicle details pending';
}

export function getVehicleVin(job) {
  return job.vehicle?.vin || job.vin || DEMO_VIN_BY_JOB_ID[job.id] || 'VIN pending';
}

export function formatMoney(order) {
  const rawValue = order.pricing?.total ?? order.payment?.totalHeld ?? order.price ?? order.total ?? order.estimate ?? order.service?.price;
  if (typeof rawValue === 'number') return `$${Math.round(rawValue)}`;
  if (typeof rawValue === 'string' && rawValue.trim()) return rawValue.startsWith('$') ? rawValue : `$${rawValue}`;
  return '$89';
}

export function getAcceptedAtLabel(job) {
  const rawValue = job.acceptedAt || job.createdAt || job.date;
  if (!rawValue) return 'Accepted today, 10:24 AM';
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return `Accepted ${rawValue}`;
  return `Accepted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

// ─── Provider intake / complaints ─────────────────────────────────────────────

export function getProviderIntakeItems(order) {
  const schema = getServiceFlowSchema(order);
  const serviceType = getOrderServiceType(order);
  const diagnosticInfo = order.service?.diagnosticInfo || order.diagnosticInfo || {};
  const explicitQuestions = order.service?.intakeQuestions || diagnosticInfo.intakeQuestions || order.orderContext?.intakeQuestions;
  const explicitServiceType = diagnosticInfo.serviceType || order.orderContext?.diagnosticServiceType;
  const answers = order.service?.intakeAnswers || diagnosticInfo.intakeAnswers || diagnosticInfo.answers || order.orderContext?.intakeAnswers || {};

  if (Array.isArray(explicitQuestions) && explicitQuestions.length && (!explicitServiceType || explicitServiceType === serviceType)) {
    return explicitQuestions.map((item, index) => ({
      key: item.key || item.id || `intake-${index}`,
      label: item.label || item.question || item.title || `Question ${index + 1}`,
      value: item.answer ?? answers[item.key] ?? answers[item.id] ?? '',
    })).filter(item => item.label);
  }

  return schema.intakeQuestions.map((item, index) => ({
    ...item,
    key: item.key || `intake-${index}`,
    value: answers[item.key] ?? answers[index + 1] ?? answers[String(index + 1)] ?? '',
  }));
}

export function normalizeComplaintItem(item, index) {
  if (!item) return null;
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? { key: `complaint-${index}`, label: trimmed, value: '' } : null;
  }
  const label = (
    item.label ||
    item.title ||
    item.name ||
    item.question ||
    item.symptom ||
    item.problem ||
    item.issue ||
    item.text ||
    `Complaint ${index + 1}`
  );
  const value = item.value || item.answer || item.description || item.detail || item.note || '';
  return { key: item.id || item.key || `complaint-${index}`, label: String(label), value: String(value || '') };
}

export function getCustomerComplaintItems(job, fallbackNote) {
  const intakeItems = getProviderIntakeItems(job)
    .filter(item => item.value !== undefined && item.value !== null && String(item.value).trim())
    .map((item, index) => normalizeComplaintItem({ key: item.key || `intake-${index}`, label: item.label, value: item.value }, index))
    .filter(Boolean);
  if (intakeItems.length) return intakeItems;

  const context = job.orderContext || {};
  const rawItems =
    context.customerComplaint ||
    context.customerComplaints ||
    context.complaintItems ||
    context.symptoms ||
    context.selectedSymptoms ||
    context.answers ||
    context.issueDetails ||
    job.customerComplaint ||
    job.customerComplaints ||
    job.symptoms ||
    job.issueDetails;

  if (Array.isArray(rawItems)) {
    return rawItems.map(normalizeComplaintItem).filter(Boolean);
  }

  if (rawItems && typeof rawItems === 'object') {
    return Object.entries(rawItems)
      .map(([key, value], index) => normalizeComplaintItem({ key, label: key, value }, index))
      .filter(Boolean);
  }

  const fallbackItem = normalizeComplaintItem(fallbackNote, 0);
  return fallbackItem ? [fallbackItem] : [];
}

// ─── Order normalization ──────────────────────────────────────────────────────

export function normalizeOrderToJob(order) {
  const serviceMeta = getServiceMeta(order);
  const requestId = order.id || order._id || `local-${Date.now()}`;
  const number = order.number || String(requestId).replace(/\D/g, '').slice(-5) || '12345';
  const vehicleLabel = getVehicleLabel(order);
  const [fallbackMake, fallbackYear] = vehicleLabel.split(' - ');
  const customerName = order.customer?.name || order.contactInfo?.name || 'Customer';
  const initials = customerName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'CU';
  const total = Number(order.payment?.total || order.payment?.totalHeld || order.payment?.priceMax || order.price || order.total || 89);

  return {
    ...order,
    id: requestId,
    number,
    status: order.status && order.status !== 'pending' ? order.status : 'accepted',
    eta: order.tracking?.eta || order.eta || '20-30 min',
    accent: order.accent || '#F04416',
    icon: order.icon || serviceMeta.icon,
    customer: {
      name: customerName,
      initials,
      phone: order.customer?.phone || order.contactInfo?.phone || '',
      email: order.customer?.email || order.contactInfo?.email || '',
    },
    service: {
      ...(order.service || {}),
      type: order.service?.type || serviceMeta.title,
      icon: order.service?.icon || serviceMeta.icon,
    },
    vehicle: {
      make: order.vehicle?.make || fallbackMake || 'Vehicle',
      model: order.vehicle?.model || '',
      year: order.vehicle?.year || fallbackYear || '',
      color: order.vehicle?.color || 'Color pending',
      vin: order.vehicle?.vin,
    },
    pickup: {
      ...(order.pickup || {}),
      address: order.pickup?.address || getRequestLocation(order),
    },
    payment: {
      ...(order.payment || {}),
      total,
    },
    customerNote: order.customerNote || order.orderContext?.customerNote || 'No note provided',
    createdAt: order.acceptedAt || order.createdAt || order.date || new Date().toISOString(),
  };
}

// ─── Estimate helpers ─────────────────────────────────────────────────────────

export function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function getEstimateCatalog(type) {
  const labor = [
    { type: 'labor', label: 'Battery Replacement', hours: '1.0 hr', amount: 120, category: 'Electrical' },
    { type: 'labor', label: 'Alternator Replacement', hours: '1.2 hr', amount: 144, category: 'Electrical' },
    { type: 'labor', label: 'Starter Replacement', hours: '1.4 hr', amount: 168, category: 'Electrical' },
    { type: 'labor', label: 'Electrical Diagnosis', hours: '0.8 hr', amount: 96, category: 'Diagnostics' },
    { type: 'labor', label: 'Tire Change Labor', hours: '0.6 hr', amount: 72, category: 'Roadside' },
    { type: 'labor', label: 'Brake Inspection', hours: '0.7 hr', amount: 84, category: 'Inspection' },
  ];
  const parts = [
    { type: 'parts', label: 'Battery Group 35', amount: 169, category: 'Battery' },
    { type: 'parts', label: 'Alternator', amount: 189, category: 'Charging System' },
    { type: 'parts', label: 'Starter Motor', amount: 215, category: 'Starting System' },
    { type: 'parts', label: 'Battery Terminal Kit', amount: 24, category: 'Electrical' },
    { type: 'parts', label: 'Serpentine Belt', amount: 39, category: 'Engine' },
    { type: 'parts', label: 'Shop Supplies', amount: 12, category: 'Supplies' },
  ];
  return type === 'parts' ? parts : labor;
}

export function getEstimatePriceCheck(type, name, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return { warning: false };
  const normalizedName = String(name || '').toLowerCase();
  const ranges = [
    { type: 'labor', match: ['battery'], min: 90, max: 150 },
    { type: 'labor', match: ['alternator'], min: 120, max: 190 },
    { type: 'labor', match: ['starter'], min: 135, max: 210 },
    { type: 'labor', match: ['diagnosis', 'diagnostic'], min: 70, max: 130 },
    { type: 'labor', match: ['tire'], min: 55, max: 95 },
    { type: 'parts', match: ['battery'], min: 120, max: 210 },
    { type: 'parts', match: ['alternator'], min: 150, max: 260 },
    { type: 'parts', match: ['starter'], min: 160, max: 280 },
    { type: 'parts', match: ['terminal'], min: 15, max: 45 },
    { type: 'parts', match: ['belt'], min: 25, max: 70 },
  ];
  const fallback = type === 'parts' ? { min: 10, max: 250 } : { min: 60, max: 180 };
  const matched = ranges.find(range => range.type === type && range.match.some(match => normalizedName.includes(match))) || fallback;
  return { ...matched, warning: amount > matched.max };
}

export function getRecommendedServicesFromDiagnosis(answers, batteryVoltage, order) {
  const serviceType = getOrderServiceType(order);
  if (serviceType === 'tire_change') {
    const recommendations = [];
    if (answers.tireDamage === 'not_repairable') recommendations.push('Tire Replacement');
    if (answers.spareTire === 'not_available') recommendations.push('Tow to Tire Shop');
    if (answers.wheelCondition === 'damaged') recommendations.push('Wheel Inspection');
    return recommendations.length ? recommendations : ['Tire Change Labor'];
  }
  if (serviceType === 'towing') {
    const recommendations = [];
    if (answers.towMethod === 'flatbed') recommendations.push('Flatbed Towing');
    if (answers.vehicleRolls === 'locked' || answers.steering === 'locked') recommendations.push('Special Recovery Setup');
    return recommendations.length ? recommendations : ['Tow Service'];
  }
  if (serviceType === 'lockout') {
    if (answers.ownershipVerified === 'not_verified') return ['Customer Verification Required'];
    return ['Lockout Service'];
  }
  if (serviceType === 'mobile_mechanic') {
    const recommendations = [];
    if (answers.scanResult === 'codes_present') recommendations.push('Advanced Diagnostics');
    if (answers.safeToDrive === 'no') recommendations.push('Safety Inspection');
    return recommendations.length ? recommendations : ['General Diagnostics'];
  }

  const recommendations = [];
  const voltage = Number.parseFloat(String(batteryVoltage || '').replace(',', '.'));
  if (answers.loadTest === 'weak' || answers.loadTest === 'bad' || (Number.isFinite(voltage) && voltage < 12.2)) {
    recommendations.push('Battery Replacement');
  }
  if (answers.alternator === 'failed') {
    recommendations.push('Alternator Replacement');
  }
  if (answers.jumpStart === 'not_started') {
    recommendations.push('Advanced Electrical Diagnosis');
  }
  return recommendations.length ? recommendations : ['Electrical System Check'];
}

export function getDemoEstimate(answers, batteryVoltage, extraItems = [], removedItems = [], order) {
  const serviceType = getOrderServiceType(order);
  let labor = [];
  let parts = [];

  if (serviceType === 'tire_change') {
    labor = [{ id: 'base-labor-tire-change', source: 'base', scope: 'required', label: 'Tire Change Labor', hours: '0.6 hr', amount: 72 }];
    parts = [{ id: 'base-part-shop-supplies', source: 'base', scope: 'required', label: 'Shop Supplies', amount: 12 }];
    if (answers.tireDamage === 'not_repairable') {
      parts.splice(0, 0, { id: 'ai-part-replacement-tire', source: 'ai', scope: 'required', label: 'Replacement Tire', amount: 149 });
    }
  } else if (serviceType === 'towing') {
    labor = [{ id: 'base-labor-tow-service', source: 'base', scope: 'required', label: answers.towMethod === 'flatbed' ? 'Flatbed Towing' : 'Tow Service', hours: '1.0 hr', amount: answers.towMethod === 'flatbed' ? 145 : 120 }];
    parts = [{ id: 'base-part-tow-supplies', source: 'base', scope: 'required', label: 'Tow Supplies', amount: 15 }];
  } else if (serviceType === 'lockout') {
    labor = [{ id: 'base-labor-lockout-service', source: 'base', scope: 'required', label: 'Lockout Service', hours: '0.7 hr', amount: 89 }];
    parts = [];
  } else if (serviceType === 'mobile_mechanic') {
    labor = [{ id: 'base-labor-diagnostics', source: 'base', scope: 'required', label: 'Mobile Diagnostics', hours: '0.8 hr', amount: 96 }];
    parts = [{ id: 'base-part-shop-supplies', source: 'base', scope: 'required', label: 'Shop Supplies', amount: 12 }];
  } else {
    labor = [{ id: 'base-labor-battery-replacement', source: 'base', scope: 'required', label: 'Battery Replacement', hours: '1.0 hr', amount: 120 }];
    parts = [
      { id: 'base-part-battery-group-35', source: 'base', scope: 'required', label: 'Battery Group 35', amount: 169 },
      { id: 'base-part-shop-supplies', source: 'base', scope: 'required', label: 'Shop Supplies', amount: 12 },
    ];
  }

  const optionalLabor = [];
  const optionalParts = [];

  if (serviceType === 'tire_change' && answers.wheelCondition === 'damaged') {
    optionalLabor.push({ id: 'ai-labor-wheel-inspection', source: 'ai', scope: 'optional', label: 'Wheel Inspection', hours: '0.4 hr', amount: 48 });
  }
  if ((serviceType === 'jump_start' || serviceType === 'battery_replacement') && answers.alternator === 'failed') {
    labor.push({ id: 'ai-labor-alternator-replacement', source: 'ai', scope: 'required', label: 'Alternator Replacement', hours: '1.2 hr', amount: 144 });
    parts.splice(1, 0, { id: 'ai-part-alternator', source: 'ai', scope: 'required', label: 'Alternator', amount: 189 });
  }
  if ((serviceType === 'jump_start' || serviceType === 'battery_replacement') && answers.jumpStart === 'not_started') {
    labor.push({ id: 'ai-labor-electrical-diagnosis', source: 'ai', scope: 'required', label: 'Electrical Diagnosis', hours: '0.8 hr', amount: 96 });
  }
  const voltage = Number.parseFloat(String(batteryVoltage || '').replace(',', '.'));
  if ((serviceType === 'jump_start' || serviceType === 'battery_replacement') && Number.isFinite(voltage) && voltage >= 12.2 && answers.loadTest === 'good') {
    parts.splice(0, 1);
  }

  extraItems.forEach(item => {
    const targetLabor = item.scope === 'optional' ? optionalLabor : labor;
    const targetParts = item.scope === 'optional' ? optionalParts : parts;
    if (item.type === 'parts') {
      targetParts.push({ id: item.id, source: 'custom', scope: item.scope || 'required', label: item.label, amount: item.amount, priceWarning: item.priceWarning });
    } else {
      targetLabor.push({ id: item.id, source: 'custom', scope: item.scope || 'required', label: item.label, hours: item.hours || '1.0 hr', amount: item.amount, priceWarning: item.priceWarning });
    }
  });

  const visibleLabor = labor.filter(item => !removedItems.includes(item.id));
  const visibleParts = parts.filter(item => !removedItems.includes(item.id));
  const visibleOptionalLabor = optionalLabor.filter(item => !removedItems.includes(item.id));
  const visibleOptionalParts = optionalParts.filter(item => !removedItems.includes(item.id));
  const fees = [{ label: 'Diagnostic Fee', amount: 49 }];
  const laborSubtotal = sumAmounts(visibleLabor);
  const partsSubtotal = sumAmounts(visibleParts);
  const optionalLaborSubtotal = sumAmounts(visibleOptionalLabor);
  const optionalPartsSubtotal = sumAmounts(visibleOptionalParts);
  const feesSubtotal = sumAmounts(fees);
  const subtotal = laborSubtotal + partsSubtotal + feesSubtotal;
  const optionalSubtotal = optionalLaborSubtotal + optionalPartsSubtotal;
  const tax = Math.round(subtotal * 0.0675 * 100) / 100;
  const optionalTax = Math.round(optionalSubtotal * 0.0675 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const totalIfApproved = Math.round((total + optionalSubtotal + optionalTax) * 100) / 100;
  return {
    labor: visibleLabor,
    parts: visibleParts,
    optionalLabor: visibleOptionalLabor,
    optionalParts: visibleOptionalParts,
    fees,
    laborSubtotal,
    partsSubtotal,
    optionalLaborSubtotal,
    optionalPartsSubtotal,
    subtotal,
    optionalSubtotal,
    tax,
    optionalTax,
    total,
    totalIfApproved,
  };
}
