import { getOrderServiceType } from './serviceUtils';
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
  const originalTotal = job.approvedTotal ?? workflow?.approvedTotal ?? invoiceEstimate.total ?? 0;
  const approvedRequiredChanges = (additionalApprovals || []).filter(item => item.status === 'approved');
  const approvedAdditionalTotal = sumAmounts(approvedRequiredChanges);
  const finalTotal = originalTotal + approvedAdditionalTotal;
  const invoiceNumber = `INV-${job.number || '00000'}`;
  const PAYMENT_METHOD_LABELS = { apple: 'Apple Pay', google: 'Google Pay', paypal: 'PayPal', efs: 'EFS', comcheck: 'Comcheck', fleet: 'Fleet One', tchek: 'T-Chek' };
  const paymentMethod = (job.payment?.brand && job.payment?.last4)
    ? `${job.payment.brand.charAt(0).toUpperCase()}${job.payment.brand.slice(1)} ••••${job.payment.last4}`
    : PAYMENT_METHOD_LABELS[job.payment?.method] || 'Card on file';
  const approveOptional = job.approveOptional ?? workflow?.approveOptional ?? false;
  const invoiceTax = Math.round(((invoiceEstimate.tax || 0) + (approveOptional ? (invoiceEstimate.optionalTax || 0) : 0) + approvedAdditionalTotal * 0.0675) * 100) / 100;
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
  const commission = Math.round(commissionBase * rate * 100) / 100;
  const netEarnings = Math.round((finalTotal - commission) * 100) / 100;
  return { ...data, partsTotal, commissionBase, commissionRate: rate, commission, netEarnings };
}

export function formatCurrency(value) {
  const num = Number(value || 0);
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export function getDemoEstimate(answers, batteryVoltage, extraItems = [], removedItems = [], order, options = {}) {
  const pricing = getPricing();
  const lr = Math.round(parseFloat(pricing.laborRate || '120') * 100) / 100;
  const serviceCallFee = Math.round(parseFloat(pricing.serviceCallFee || '49') * 100) / 100;
  const hookUpFee = Math.round(parseFloat(pricing.hookUpFee || '95') * 100) / 100;

  const serviceType = getOrderServiceType(order);
  let labor = [];
  let parts = [];

  if (serviceType === 'tire_change') {
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
  const providerType = pricing.providerType || 'mobile';
  const feeByDefault = providerType !== 'shop';
  const includeServiceCallFee = options.includeServiceCallFee !== undefined ? options.includeServiceCallFee : feeByDefault;
  const fees = includeServiceCallFee ? [{ label: 'Service Call Fee', amount: serviceCallFee }] : [];
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

export function getEstimateCatalog(type) {
  const lr = Math.round(parseFloat(getPricing().laborRate || '120') * 100) / 100;
  const labor = [
    { type: 'labor', label: 'Battery Replacement', hours: '1.0 hr', amount: Math.round(lr * 1.0 * 100) / 100, category: 'Electrical' },
    { type: 'labor', label: 'Alternator Replacement', hours: '1.2 hr', amount: Math.round(lr * 1.2 * 100) / 100, category: 'Electrical' },
    { type: 'labor', label: 'Starter Replacement', hours: '1.4 hr', amount: Math.round(lr * 1.4 * 100) / 100, category: 'Electrical' },
    { type: 'labor', label: 'Electrical Diagnosis', hours: '0.8 hr', amount: Math.round(lr * 0.8 * 100) / 100, category: 'Diagnostics' },
    { type: 'labor', label: 'Tire Change Labor', hours: '0.6 hr', amount: Math.round(lr * 0.6 * 100) / 100, category: 'Roadside' },
    { type: 'labor', label: 'Brake Inspection', hours: '0.7 hr', amount: Math.round(lr * 0.7 * 100) / 100, category: 'Inspection' },
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
  const fallback = type === 'parts'
    ? { min: 10, max: 250 }
    : { min: 60, max: 180 };
  const matched = ranges.find(range => range.type === type && range.match.some(match => normalizedName.includes(match))) || fallback;
  return { ...matched, warning: amount > matched.max };
}
