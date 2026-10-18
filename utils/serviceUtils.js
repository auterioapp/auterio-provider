export function formatMoney(order) {
  const rawValue = order.pricing?.total ?? order.payment?.totalHeld ?? order.price ?? order.total ?? order.estimate ?? order.service?.price;
  if (typeof rawValue === 'number') return `$${rawValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (typeof rawValue === 'string' && rawValue.trim()) return rawValue.startsWith('$') ? rawValue : `$${rawValue}`;
  return '$89.00';
}

export const SERVICE_TYPES = [
  { title: 'Towing',              icon: 'car-sport-outline',          color: '#374151', matches: ['tow', 'towing', 'transport', 'flatbed'] },
  { title: 'Jump Start',          icon: 'battery-charging-outline',   color: '#F97316', matches: ['jump', 'jump start', 'battery jump', 'boost', 'start car', 'dead battery'] },
  { title: 'Battery Replacement', icon: 'battery-full-outline',       color: '#F97316', matches: ['battery replacement', 'replace battery', 'new battery'] },
  { title: 'Tire Change',         icon: 'disc-outline',               color: '#2563EB', matches: ['tire', 'tyre', 'flat', 'wheel'] },
  { title: 'Air Brake Service',   icon: 'warning-outline',            color: '#DC2626', matches: ['air brake'] },
  { title: 'Brake Service',       icon: 'alert-circle-outline',       color: '#DC2626', matches: ['brake'] },
  { title: 'DEF Service',         icon: 'flask-outline',              color: '#4CAF50', matches: ['def warning', 'def fluid'] },
  { title: 'Derate Service',      icon: 'trending-down-outline',      color: '#DC2626', matches: ['derate'] },
  { title: 'Trailer Service',     icon: 'cube-outline',               color: '#9333EA', matches: ['trailer'] },
  { title: 'Reefer Service',      icon: 'thermometer-outline',        color: '#2563EB', matches: ['reefer'] },
  { title: 'Cargo Door Service',  icon: 'square-outline',             color: '#9333EA', matches: ['cargo door'] },
  { title: 'Motorcycle Chain Service', icon: 'bicycle-outline',       color: '#9333EA', matches: ['chain issue', 'chain problem'] },
  { title: 'AC Repair',           icon: 'snow-outline',               color: '#2563EB', matches: ['ac not working', 'air conditioning', 'air conditioner'] },
  { title: 'Transmission Service', icon: 'settings-outline',          color: '#9333EA', matches: ['transmission'] },
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
      { key: 'rear', label: 'Rear of vehicle', hint: 'Show any existing damage' },
      { key: 'left_side', label: 'Driver side', hint: 'Show any existing damage' },
      { key: 'right_side', label: 'Passenger side', hint: 'Show any existing damage' },
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
      checks: [
        { key: 'drivetrain', icon: 'cog-outline', label: 'Drivetrain', options: [{ label: 'FWD', value: 'fwd' }, { label: 'RWD', value: 'rwd' }, { label: 'AWD / 4x4', value: 'awd' }] },
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
        { key: 'alternator', icon: 'battery-charging-outline', label: 'Charging System (Alternator)', options: [{ label: 'OK', value: 'ok' }, { label: 'Failed', value: 'failed' }, { label: 'N/A', value: 'na' }] },
        { key: 'loadTest', icon: 'shield-checkmark-outline', label: 'Battery Load Test', options: [{ label: 'Good', value: 'good' }, { label: 'Weak', value: 'weak' }, { label: 'Bad', value: 'bad' }, { label: 'N/A', value: 'na' }] },
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
        { key: 'batteryType', icon: 'layers-outline', label: 'Battery Type', options: [{ label: 'Flooded', value: 'flooded' }, { label: 'AGM', value: 'agm' }, { label: 'Lithium', value: 'lithium' }] },
        // BMW, Audi, VW, Mercedes and others: the car's computer is told about the new battery.
        { key: 'registration', icon: 'hardware-chip-outline', label: 'Battery Registration', options: [{ label: 'Done', value: 'done' }, { label: 'Not Needed', value: 'not_needed' }] },
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
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable' },
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
        { key: 'spareTire', icon: 'ellipse-outline', label: 'Spare Tire', options: [{ label: 'Available', value: 'available' }, { label: 'Repair Kit Only', value: 'repair_kit' }, { label: 'None', value: 'not_available' }] },
        { key: 'wheelLock', icon: 'key-outline', label: 'Wheel Lock Key', options: [{ label: 'Has Key', value: 'has_key' }, { label: 'No Locks', value: 'no_locks' }, { label: 'Key Missing', value: 'missing' }] },
        { key: 'wheelCondition', icon: 'radio-button-on-outline', label: 'Wheel / Rim Condition', options: [{ label: 'OK', value: 'ok' }, { label: 'Damaged', value: 'damaged' }] },
      ],
      fallbackRecommendations: ['Tire Change Labor'],
    },
  },
  // The customer's "Fuel Problem" (customer app issueQuestions.js): fuel brought to the car.
  fuel_delivery: {
    title: 'Fuel Delivery',
    icon: 'water-outline',
    requiredPhotos: [
      { key: 'front', label: 'Front of vehicle', hint: 'License plate must be readable' },
      { key: 'vin', label: 'VIN', hint: 'VIN label must be clear and readable' },
      { key: 'fuel_gauge', label: 'Fuel gauge', hint: 'Show the gauge before refueling' },
    ],
    intakeQuestions: [
      { key: 'fuel_gauge_empty', label: 'Is the fuel gauge on empty?' },
      { key: 'fuel_type', label: 'What fuel does the vehicle take?' },
    ],
    diagnosis: {
      title: 'Fuel Delivery',
      metric: { key: 'gallons', label: 'Gallons Delivered', icon: 'water-outline', unit: 'gal', keyboardType: 'decimal-pad' },
      checks: [
        { key: 'fuelType', icon: 'water-outline', label: 'Fuel Delivered', options: [{ label: 'Regular 87', value: 'regular' }, { label: 'Premium 91+', value: 'premium' }, { label: 'Diesel', value: 'diesel' }] },
        { key: 'fuelLeak', icon: 'alert-circle-outline', label: 'Fuel Leak / Smell', options: [{ label: 'None', value: 'none' }, { label: 'Found', value: 'found' }] },
        { key: 'started', icon: 'flash-outline', label: 'Vehicle Started', options: [{ label: 'Started', value: 'started' }, { label: 'Did Not Start', value: 'not_started' }] },
      ],
      fallbackRecommendations: ['Fuel Delivery'],
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
        { key: 'scanResult', icon: 'speedometer-outline', label: 'Scan / Warning Lights', options: [{ label: 'No Codes', value: 'no_codes' }, { label: 'Codes Present', value: 'codes_present' }, { label: 'N/A', value: 'na' }] },
        { key: 'safeToDrive', icon: 'shield-checkmark-outline', label: 'Safe To Drive', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      ],
      fallbackRecommendations: ['General Diagnostics'],
    },
  },
};

// Vehicle class the platform priced the order with (backend services/pricing.js):
// light (car/SUV), light_truck (pickup/van), heavy (semi, box
// truck, straight truck, trailer). Older orders without a price: from the type.
const HEAVY_SUBTYPES = ['semi', 'box_truck', 'straight_truck', 'trailer'];
const LIGHT_TRUCK_SUBTYPES = ['pickup', 'van'];

export function getVehicleClass(order) {
  const priced = order?.payment?.pricing?.vehicleClass;
  if (priced) return priced;
  const type = order?.service?.vehicleType;
  const subType = order?.service?.vehicleSubType || order?.service?.diagnosticInfo?.vehicleSubType;
  if (HEAVY_SUBTYPES.includes(subType) || type === 'truck') return 'heavy';
  if (LIGHT_TRUCK_SUBTYPES.includes(subType)) return 'light_truck';
  return 'light';
}

// Heavy trucks: the unit's number on arrival, and their own checks per service.
const HEAVY_UNIT_PHOTO = { key: 'unit_number', label: 'USDOT / unit number', hint: 'Number on the cab door must be readable' };

const HEAVY_DIAGNOSIS = {
  towing: {
    title: 'Heavy Tow Readiness',
    checks: [
      { key: 'towMethod', icon: 'trail-sign-outline', label: 'Tow Method', options: [{ label: 'Heavy Wrecker', value: 'heavy_wrecker' }, { label: 'Rotator', value: 'rotator' }, { label: 'Lowboy', value: 'lowboy' }] },
      { key: 'trailer', icon: 'cube-outline', label: 'Trailer', options: [{ label: 'No Trailer', value: 'none' }, { label: 'Empty', value: 'empty' }, { label: 'Loaded', value: 'loaded' }] },
      { key: 'airBrakes', icon: 'speedometer-outline', label: 'Air Brakes', options: [{ label: 'Air Builds', value: 'air_builds' }, { label: 'Brakes Caged', value: 'caged' }] },
      { key: 'driveshaft', icon: 'git-commit-outline', label: 'Driveshaft', options: [{ label: 'Pulled', value: 'pulled' }, { label: 'Not Needed', value: 'not_needed' }] },
      { key: 'hazmat', icon: 'warning-outline', label: 'Hazmat Load', options: [{ label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' }] },
    ],
    fallbackRecommendations: ['Heavy Tow Service'],
  },
  jump_start: {
    title: 'Heavy-Duty Electrical',
    metric: { key: 'batteryVoltage', label: 'Battery Bank Voltage', icon: 'battery-half-outline', unit: 'V', keyboardType: 'decimal-pad' },
    checks: [
      { key: 'systemVoltage', icon: 'flash-outline', label: 'System Voltage', options: [{ label: '12V', value: '12v' }, { label: '24V', value: '24v' }] },
      { key: 'batteryCount', icon: 'battery-full-outline', label: 'Batteries In Bank', options: [{ label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4+', value: '4_plus' }] },
      { key: 'jumpStart', icon: 'flash-outline', label: 'Jump Start Result', options: [{ label: 'Started', value: 'started' }, { label: 'Did Not Start', value: 'not_started' }] },
      { key: 'fuelGelled', icon: 'snow-outline', label: 'Fuel Gelled', options: [{ label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' }] },
      { key: 'coldStartAid', icon: 'thermometer-outline', label: 'Grid Heater / Glow Plugs', options: [{ label: 'Working', value: 'working' }, { label: 'Not Working', value: 'not_working' }, { label: 'N/A', value: 'na' }] },
      { key: 'alternator', icon: 'battery-charging-outline', label: 'Charging System (Alternator)', options: [{ label: 'OK', value: 'ok' }, { label: 'Failed', value: 'failed' }, { label: 'N/A', value: 'na' }] },
    ],
    fallbackRecommendations: ['Heavy-Duty Jump Start'],
  },
  battery_replacement: {
    title: 'Heavy-Duty Battery Replacement',
    metric: { key: 'batteryVoltage', label: 'Battery Bank Voltage', icon: 'battery-half-outline', unit: 'V', keyboardType: 'decimal-pad' },
    checks: [
      { key: 'batteriesReplaced', icon: 'battery-full-outline', label: 'Batteries Replaced', options: [{ label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4+', value: '4_plus' }] },
      { key: 'batteryType', icon: 'barcode-outline', label: 'Battery Type', options: [{ label: 'Flooded', value: 'flooded' }, { label: 'AGM', value: 'agm' }] },
      { key: 'bankTested', icon: 'shield-checkmark-outline', label: 'Whole Bank Tested', options: [{ label: 'All Tested', value: 'tested' }, { label: 'Not Tested', value: 'not_tested' }] },
      { key: 'terminalCondition', icon: 'hardware-chip-outline', label: 'Terminal Condition', options: [{ label: 'Clean', value: 'clean' }, { label: 'Corroded', value: 'corroded' }] },
      { key: 'systemTest', icon: 'checkmark-circle-outline', label: 'Post-install Test', options: [{ label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }] },
    ],
    fallbackRecommendations: ['Heavy-Duty Battery Replacement'],
  },
  lockout: {
    title: 'Truck Lockout Verification',
    checks: [
      { key: 'ownershipVerified', icon: 'shield-checkmark-outline', label: 'Permission', options: [{ label: 'Driver CDL', value: 'driver_cdl' }, { label: 'Carrier Dispatch', value: 'carrier_dispatch' }, { label: 'Not Verified', value: 'not_verified' }] },
      { key: 'entryMethod', icon: 'lock-open-outline', label: 'Entry Method', options: [{ label: 'Standard Entry', value: 'standard' }, { label: 'Key Service', value: 'key_service' }] },
      { key: 'damageCheck', icon: 'car-outline', label: 'Damage Check', options: [{ label: 'No Damage', value: 'no_damage' }, { label: 'Damage Present', value: 'damage' }] },
    ],
    fallbackRecommendations: ['Truck Lockout Service'],
  },
  tire_change: {
    title: 'Heavy-Duty Tire & Wheel',
    metric: { key: 'tirePressure', label: 'Tire Pressure', icon: 'speedometer-outline', unit: 'PSI', keyboardType: 'decimal-pad' },
    checks: [
      { key: 'tirePosition', icon: 'locate-outline', label: 'Tire Position', options: [{ label: 'Steer', value: 'steer' }, { label: 'Drive', value: 'drive' }, { label: 'Trailer', value: 'trailer' }] },
      { key: 'dualPosition', icon: 'pause-outline', label: 'Single / Dual', options: [{ label: 'Single', value: 'single' }, { label: 'Inner Dual', value: 'inner' }, { label: 'Outer Dual', value: 'outer' }] },
      { key: 'replacement', icon: 'disc-outline', label: 'Replaced With', options: [{ label: 'New', value: 'new' }, { label: 'Recap', value: 'recap' }, { label: "Customer's", value: 'customer' }] },
      { key: 'torque', icon: 'construct-outline', label: 'Lug Nuts Torqued To Spec', options: [{ label: 'Done', value: 'done' }, { label: 'Not Done', value: 'not_done' }] },
      { key: 'wheelCondition', icon: 'radio-button-on-outline', label: 'Wheel / Rim Condition', options: [{ label: 'OK', value: 'ok' }, { label: 'Damaged', value: 'damaged' }] },
    ],
    fallbackRecommendations: ['Heavy-Duty Tire Service'],
  },
  fuel_delivery: {
    title: 'Diesel Fuel Delivery',
    metric: { key: 'gallons', label: 'Gallons Delivered', icon: 'water-outline', unit: 'gal', keyboardType: 'decimal-pad' },
    checks: [
      { key: 'fuelType', icon: 'water-outline', label: 'Fuel Delivered', options: [{ label: 'Diesel', value: 'diesel' }, { label: 'Gas', value: 'gas' }] },
      { key: 'def', icon: 'color-fill-outline', label: 'DEF Topped Up', options: [{ label: 'Topped Up', value: 'topped_up' }, { label: 'Not Needed', value: 'not_needed' }] },
      { key: 'antiGel', icon: 'snow-outline', label: 'Anti-Gel Added', options: [{ label: 'Added', value: 'added' }, { label: 'Not Needed', value: 'not_needed' }] },
      { key: 'primed', icon: 'refresh-outline', label: 'Fuel System Primed', options: [{ label: 'Primed', value: 'primed' }, { label: 'Not Needed', value: 'not_needed' }] },
      { key: 'started', icon: 'flash-outline', label: 'Truck Started', options: [{ label: 'Started', value: 'started' }, { label: 'Did Not Start', value: 'not_started' }] },
    ],
    fallbackRecommendations: ['Diesel Fuel Delivery'],
  },
  mobile_mechanic: {
    title: 'Heavy-Duty Diagnosis',
    checks: [
      { key: 'visualInspection', icon: 'eye-outline', label: 'Visual Inspection', options: [{ label: 'Normal', value: 'normal' }, { label: 'Issue Found', value: 'issue_found' }] },
      { key: 'scanResult', icon: 'speedometer-outline', label: 'Scan (J1939)', options: [{ label: 'No Codes', value: 'no_codes' }, { label: 'Codes Present', value: 'codes_present' }, { label: 'N/A', value: 'na' }] },
      { key: 'airLeaks', icon: 'cloud-outline', label: 'Air System Leaks', options: [{ label: 'No Leaks', value: 'none' }, { label: 'Leak Found', value: 'leak' }] },
      { key: 'dpf', icon: 'filter-outline', label: 'DPF / Regen', options: [{ label: 'Normal', value: 'normal' }, { label: 'Regen Needed', value: 'regen_needed' }] },
      { key: 'outOfService', icon: 'shield-checkmark-outline', label: 'Road Ready', options: [{ label: 'Road Ready', value: 'road_ready' }, { label: 'Out Of Service', value: 'out_of_service' }] },
    ],
    fallbackRecommendations: ['Heavy-Duty Diagnostics'],
  },
};

// Pickups and vans: a dually's rear tire can be the inner or outer one.
const LIGHT_TRUCK_TIRE_CHECK = { key: 'dualPosition', icon: 'pause-outline', label: 'Wheel Position', options: [{ label: 'Single', value: 'single' }, { label: 'Inner Dual', value: 'inner' }, { label: 'Outer Dual', value: 'outer' }] };

// Electric and hybrid cars: no alternator (a DC-DC converter charges the 12V
// battery), "started" means Ready mode, and an EV or plug-in rides on a flatbed only.
const HIGH_VOLTAGE = ['electric', 'plugin', 'hybrid'];

// gas | hybrid | plugin | electric (customer app utils.POWERTRAINS); older orders: gas.
export function getPowertrain(order) {
  return order?.vehicle?.powertrain || order?.service?.diagnosticInfo?.powertrain || 'gas';
}

function withPowertrain(diagnosis, serviceType, powertrain) {
  if (!diagnosis || !HIGH_VOLTAGE.includes(powertrain)) return diagnosis;
  const checks = diagnosis.checks.map((check) => {
    if (check.key === 'alternator') {
      return { key: 'dcdc', icon: check.icon, label: '12V Charging (DC-DC)', options: [{ label: 'Charging OK', value: 'ok' }, { label: 'Not Charging', value: 'failed' }, { label: 'N/A', value: 'na' }] };
    }
    if (check.key === 'jumpStart') {
      return { ...check, options: [{ label: 'Ready Mode', value: 'started' }, { label: 'No Ready Mode', value: 'not_started' }] };
    }
    if (check.key === 'towMethod' && powertrain !== 'hybrid') {
      return { ...check, options: [{ label: 'Flatbed Only', value: 'flatbed' }] };
    }
    return check;
  });
  const title = serviceType === 'battery_replacement' ? '12V Battery Replacement' : diagnosis.title;
  return { ...diagnosis, title, checks };
}

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
    order.service?.issueName ||
    order.service?.type ||
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
  if (serviceText.includes('tow') || serviceText.includes('out of charge')) return 'towing';
  if (serviceText.includes('jump') || serviceText.includes('dead battery') || serviceText.includes('boost')) return 'jump_start';
  if (serviceText.includes('lock') || serviceText.includes('key')) return 'lockout';
  if (serviceText.includes('tire') || serviceText.includes('tyre') || serviceText.includes('flat') || serviceText.includes('wheel')) return 'tire_change';
  if (serviceText.includes('battery replacement') || serviceText.includes('replace battery')) return 'battery_replacement';
  if (serviceText.includes('fuel problem') || serviceText.includes('out of fuel') || serviceText.includes('fuel delivery')) return 'fuel_delivery';
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
  const serviceType = getOrderServiceType(order);
  const schema = SERVICE_FLOW_SCHEMAS[serviceType] || SERVICE_FLOW_SCHEMAS.mobile_mechanic;
  const vehicleClass = getVehicleClass(order);
  if (vehicleClass === 'heavy') {
    // The unit number right after the front and VIN.
    const photos = [...schema.requiredPhotos.slice(0, 2), HEAVY_UNIT_PHOTO, ...schema.requiredPhotos.slice(2)];
    return { ...schema, requiredPhotos: photos, diagnosis: HEAVY_DIAGNOSIS[serviceType] || HEAVY_DIAGNOSIS.mobile_mechanic };
  }
  if (vehicleClass === 'light_truck' && serviceType === 'tire_change') {
    const [first, ...rest] = schema.diagnosis.checks;
    return { ...schema, diagnosis: { ...schema.diagnosis, checks: [first, LIGHT_TRUCK_TIRE_CHECK, ...rest] } };
  }
  const diagnosis = withPowertrain(schema.diagnosis, serviceType, getPowertrain(order));
  if (diagnosis !== schema.diagnosis) return { ...schema, diagnosis };
  return schema || {
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

// Electric and hybrid vehicles: what the provider has to know before going out.
const POWERTRAIN_NOTES = {
  electric: 'Electric — high voltage. Tow on a flatbed only',
  plugin: 'Plug-in hybrid — high voltage. Flatbed recommended',
  hybrid: 'Hybrid — high voltage. Jump only from the 12V jump points',
};

function powertrainItem(order) {
  const powertrain = order.vehicle?.powertrain || order.service?.diagnosticInfo?.powertrain;
  return POWERTRAIN_NOTES[powertrain] ? [{ key: 'powertrain', label: 'Powertrain', value: POWERTRAIN_NOTES[powertrain] }] : [];
}

export function getProviderIntakeItems(order) {
  const schema = getServiceFlowSchema(order);
  const serviceType = getOrderServiceType(order);
  const diagnosticInfo = order.service?.diagnosticInfo || order.diagnosticInfo || {};
  const explicitQuestions = order.service?.intakeQuestions || diagnosticInfo.intakeQuestions || order.orderContext?.intakeQuestions;
  const explicitServiceType = diagnosticInfo.serviceType || order.orderContext?.diagnosticServiceType;
  const answers = order.service?.intakeAnswers || diagnosticInfo.intakeAnswers || diagnosticInfo.answers || order.orderContext?.intakeAnswers || {};

  const items = Array.isArray(explicitQuestions) && explicitQuestions.length && (!explicitServiceType || explicitServiceType === serviceType)
    ? explicitQuestions.map((item, index) => ({
      key: item.key || item.id || `intake-${index}`,
      label: item.label || item.question || item.title || `Question ${index + 1}`,
      value: item.answer ?? answers[item.key] ?? answers[item.id] ?? '',
    })).filter(item => item.label)
    : schema.intakeQuestions.map((item, index) => ({
      ...item,
      key: item.key || `intake-${index}`,
      value: answers[item.key] ?? answers[index + 1] ?? answers[String(index + 1)] ?? '',
    }));

  return [...powertrainItem(order), ...items, ...getTireDetailItems(answers, diagnosticInfo, items)];
}

// Which tires and what size, from the customer's flat tire answers. They are
// stored next to the questions (tire_positions / tire_size, or flatTires), not
// as questions of their own, so they're added here unless already listed.
function getTireDetailItems(answers, diagnosticInfo, listed) {
  const listedKeys = new Set(listed.map(item => item.key));
  const flatTires = Array.isArray(diagnosticInfo.flatTires) ? diagnosticInfo.flatTires : [];
  const positions = answers.tire_positions
    || flatTires.map(tire => tire?.position || tire?.axle).filter(Boolean).join(', ');
  const size = answers.tire_size
    || [...new Set(flatTires.map(tire => tire?.size).filter(Boolean))].join(', ');
  const extra = [];
  if (positions && !listedKeys.has('tire_positions')) extra.push({ key: 'tire_positions', label: 'Which tires', value: positions });
  if (size && !listedKeys.has('tire_size')) extra.push({ key: 'tire_size', label: 'Tire size', value: size });
  return extra;
}

export function isTowingService(order) {
  const serviceText = getServiceTypeText(order);
  return serviceText.includes('tow');
}

// Drops a trailing "United States"/"USA" segment while keeping the rest of the
// address intact (street, city, state, ZIP) — unlike a city/state-only summary,
// the provider still needs the full street address here to actually navigate to it.
// (COUNTRY_NAMES is declared once below, reused by getCityState too.)
export function stripCountryFromAddress(address) {
  if (!address) return address;
  const parts = String(address).split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1 && COUNTRY_NAMES.test(parts[parts.length - 1])) parts.pop();
  return parts.join(', ');
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
const COUNTRY_NAMES = /^(united states( of america)?|usa|u\.s\.a\.?|us|u\.s\.?)$/i;

export function getCityState(address) {
  if (!address) return address;
  let parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 2 && COUNTRY_NAMES.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
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
  return job.vehicle?.vin || job.vin || DEMO_VIN_BY_JOB_ID[job.id] || 'pending';
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

export function getArrivedAtLabel(job) {
  const rawValue = job.arrivedAt;
  if (!rawValue) return null;
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return null;
  return `Arrived ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
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

const VEHICLE_TYPE_LABELS = { car: 'Car', truck: 'Truck', van: 'Van', moto: 'Motorcycle' };

// Honest fallback for orders where the customer skipped make/model/year: falls back to the
// broad vehicle category (car/truck/van/moto) if known, otherwise admits there's no data at all.
export function getVehicleDisplayLabel(order) {
  const knownVehicle = [order.vehicle?.year, order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ');
  if (knownVehicle) return knownVehicle;
  const rawType = order.service?.vehicleType;
  const typeLabel = VEHICLE_TYPE_LABELS[rawType] || (rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : '');
  return typeLabel ? `${typeLabel} (details not provided)` : 'No vehicle info provided';
}

// Compact variant for list rows: just the vehicle category (e.g. "Car"), no long
// "(details not provided)" explainer — falls back to the generic "Vehicle" label.
export function getVehicleTypeLabel(order) {
  const knownVehicle = [order.vehicle?.year, order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ');
  if (knownVehicle) return knownVehicle;
  const rawType = order.service?.vehicleType;
  return VEHICLE_TYPE_LABELS[rawType] || (rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : 'Vehicle');
}

// Same fallback as getVehicleDisplayLabel, but split so callers can render the
// "(details not provided)" explainer in a smaller/muted style than the main label.
export function getVehicleDisplayParts(order) {
  const knownVehicle = [order.vehicle?.year, order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ');
  if (knownVehicle) return { main: knownVehicle, suffix: '' };
  const rawType = order.service?.vehicleType;
  const typeLabel = VEHICLE_TYPE_LABELS[rawType] || (rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : '');
  return typeLabel ? { main: typeLabel, suffix: ' (details not provided)' } : { main: 'No vehicle info provided', suffix: '' };
}

export function hasKnownVin(order) {
  return !!order.vehicle?.vin && order.vehicle.vin !== 'Not added';
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

// How far a mobile job has got, as the server's order status (later = higher).
// A step's status is sent once, the first time the job reaches it.
const JOB_STATUS_RANK = {
  accepted: 0, confirmed: 0, en_route: 1, arrived: 2, inspection: 3,
  estimate_sent: 4, estimate_declined: 4, estimate_approved: 5, in_progress: 6, completed: 7,
};
export function jobStatusRank(status) {
  return JOB_STATUS_RANK[status] ?? -1;
}

export function getBackendStatusFromWorkflowStage(stage) {
  if (stage === 'route') return 'en_route';
  if (stage === 'arrived') return 'arrived';
  if (stage === 'diagnosis' || stage === 'estimate') return 'inspection';
  if (stage === 'approval') return 'estimate_sent';
  if (stage === 'working' || stage === 'complete_review') return 'in_progress';
  if (stage === 'completed') return 'completed';
  return null;
}
