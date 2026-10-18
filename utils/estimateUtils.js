import { getOrderServiceType, getVehicleClass, getServiceMeta } from './serviceUtils';
import { getPricing } from './pricingStore';

export function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

// Single source of truth for what a job's invoice adds up to — shared by the
// Complete Job preview, the completed-job summary card, and the Jobs list,
// so none of them can drift into showing a different total for the same job.
export function getInvoiceData(job, workflow, additionalApprovals, fallbackEstimate) {
  const persistedEstimate = job.orderContext?.estimate || null;
  const invoiceEstimate = persistedEstimate ? {
    ...persistedEstimate,
    labor: persistedEstimate.laborItems || [],
    parts: persistedEstimate.partsItems || [],
    fees: persistedEstimate.fees || [],
  } : (fallbackEstimate || { labor: [], parts: [], fees: [], subtotal: 0, tax: 0, total: 0 });
  const originalTotal = job.orderContext?.approvedTotal ?? job.approvedTotal ?? workflow?.approvedTotal ?? invoiceEstimate.total ?? 0;
  const approvedRequiredChanges = (additionalApprovals || []).filter(item => item.status === 'approved');
  const approvedAdditionalTotal = sumAmounts(approvedRequiredChanges);
  // Extra work is taxed like the estimate, and the tax is part of what the customer
  // pays — same rule as the backend (routes/orderMoney.finalOrderTotal). Once the
  // order is charged, the server's final total is what was actually collected.
  const approvedAdditionalTax = Math.round(approvedAdditionalTotal * 0.0675 * 100) / 100;
  const finalTotal = job.payment?.finalTotal
    ?? Math.round((originalTotal + approvedAdditionalTotal + approvedAdditionalTax) * 100) / 100;
  const invoiceNumber = `INV-${job.number || '00000'}`;
  const PAYMENT_METHOD_LABELS = { apple: 'Apple Pay', google: 'Google Pay', paypal: 'PayPal', efs: 'EFS', comcheck: 'Comcheck', fleet: 'Fleet One', tchek: 'T-Chek' };
  const paymentMethod = (job.payment?.brand && job.payment?.last4)
    ? `${job.payment.brand.charAt(0).toUpperCase()}${job.payment.brand.slice(1)} ••••${job.payment.last4}`
    : PAYMENT_METHOD_LABELS[job.payment?.method] || 'Card on file';
  const approveOptional = job.approveOptional ?? workflow?.approveOptional ?? false;
  const invoiceTax = Math.round(((invoiceEstimate.tax || 0) + (approveOptional ? (invoiceEstimate.optionalTax || 0) : 0) + approvedAdditionalTax) * 100) / 100;
  const invoiceSubtotal = (invoiceEstimate.subtotal || 0) + (approveOptional ? (invoiceEstimate.optionalSubtotal || 0) : 0) + approvedAdditionalTotal;
  return { invoiceEstimate, invoiceNumber, paymentMethod, invoiceTax, invoiceSubtotal, finalTotal, approvedRequiredChanges, approveOptional };
}

// What the provider actually keeps: the invoice total minus platform
// commission — and parts are excluded from the commission base, since the
// provider is just passing that cost through, not marking it up as labor.
// `commissionRate` comes from the provider's own account (falls back to the
// app-wide default here) so a future per-provider or global override on the
// backend takes effect without any app code changing.
export function getProviderEarnings(job, workflow, additionalApprovals, fallbackEstimate, commissionRate) {
  const data = getInvoiceData(job, workflow, additionalApprovals, fallbackEstimate);
  const { invoiceEstimate, finalTotal, approveOptional } = data;
  const partsTotal = sumAmounts(invoiceEstimate.parts || [])
    + (approveOptional ? sumAmounts(invoiceEstimate.optionalParts || []) : 0);
  const commissionBase = Math.max(0, finalTotal - partsTotal);
  const rate = commissionRate ?? 0.15;
  // After payout the server's split is authoritative (services/payouts.computePayout).
  const commission = job.payment?.platformFee ?? Math.round(commissionBase * rate * 100) / 100;
  const netEarnings = job.payment?.providerPayout ?? Math.round((finalTotal - commission) * 100) / 100;
  return { ...data, partsTotal, commissionBase, commissionRate: rate, commission, netEarnings };
}

export function getTodayCompletedStats(completedOrders = [], commissionRate) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayOrders = completedOrders.filter(o => new Date(o.completedAt || o.updatedAt || o.createdAt) >= startOfToday);
  const total = todayOrders.reduce((acc, o) => acc + getProviderEarnings(o, null, o.additionalApprovals, null, commissionRate).netEarnings, 0);
  return { count: todayOrders.length, total };
}

export function formatCurrency(value) {
  const num = Number(value || 0);
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Heavy trucks: recommendations from their own checks (serviceUtils HEAVY_DIAGNOSIS).
function getHeavyRecommendations(serviceType, answers, batteryVoltage) {
  const recommendations = [];
  if (serviceType === 'towing') {
    if (answers.towMethod === 'rotator') recommendations.push('Rotator Recovery');
    if (answers.towMethod === 'lowboy') recommendations.push('Lowboy Transport');
    if (answers.trailer === 'loaded') recommendations.push('Loaded Trailer Tow');
    if (answers.airBrakes === 'caged') recommendations.push('Brake Caging');
    if (answers.driveshaft === 'pulled') recommendations.push('Driveshaft Removal');
    if (answers.hazmat === 'yes') recommendations.push('Hazmat Handling');
    return recommendations.length ? recommendations : ['Heavy Tow Service'];
  }
  if (serviceType === 'jump_start' || serviceType === 'battery_replacement') {
    // A healthy bank rests at about 12.6V, or 25.2V on a 24V system.
    const voltage = Number.parseFloat(String(batteryVoltage || '').replace(',', '.'));
    const low = answers.systemVoltage === '24v' ? 24.4 : 12.2;
    if (serviceType === 'jump_start' && Number.isFinite(voltage) && voltage < low) recommendations.push('Battery Bank Replacement');
    if (answers.fuelGelled === 'yes') recommendations.push('Fuel Anti-Gel Treatment');
    if (answers.coldStartAid === 'not_working') recommendations.push('Grid Heater / Glow Plug Repair');
    if (answers.alternator === 'failed') recommendations.push('Alternator Replacement');
    if (answers.jumpStart === 'not_started') recommendations.push('Advanced Electrical Diagnosis');
    if (answers.systemTest === 'failed') recommendations.push('Charging System Check');
    return recommendations.length ? recommendations : [serviceType === 'jump_start' ? 'Heavy-Duty Jump Start' : 'Heavy-Duty Battery Replacement'];
  }
  if (serviceType === 'lockout') {
    return answers.ownershipVerified === 'not_verified' ? ['Customer Verification Required'] : ['Truck Lockout Service'];
  }
  if (serviceType === 'fuel_delivery') {
    if (answers.def === 'topped_up') recommendations.push('DEF Refill');
    if (answers.antiGel === 'added') recommendations.push('Anti-Gel Treatment');
    if (answers.primed === 'primed') recommendations.push('Fuel System Priming');
    if (answers.started === 'not_started') recommendations.push('Fuel System Diagnosis');
    return recommendations.length ? ['Diesel Fuel Delivery', ...recommendations] : ['Diesel Fuel Delivery'];
  }
  if (serviceType === 'tire_change') {
    if (answers.replacement === 'new') recommendations.push('Tire Replacement (New)');
    if (answers.replacement === 'recap') recommendations.push('Tire Replacement (Recap)');
    if (answers.wheelCondition === 'damaged') recommendations.push('Wheel Inspection');
    if (answers.torque === 'done') recommendations.push('Re-torque After 50–100 Miles');
    return recommendations.length ? recommendations : ['Heavy-Duty Tire Service'];
  }
  if (answers.scanResult === 'codes_present') recommendations.push('Advanced Diagnostics');
  if (answers.airLeaks === 'leak') recommendations.push('Air System Repair');
  if (answers.dpf === 'regen_needed') recommendations.push('DPF Regeneration');
  if (answers.outOfService === 'out_of_service') recommendations.push('Safety Inspection');
  return recommendations.length ? recommendations : ['Heavy-Duty Diagnostics'];
}

export function getRecommendedServicesFromDiagnosis(answers, batteryVoltage, order) {
  const serviceType = getOrderServiceType(order);
  if (getVehicleClass(order) === 'heavy') return getHeavyRecommendations(serviceType, answers, batteryVoltage);
  if (serviceType === 'tire_change') {
    const recommendations = [];
    if (answers.tireDamage === 'not_repairable') recommendations.push('Tire Replacement');
    if (answers.spareTire === 'not_available') recommendations.push('Tow to Tire Shop');
    if (answers.spareTire === 'repair_kit') recommendations.push('Tire Plug / Sealant Repair');
    if (answers.wheelLock === 'missing') recommendations.push('Wheel Lock Removal');
    if (answers.wheelCondition === 'damaged') recommendations.push('Wheel Inspection');
    return recommendations.length ? recommendations : ['Tire Change Labor'];
  }
  if (serviceType === 'towing') {
    const recommendations = [];
    if (answers.towMethod === 'flatbed') recommendations.push('Flatbed Towing');
    if (answers.drivetrain === 'awd' && answers.towMethod !== 'flatbed') recommendations.push('Flatbed Recommended (AWD / 4x4)');
    if (answers.vehicleRolls === 'locked' || answers.steering === 'locked') recommendations.push('Special Recovery Setup');
    return recommendations.length ? recommendations : ['Tow Service'];
  }
  if (serviceType === 'lockout') {
    if (answers.ownershipVerified === 'not_verified') return ['Customer Verification Required'];
    return ['Lockout Service'];
  }
  if (serviceType === 'fuel_delivery') {
    const recommendations = ['Fuel Delivery'];
    if (answers.fuelLeak === 'found') recommendations.push('Fuel Leak Inspection');
    if (answers.started === 'not_started') recommendations.push('Fuel System Diagnosis');
    return recommendations;
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
  if (answers.dcdc === 'failed') {
    recommendations.push('12V Charging Check (DC-DC)');
  }
  if (answers.registration === 'done') {
    recommendations.push('Battery Registration');
  }
  if (answers.jumpStart === 'not_started') {
    recommendations.push('Advanced Electrical Diagnosis');
  }
  return recommendations.length ? recommendations : ['Electrical System Check'];
}

export function getDemoEstimate(answers, batteryVoltage, extraItems = [], removedItems = [], order, options = {}) {
  const pricing = getPricing();
  // An order this provider priced (server payment.providerPrice, accepted by the
  // customer): that price is the first line, locked, and nothing is added on its
  // own; extra work goes in as the provider adds it. Their rate prices the rest.
  const accepted = order?.payment?.providerPrice;
  const acceptedLine = accepted?.work != null ? {
    id: 'base-accepted-price',
    source: 'base',
    scope: 'required',
    locked: true,
    // The work done (Tire Change), not the customer's problem (Flat Tire).
    label: getServiceMeta(order || {}).title || order?.service?.issueName || 'Service',
    hours: accepted.kind === 'tow'
      ? (accepted.miles != null ? `~${accepted.miles} mi` : undefined)
      : (accepted.hours != null ? `${accepted.hours} hr` : undefined),
    // The job without the surcharges; those are listed under Fees.
    amount: Math.round((Number(accepted.work) - (accepted.surcharges || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)) * 100) / 100,
  } : null;
  // The provider's own fees from their Pricing screen that apply to this job
  // (server providerPrice.surcharges), named as there.
  const SURCHARGE_LABELS = { weekend: 'Weekend Fee', after_hours: 'After Hours Fee', heavy_duty: 'Heavy Duty Surcharge' };
  const acceptedFees = acceptedLine
    ? (accepted.surcharges || []).map(item => ({ label: SURCHARGE_LABELS[item.key] || item.label, amount: Math.round(Number(item.amount) * 100) / 100, locked: true }))
    : [];
  const lr = Number(accepted?.laborRate) > 0
    ? Math.round(Number(accepted.laborRate) * 100) / 100
    : Math.round(parseFloat(pricing.laborRate || '120') * 100) / 100;
  const serviceCallFee = Math.round(parseFloat(pricing.serviceCallFee || '49') * 100) / 100;
  const hookUpFee = Math.round(parseFloat(pricing.hookUpFee || '95') * 100) / 100;

  const serviceType = getOrderServiceType(order);
  let labor = [];
  let parts = [];

  if (acceptedLine) {
    labor = [acceptedLine];
    parts = [];
  } else if (serviceType === 'tire_change') {
    labor = [
      { id: 'base-labor-tire-change', source: 'base', scope: 'required', label: 'Tire Change Labor', hours: '0.6 hr', amount: Math.round(lr * 0.6 * 100) / 100 },
    ];
    parts = [
      { id: 'base-part-shop-supplies', source: 'base', scope: 'required', label: 'Shop Supplies', amount: 12 },
    ];
    if (answers.tireDamage === 'not_repairable') {
      parts.splice(0, 0, { id: 'ai-part-replacement-tire', source: 'ai', scope: 'required', label: 'Replacement Tire', amount: 149 });
    }
  } else if (serviceType === 'towing') {
    labor = [
      { id: 'base-labor-tow-service', source: 'base', scope: 'required', label: answers.towMethod === 'flatbed' ? 'Flatbed Towing' : 'Tow Service', hours: '1.0 hr', amount: Math.round((hookUpFee + (answers.towMethod === 'flatbed' ? 50 : 25)) * 100) / 100 },
    ];
    parts = [
      { id: 'base-part-tow-supplies', source: 'base', scope: 'required', label: 'Tow Supplies', amount: 15 },
    ];
  } else if (serviceType === 'lockout') {
    labor = [
      { id: 'base-labor-lockout-service', source: 'base', scope: 'required', label: 'Lockout Service', hours: '0.7 hr', amount: Math.round(lr * 0.7 * 100) / 100 },
    ];
    parts = [];
  } else if (serviceType === 'fuel_delivery') {
    labor = [
      { id: 'base-labor-fuel-delivery', source: 'base', scope: 'required', label: 'Fuel Delivery', hours: '0.5 hr', amount: Math.round(lr * 0.5 * 100) / 100 },
    ];
    parts = [];
  } else if (serviceType === 'mobile_mechanic') {
    labor = [
      { id: 'base-labor-diagnostics', source: 'base', scope: 'required', label: 'Mobile Diagnostics', hours: '0.8 hr', amount: Math.round(lr * 0.8 * 100) / 100 },
    ];
    parts = [
      { id: 'base-part-shop-supplies', source: 'base', scope: 'required', label: 'Shop Supplies', amount: 12 },
    ];
  } else {
    labor = [
      { id: 'base-labor-battery-replacement', source: 'base', scope: 'required', label: 'Battery Replacement', hours: '1.0 hr', amount: Math.round(lr * 1.0 * 100) / 100 },
    ];
    parts = [
      { id: 'base-part-battery-group-35', source: 'base', scope: 'required', label: 'Battery Group 35', amount: 169 },
      { id: 'base-part-shop-supplies', source: 'base', scope: 'required', label: 'Shop Supplies', amount: 12 },
    ];
  }

  const optionalLabor = [];
  const optionalParts = [];

  if (!acceptedLine && serviceType === 'tire_change' && answers.wheelCondition === 'damaged') {
    optionalLabor.push({ id: 'ai-labor-wheel-inspection', source: 'ai', scope: 'optional', label: 'Wheel Inspection', hours: '0.4 hr', amount: 48 });
  }
  if (!acceptedLine && (serviceType === 'jump_start' || serviceType === 'battery_replacement') && answers.alternator === 'failed') {
    labor.push({ id: 'ai-labor-alternator-replacement', source: 'ai', scope: 'required', label: 'Alternator Replacement', hours: '1.2 hr', amount: 144 });
    parts.splice(1, 0, { id: 'ai-part-alternator', source: 'ai', scope: 'required', label: 'Alternator', amount: 189 });
  }
  if (!acceptedLine && (serviceType === 'jump_start' || serviceType === 'battery_replacement') && answers.jumpStart === 'not_started') {
    labor.push({ id: 'ai-labor-electrical-diagnosis', source: 'ai', scope: 'required', label: 'Electrical Diagnosis', hours: '0.8 hr', amount: 96 });
  }
  const voltage = Number.parseFloat(String(batteryVoltage || '').replace(',', '.'));
  if (!acceptedLine && (serviceType === 'jump_start' || serviceType === 'battery_replacement') && Number.isFinite(voltage) && voltage >= 12.2 && answers.loadTest === 'good') {
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
  const providerType = pricing.providerType || 'mobile';
  const feeByDefault = providerType !== 'shop';
  const includeServiceCallFee = options.includeServiceCallFee !== undefined ? options.includeServiceCallFee : feeByDefault;
  // An order priced by this provider: their service call fee is part of the
  // accepted price, listed as included (the server does the same).
  const fees = acceptedLine
    ? [
      ...acceptedFees,
      ...(Number(accepted.callFee) > 0 ? [{ label: 'Service Call Fee (included)', amount: Math.round(Number(accepted.callFee) * 100) / 100, included: true }] : []),
    ]
    : (includeServiceCallFee ? [{ label: 'Service Call Fee', amount: serviceCallFee }] : []);
  const laborSubtotal = sumAmounts(visibleLabor);
  const partsSubtotal = sumAmounts(visibleParts);
  const optionalLaborSubtotal = sumAmounts(visibleOptionalLabor);
  const optionalPartsSubtotal = sumAmounts(visibleOptionalParts);
  const feesSubtotal = sumAmounts(fees.filter(fee => !fee.included));
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

// What the provider can add to an estimate, by vehicle class (cars and pickups,
// or heavy trucks). Labor is hours × the provider's rate from the order (server
// payment.providerPrice), else the rate saved on this phone. Part prices are
// typical starting points; the provider can add their own.
const CAR_LABOR = [
  ['Second Tire Change', 0.5, 'Roadside'],
  ['Tire Repair (Plug)', 0.5, 'Roadside'],
  ['Wheel Lock Removal', 0.5, 'Roadside'],
  ['Tire Change Labor', 0.6, 'Roadside'],
  ['Battery Replacement', 1.0, 'Electrical'],
  ['Battery Registration', 0.3, 'Electrical'],
  ['Alternator Replacement', 1.2, 'Electrical'],
  ['Starter Replacement', 1.4, 'Electrical'],
  ['Electrical Diagnosis', 0.8, 'Diagnostics'],
  ['Fuel System Diagnosis', 1.0, 'Diagnostics'],
  ['Brake Inspection', 0.7, 'Inspection'],
];
const CAR_PARTS = [
  ['Tire', 140, 'Tires'],
  ['Tire Plug Kit', 15, 'Tires'],
  ['Battery Group 35', 169, 'Battery'],
  ['Battery Group 24F', 175, 'Battery'],
  ['AGM Battery H6', 230, 'Battery'],
  ['Alternator', 189, 'Charging System'],
  ['Starter Motor', 215, 'Starting System'],
  ['Battery Terminal Kit', 24, 'Electrical'],
  ['Serpentine Belt', 39, 'Engine'],
  ['Shop Supplies', 12, 'Supplies'],
];
const TRUCK_LABOR = [
  ['Heavy-Duty Tire Change', 1.5, 'Roadside'],
  ['Tire Mount & Balance', 1.0, 'Roadside'],
  ['Re-torque Check', 0.3, 'Roadside'],
  ['Battery Bank Replacement', 1.5, 'Electrical'],
  ['Alternator Replacement', 2.0, 'Electrical'],
  ['Starter Replacement', 2.0, 'Electrical'],
  ['Electrical Diagnosis (J1939)', 1.0, 'Diagnostics'],
  ['Air Leak Repair', 1.0, 'Air Brakes'],
  ['Brake Chamber Replacement', 1.5, 'Air Brakes'],
  ['Slack Adjuster Replacement', 1.0, 'Air Brakes'],
  ['DPF Regeneration', 1.0, 'Engine'],
  ['Fuel System Priming', 0.5, 'Fuel'],
];
const TRUCK_PARTS = [
  ['Drive Tire 11R22.5', 520, 'Tires'],
  ['Steer Tire 295/75R22.5', 560, 'Tires'],
  ['Battery Group 31', 210, 'Battery'],
  ['Heavy-Duty Alternator', 420, 'Charging System'],
  ['Heavy-Duty Starter', 450, 'Starting System'],
  ['Brake Chamber', 95, 'Air Brakes'],
  ['Slack Adjuster', 120, 'Air Brakes'],
  ['Air Line / Fitting', 35, 'Air Brakes'],
  ['Diesel Anti-Gel', 25, 'Fuel'],
  ['DEF, 2.5 gal', 20, 'Fuel'],
  ['Shop Supplies', 15, 'Supplies'],
];

export function getEstimateCatalog(type, order) {
  const accepted = Number(order?.payment?.providerPrice?.laborRate);
  const lr = accepted > 0
    ? Math.round(accepted * 100) / 100
    : Math.round(parseFloat(getPricing().laborRate || '120') * 100) / 100;
  const heavy = getVehicleClass(order) === 'heavy';
  if (type === 'parts') {
    return (heavy ? TRUCK_PARTS : CAR_PARTS).map(([label, amount, category]) => ({ type: 'parts', label, amount, category }));
  }
  return (heavy ? TRUCK_LABOR : CAR_LABOR).map(([label, hours, category]) => ({
    type: 'labor', label, hours: `${hours.toFixed(1)} hr`, amount: Math.round(lr * hours * 100) / 100, category,
  }));
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
  const fallback = type === 'parts'
    ? { min: 10, max: 250 }
    : { min: 60, max: 180 };
  const matched = ranges.find(range => range.type === type && range.match.some(match => normalizedName.includes(match))) || fallback;
  return { ...matched, warning: amount > matched.max };
}
