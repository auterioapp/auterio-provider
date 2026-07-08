export function formatMoney(order) {
  const rawValue = order.pricing?.total ?? order.payment?.totalHeld ?? order.price ?? order.total ?? order.estimate ?? order.service?.price;
  if (typeof rawValue === 'number') return `$${Math.round(rawValue)}`;
  if (typeof rawValue === 'string' && rawValue.trim()) return rawValue.startsWith('$') ? rawValue : `$${rawValue}`;
  return '$89';
}

export const SERVICE_TYPES = [
  { title: 'Towing',              icon: 'car-sport-outline',          color: '#374151', matches: ['tow', 'towing', 'transport', 'flatbed'] },
  { title: 'Jump Start',          icon: 'battery-charging-outline',   color: '#F97316', matches: ['jump', 'jump start', 'battery jump', 'boost', 'start car', 'dead battery'] },
  { title: 'Battery Replacement', icon: 'battery-full-outline',       color: '#F97316', matches: ['battery replacement', 'replace battery', 'new battery'] },
  { title: 'Tire Change',         icon: 'disc-outline',               color: '#2563EB', matches: ['tire', 'tyre', 'flat', 'wheel'] },
  { title: 'Diagnostics',         icon: 'speedometer-outline',        color: '#7C3AED', matches: ['diagnostic', 'diagnostics', 'check engine', 'scan'] },
  { title: 'Mobile Mechanic',     icon: 'construct-outline',          color: '#2563EB', matches: ['mechanic', 'repair', 'mobile service', 'fix', 'engine'] },
  { title: 'Lockout',             icon: 'lock-open-outline',          color: '#16A34A', matches: ['lockout', 'locked', 'keys'] },
  { title: 'Fuel Delivery',       icon: 'water-outline',              color: '#F97316', matches: ['fuel', 'gas', 'petrol'] },
];

export const SERVICE_FLOW_SCHEMAS = {
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

function getRawServiceTitle(order) {
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

function getServiceTypeText(order) {
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

export function getServiceMeta(order) {
  const serviceText = getServiceTypeText(order);
  const matched = SERVICE_TYPES.find(type => type.matches.some(match => serviceText.includes(match)));
  if (matched) return { title: matched.title, icon: matched.icon, color: matched.color };

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

export function isTowingService(order) {
  const serviceText = getServiceTypeText(order);
  return serviceText.includes('tow');
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

function getDemoRequestDetails(order) {
  return DEMO_REQUEST_DETAILS_BY_ID[String(order.id || order.number || '')] || {};
}

// Extracts "City, State" from a full address string like "123 Main St, Los Angeles, CA, US"
export function getCityState(address) {
  if (!address) return address;
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    // city is 3rd from end, state/region is 2nd from end (last part is country)
    return `${parts[parts.length - 3]}, ${parts[parts.length - 2]}`;
  }
  return address;
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
  return order.distance || order.orderContext?.distance || demo.distance || null;
}

// 'mobile' = provider goes to customer | 'shop' = customer brings car
export function getServiceMode(order) {
  return (
    order.tracking?.mode ||
    order.trackingMode ||
    order.serviceMode ||
    order.service?.serviceMode ||
    order.orderContext?.serviceMode ||
    'mobile'
  );
}

export function getVehicleVin(job) {
  return job.vehicle?.vin || job.vin || DEMO_VIN_BY_JOB_ID[job.id] || 'VIN pending';
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

export function getAcceptedAtLabel(job) {
  const rawValue = job.acceptedAt || job.createdAt || job.date;
  if (!rawValue) return 'Accepted today, 10:24 AM';
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return `Accepted ${rawValue}`;
  return `Accepted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
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

export function getBackendStatusFromWorkflowStage(stage) {
  if (stage === 'route') return 'en_route';
  if (stage === 'arrived' || stage === 'diagnosis' || stage === 'estimate') return 'arrived';
  if (stage === 'approval') return 'estimate_sent';
  if (stage === 'working' || stage === 'complete_review') return 'in_progress';
  if (stage === 'completed') return 'completed';
  return null;
}
