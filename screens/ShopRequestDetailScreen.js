import { useState, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authorizedFetch } from '../apiClient';
import * as Haptics from 'expo-haptics';

function pulseTabChange() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
import { getServiceMeta, getVehicleLabel, getProviderIntakeItems, getDiagnosisSchema } from '../utils/serviceUtils';
import { getRecommendedServicesFromDiagnosis, getDemoEstimate, getEstimateCatalog, getEstimatePriceCheck, formatCurrency } from '../utils/estimateUtils';
import { RequestInfoRow } from './RequestDetailScreen';
import { SHOP_JOB_STEPS, API_URL } from '../constants';

export default function ShopRequestDetailScreen({ order, accepting, onBack, onAccept, onSchedule, onDecline, onStepChange, isAccepted, isProposed }) {
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [laborAmt, setLaborAmt] = useState('');
  const [partsAmt, setPartsAmt] = useState('');
  const [estimateNote, setEstimateNote] = useState('');
  const [diagnosisAnswers, setDiagnosisAnswers] = useState({});
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [batteryVoltage, setBatteryVoltage] = useState('');
  const [estimateItems, setEstimateItems] = useState([]);
  const [estimateRemovedItems, setEstimateRemovedItems] = useState([]);
  const [estimatePickerOpen, setEstimatePickerOpen] = useState(false);
  const [estimatePreviewOpen, setEstimatePreviewOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [estimateSentAt, setEstimateSentAt] = useState(null);
  const [estimatePickerMode, setEstimatePickerMode] = useState('labor');
  const [estimateSearch, setEstimateSearch] = useState('');
  const [estimateItemScope, setEstimateItemScope] = useState('required');
  const [customEstimateName, setCustomEstimateName] = useState('');
  const [customEstimateHours, setCustomEstimateHours] = useState('');
  const [customEstimateAmount, setCustomEstimateAmount] = useState('');
  const [arrivedChecklist, setArrivedChecklist] = useState({ photos: false, notes: false });
  const [arrivedChecklistData, setArrivedChecklistData] = useState({ photos: '', notes: '' });
  const [activeChecklistItem, setActiveChecklistItem] = useState(null);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [requiredPhotos, setRequiredPhotos] = useState({});
  const [bottomH, setBottomH] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(192);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const orderId = order.id || order._id;
    if (shopStatus !== 'waiting_approval' || !orderId || String(orderId).startsWith('demo')) return;
    const interval = setInterval(async () => {
      try {
        const res = await authorizedFetch(`${API_URL}/orders/${orderId}`);
        const data = await res.json();
        if (data.status === 'estimate_approved') {
          advanceStep('in_progress');
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [shopStatus]);

  const timerStr = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const serviceMeta  = getServiceMeta(order);
  const displayVehicle = [order.vehicle?.year, order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ') || 'Vehicle';
  const payout      = Number(order.payment?.totalHeld || order.payment?.total || 145);
  const platformFee = Math.max(8, Math.round(payout * 0.1));
  const net         = Math.max(0, payout - platformFee);
  const preferredDateStr = order.scheduledSlotLabel || order.scheduledSlot || 'Tomorrow, 10:00 AM';
  const timeMatch = preferredDateStr.match(/(\d+:\d+\s*[AP]M)/i);
  const preferredTime = timeMatch ? timeMatch[1] : null;
  const preferredDate = timeMatch ? preferredDateStr.replace(/,?\s*\d+:\d+\s*[AP]M/i, '').trim() : preferredDateStr;
  const customerNote = order.orderContext?.customerNote || order.customerNote || null;
  const rawCustomerFiles = order.orderContext?.files || order.files || order.photos || [
    { name: 'Front damage photo', type: 'image' },
    { name: 'Warning light photo', type: 'image' },
    { name: 'Customer note attachment', type: 'file' },
  ];
  const customerFiles = Array.isArray(rawCustomerFiles) ? rawCustomerFiles : [rawCustomerFiles].filter(Boolean);

  const intakeRows = getProviderIntakeItems(order)
    .filter(r => r.value !== undefined && r.value !== null && String(r.value).trim())
    .map((r, i) => ({ key: `ir-${i}`, label: r.label, value: String(r.value) }));

  const shopStatus = order.shopStatus || 'scheduled';
  const STEPPER_STATUS = shopStatus === 'estimate' || shopStatus === 'waiting_approval' ? 'inspection' : shopStatus;
  const shopStepIdx = SHOP_JOB_STEPS.findIndex(s => s.key === STEPPER_STATUS);
  const estimateTotal = (parseFloat(laborAmt) || 0) + (parseFloat(partsAmt) || 0);

  const SHOP_PHOTO_ITEMS = [
    { key: 'front', label: 'Front of vehicle', hint: 'Clear view of front bumper & hood' },
    { key: 'odometer', label: 'Odometer reading', hint: 'Current mileage clearly visible' },
    { key: 'concern', label: 'Area of concern', hint: 'Close-up of the reported issue' },
  ];
  const photosReady = SHOP_PHOTO_ITEMS.every(p => !!requiredPhotos[p.key]);
  const activeChecklistMeta = activeChecklistItem === 'photos'
    ? { title: 'Required Photos', subtitle: 'Add clear photos of the vehicle' }
    : { title: 'Arrival Notes', subtitle: 'Add notes from arrival' };

  const openChecklistItem = (key) => {
    setActiveChecklistItem(key);
    setChecklistDraft(arrivedChecklistData[key] || '');
  };
  const saveChecklistItem = () => {
    if (!activeChecklistItem) return;
    if (activeChecklistItem === 'photos' && !photosReady) return;
    const value = activeChecklistItem === 'photos' ? 'Required photos completed' : checklistDraft.trim() || 'No arrival notes added';
    setArrivedChecklistData(prev => ({ ...prev, [activeChecklistItem]: value }));
    setArrivedChecklist(prev => ({ ...prev, [activeChecklistItem]: true }));
    setActiveChecklistItem(null);
    setChecklistDraft('');
  };
  const takePhoto = (key) => setRequiredPhotos(prev => ({ ...prev, [key]: { uri: `demo-${key}` } }));

  const diagnosisSchema = getDiagnosisSchema(order);
  const recommendedServices = getRecommendedServicesFromDiagnosis(diagnosisAnswers, batteryVoltage, order);
  const setDiagnosisAnswer = (key, value) => setDiagnosisAnswers(prev => ({ ...prev, [key]: value }));

  const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, order);
  const estimateCatalog = getEstimateCatalog(estimatePickerMode);
  const filteredEstimateCatalog = estimateCatalog.filter(item => {
    const q = estimateSearch.trim().toLowerCase();
    return !q || `${item.label} ${item.category || ''}`.toLowerCase().includes(q);
  });
  const customAmount = parseFloat(String(customEstimateAmount || '').replace(',', '.'));
  const customHours  = parseFloat(String(customEstimateHours  || '').replace(',', '.'));
  const customPriceCheck = getEstimatePriceCheck(estimatePickerMode, customEstimateName, customAmount);
  const canAddCustomEstimate = customEstimateName.trim() && Number.isFinite(customAmount) && customAmount > 0
    && (estimatePickerMode === 'parts' || (Number.isFinite(customHours) && customHours > 0));

  const openEstimatePicker = (mode) => {
    setEstimatePickerMode(mode); setEstimateSearch('');
    setEstimateItemScope('required'); setCustomEstimateName('');
    setCustomEstimateHours(''); setCustomEstimateAmount('');
    setEstimatePickerOpen(true);
  };
  const addEstimateItem = (item) => {
    const next = [...estimateItems, { ...item, scope: estimateItemScope, id: `${item.type}-${estimateItemScope}-${item.label}-${Date.now()}` }];
    setEstimateItems(next);
    setEstimatePickerOpen(false);
    setEstimateSearch(''); setEstimateItemScope('required');
    setCustomEstimateName(''); setCustomEstimateHours(''); setCustomEstimateAmount('');
  };
  const addCustomEstimateItem = () => {
    if (!canAddCustomEstimate) return;
    addEstimateItem({ type: estimatePickerMode === 'parts' ? 'parts' : 'labor', label: customEstimateName.trim(),
      hours: estimatePickerMode === 'labor' ? `${customHours.toFixed(1)} hr` : undefined,
      amount: Math.round(customAmount * 100) / 100, category: 'Custom', priceWarning: customPriceCheck.warning });
  };
  const removeEstimateItem = (item) => {
    setEstimateItems(prev => prev.filter(i => i.id !== item.id));
    if (item.source !== 'custom') setEstimateRemovedItems(prev => [...new Set([...prev, item.id])]);
  };
  const sendEstimateToCustomer = () => {
    const now = new Date();
    setEstimateSentAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    advanceStep('waiting_approval', {
      estimateSentAt: now.toISOString(),
      estimate: {
        labor: estimate.laborSubtotal, parts: estimate.partsSubtotal,
        laborSubtotal: estimate.laborSubtotal, partsSubtotal: estimate.partsSubtotal,
        subtotal: estimate.subtotal, tax: estimate.tax, total: estimate.total,
      },
    });
  };

  const advanceStep = (nextStatus, extra = {}) => {
    onStepChange?.(order, nextStatus, extra);
  };

  const sendEstimate = () => {
    advanceStep('awaiting_approval', { estimate: { labor: parseFloat(laborAmt) || 0, parts: parseFloat(partsAmt) || 0, note: estimateNote } });
    setEstimateOpen(false);
    setLaborAmt('');
    setPartsAmt('');
    setEstimateNote('');
  };

  const handleAccept = () => (onAccept ? onAccept(order) : onSchedule?.(order));

  if (approvalOpen || shopStatus === 'waiting_approval') {
    const shopStepIdxApproval = SHOP_JOB_STEPS.findIndex(st => st.key === 'inspection');
    const sentTotal = (estimate.optionalSubtotal || 0) > 0 ? estimate.totalIfApproved : estimate.total;
    const firstName = (order.customer?.name || order.customer_name || 'Customer').split(' ')[0];
    const phone = order.customer?.phone || order.customer_phone;
    const jobNum = order.number || String(order.id || '').slice(-3).padStart(3, '0');
    const acceptedLabel = order.acceptedAt
      ? 'Accepted ' + new Date(order.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date(order.acceptedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : order.appointmentTime || preferredDateStr;
    return (
      <View style={s.shell}>
        <View style={s.approvalHeader}>
          <TouchableOpacity onPress={() => { setApprovalOpen(false); advanceStep('estimate'); }} activeOpacity={0.8} style={s.approvalHeaderBtn}>
            <Ionicons name="chevron-back" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={s.approvalHeaderTextWrap}>
            <Text style={s.approvalHeaderTitle}>Job #{jobNum}</Text>
            <Text style={s.approvalHeaderSub}>{acceptedLabel}</Text>
          </View>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={[s.approvalHeaderBtn, { alignItems: 'flex-end' }]}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={[s.scroll, { backgroundColor: '#FFFFFF' }]}
          contentContainerStyle={s.approvalContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.stepperCard}>
            <ShopStepper steps={SHOP_JOB_STEPS} currentIndex={shopStepIdxApproval} />
          </View>

          <View style={s.approvalHero}>
            <View style={s.approvalClock}>
              <Ionicons name="time" size={34} color="#FFFFFF" />
            </View>
            <Text style={s.approvalTitle}>Waiting Customer Approval</Text>
            <Text style={s.approvalSubtitle}>We've sent the estimate to {firstName}.</Text>
          </View>

          <TouchableOpacity style={s.approvalEstimateCard} activeOpacity={0.86} onPress={() => { pulseTabChange(); setEstimatePreviewOpen(true); }}>
            <View style={s.approvalEstimateTop}>
              <View>
                <Text style={s.approvalCardLabel}>Estimate Sent</Text>
                <Text style={s.approvalAmount}>{formatCurrency(sentTotal)}</Text>
                <Text style={s.approvalSentTime}>{estimateSentAt || 'Sent just now'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8B9098" />
            </View>
            <View style={s.approvalViewRow}>
              <Ionicons name="eye-outline" size={15} color="#5E646D" />
              <Text style={s.approvalViewText}>View Estimate</Text>
            </View>
          </TouchableOpacity>

          <View style={s.approvalNextCard}>
            <Text style={s.approvalNextTitle}>What happens next?</Text>
            <View style={s.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={s.approvalNextText}>{firstName} will review and approve the estimate.</Text>
            </View>
            <View style={s.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={s.approvalNextText}>You'll be notified as soon as we get a response.</Text>
            </View>
            <View style={s.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={s.approvalNextText}>After the customer approves the estimate, you can start the work.</Text>
            </View>
          </View>

          <View style={s.approvalActions}>
            <TouchableOpacity style={s.approvalEditBtn} activeOpacity={0.86} onPress={() => { setApprovalOpen(false); advanceStep('estimate'); }}>
              <Text style={s.approvalEditText}>Edit Estimate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.approvalCallBtn} activeOpacity={0.86} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
              <Text style={s.approvalCallText}>Call Customer</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <Modal visible={estimatePreviewOpen} transparent animationType="fade" onRequestClose={() => setEstimatePreviewOpen(false)}>
          <CustomerEstimatePreview order={order} estimate={estimate} onClose={() => setEstimatePreviewOpen(false)} />
        </Modal>
      </View>
    );
  }

  return (
    <View style={s.shell}>

      {/* ─── Header ─── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={isAccepted && shopStepIdx > 0
            ? () => advanceStep(SHOP_JOB_STEPS[shopStepIdx - 1].key)
            : onBack}
          activeOpacity={0.8}
          style={s.closeBtn}
        >
          <Ionicons name={isAccepted ? 'chevron-back' : 'close'} size={isAccepted ? 26 : 22} color="#17191D" />
        </TouchableOpacity>

        <View style={s.headerMid}>
          {isAccepted ? (
            <>
              <Text style={s.headerTitle}>Job #{order.number || String(order.id || '').slice(-3).padStart(3, '0')}</Text>
              <Text style={[s.headerSub, isProposed && { color: '#D97706' }]}>
                {isProposed ? `Proposed · ${order.appointmentTime || preferredDateStr}` : 'Accepted ' + (order.acceptedAt
                  ? new Date(order.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date(order.acceptedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : order.appointmentTime || preferredDateStr)}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.headerTitle}>Service Request</Text>
              <Text style={s.headerSub}>Review details and respond to the customer</Text>
            </>
          )}
        </View>

        {isAccepted ? (
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={s.closeBtn}>
            <Ionicons name="close" size={20} color="#8B9098" />
          </TouchableOpacity>
        ) : (
          <View style={s.timerBadge}>
            <Text style={s.timerTop}>Respond within</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={13} color="#F97316" />
              <Text style={s.timerVal}>{timerStr}</Text>
            </View>
          </View>
        )}
      </View>

      {/* ─── Scroll ─── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: isAccepted ? 36 : bottomH + 36, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Time card — only for new requests */}
        {!isAccepted && (
          <View style={s.card}>
            <View style={s.timeRow}>
              <View style={s.timeMain}>
                <View style={{ flex: 1 }}>
                  <Text style={s.timeTopLabel}>Customer preferred time</Text>
                  <Text style={s.timeBig}>{preferredDate}</Text>
                  {!!preferredTime && <Text style={s.timeTime}>{preferredTime}</Text>}
                </View>
              </View>
              <View style={s.timeInfoBox}>
                <View style={s.timeInfoHead}>
                  <Ionicons name="information-circle-outline" size={13} color="#2563EB" />
                  <Text style={s.timeInfoBold} numberOfLines={1} adjustsFontSizeToFit>This is a preferred time.</Text>
                </View>
                <Text style={s.timeInfoBody}>You can confirm or suggest another time.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Customer card */}
        {shopStatus !== 'estimate' && (isAccepted ? (
          <View style={s.verifiedCard}>
            <View style={s.verifiedIconCircle}>
              <Text style={s.unlockedInitials}>
                {(order.customer?.name || 'CU').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={s.verifiedInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Text style={s.verifiedTitle} numberOfLines={1}>{order.customer?.name || 'Customer'}</Text>
                <View style={s.ratingPill}>
                  <Ionicons name="star" size={11} color="#FFC107" />
                  <Text style={s.ratingPillText}>4.9</Text>
                </View>
              </View>
              <View style={s.trustedLine}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#2563EB" />
                <Text style={[s.trustedText, { color: '#2563EB', fontSize: 12 }]}>Verified & trusted</Text>
              </View>
            </View>
            <View style={s.unlockedDivider} />
            <View style={s.unlockedActions}>
              <TouchableOpacity style={s.unlockedCallBtn} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={22} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity style={s.unlockedMsgBtn} activeOpacity={0.8}>
                <Ionicons name="chatbox-outline" size={22} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.verifiedCard}>
            <View style={s.verifiedIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#2563EB" />
            </View>
            <View style={s.verifiedInfo}>
              <Text style={s.verifiedTitle} numberOfLines={1}>Verified Customer</Text>
              <View style={s.ratingLine}>
                <Ionicons name="star" size={13} color="#FFC107" />
                <Text style={s.ratingScore}>4.9</Text>
              </View>
              <View style={s.trustedLine}>
                <Ionicons name="shield-checkmark-outline" size={11} color="#2563EB" />
                <Text style={s.trustedText}>Verified & trusted</Text>
              </View>
            </View>
            <View style={s.lockedContact}>
              <Ionicons name="lock-closed-outline" size={18} color="#5E646D" />
              <Text style={s.lockedContactText}>Contact available{'\n'}after acceptance</Text>
            </View>
          </View>
        ))}

        {/* Vehicle + service card */}
        {shopStatus !== 'estimate' && <View style={s.vehicleInfoCard}>
          <View style={s.reqVehicleIcon}>
            <Ionicons name={serviceMeta.icon} size={22} color="#2563EB" />
          </View>
          <View style={s.vehicleInfo}>
            <Text style={s.vehicleName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>{displayVehicle}</Text>
            <Text style={s.vehicleSpec} numberOfLines={1}>
              {[order.vehicle?.color, order.vehicle?.engine, order.vehicle?.mileage ? `${Number(order.vehicle.mileage).toLocaleString()} mi` : null].filter(Boolean).join(' • ') || 'Color pending'}
            </Text>
            <View style={s.vinRow}>
              <Ionicons name="barcode-outline" size={13} color="#2563EB" />
              <Text style={[s.vinText, { color: '#2563EB' }]}>VIN {order.vehicle?.vin || 'pending'}</Text>
            </View>
          </View>
          <View style={s.svcMetaBox}>
            <Text style={s.svcMetaLabel}>Service Type</Text>
            <Text style={s.svcMetaValue} numberOfLines={2}>{serviceMeta.title}</Text>
          </View>
        </View>}

        {/* Shop progress stepper — under vehicle + customer blocks */}
        {isAccepted && !isProposed && (
          <View style={s.stepperCard}>
            <ShopStepper steps={SHOP_JOB_STEPS} currentIndex={shopStepIdx} />
          </View>
        )}

        {/* Before we continue — shown when checked_in */}
        {shopStatus === 'checked_in' ? (
          <View style={s.arrivedSectionCard}>
            <Text style={s.arrivedChecklistTitle}>Before we continue</Text>
            <Text style={s.arrivedChecklistSubtitle}>Let's gather some basic information before diagnosis.</Text>
            <View style={s.arrivedChecklistBox}>
              {[
                { key: 'photos', title: 'Required Photos', subtitle: 'Add clear photos of the vehicle' },
                { key: 'notes', title: 'Arrival Notes', optional: true, subtitle: arrivedChecklistData.notes || 'Add notes from arrival' },
              ].map((item, index) => {
                const checked = arrivedChecklist[item.key];
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.arrivedNextRow, index > 0 && s.arrivedNextRowBorder]}
                    activeOpacity={0.84}
                    onPress={() => openChecklistItem(item.key)}
                  >
                    {!item.optional && (
                      <View style={[s.arrivedCheckCircle, checked && s.arrivedCheckCircleDone]}>
                        {checked && <Ionicons name="checkmark" size={18} color="#FFF" />}
                      </View>
                    )}
                    <View style={s.arrivedNextInfo}>
                      <View style={s.arrivedNextTitleRow}>
                        <Text style={s.arrivedNextTitle}>{item.title}</Text>
                        {item.optional && <Text style={s.arrivedNextOptional}>(optional)</Text>}
                      </View>
                      <Text style={s.arrivedNextSubtitle}>{item.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#8B9098" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : shopStatus === 'inspection' ? (
          /* Diagnosis */
          <>
            <View style={s.diagnosisHeader}>
              <Text style={s.arrivedChecklistTitle}>Inspection</Text>
              <Text style={s.arrivedChecklistSubtitle}>Run basic tests and record your findings.</Text>
            </View>

            <View style={s.diagnosisCard}>
              <Text style={s.diagnosisGroupTitle}>{diagnosisSchema.title}</Text>

              {!!diagnosisSchema.metric && (
                <View style={s.diagnosisMetricRow}>
                  <View style={s.diagnosisMetricLeft}>
                    <Ionicons name={diagnosisSchema.metric.icon || 'speedometer-outline'} size={18} color="#16A34A" />
                    <Text style={s.diagnosisItemTitle}>{diagnosisSchema.metric.label}</Text>
                  </View>
                  <View style={s.diagnosisVoltageInputWrap}>
                    <TextInput
                      style={s.diagnosisVoltageInput}
                      value={batteryVoltage}
                      onChangeText={setBatteryVoltage}
                      placeholder="0.0"
                      placeholderTextColor="#8B9098"
                      keyboardType={diagnosisSchema.metric.keyboardType || 'decimal-pad'}
                    />
                    {!!diagnosisSchema.metric.unit && <Text style={s.diagnosisVoltageUnit}>{diagnosisSchema.metric.unit}</Text>}
                  </View>
                </View>
              )}

              {diagnosisSchema.checks.map(check => (
                <View key={check.key} style={s.diagnosisBlock}>
                  <View style={s.diagnosisMetricLeft}>
                    <Ionicons name={check.icon || 'checkmark-circle-outline'} size={18} color={check.color || '#2563EB'} />
                    <Text style={s.diagnosisItemTitle}>{check.label}</Text>
                  </View>
                  <View style={s.diagnosisOptionRow}>
                    {check.options.map(option => (
                      <DiagnosisOption
                        key={option.value}
                        label={option.label}
                        selected={diagnosisAnswers[check.key] === option.value}
                        onPress={() => setDiagnosisAnswer(check.key, option.value)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <View style={s.diagnosisNotesBlock}>
              <Text style={s.diagnosisNotesLabel}>Technician Notes (optional)</Text>
              <TextInput
                style={s.diagnosisNotesInput}
                value={diagnosisNotes}
                onChangeText={setDiagnosisNotes}
                placeholder="Add diagnosis notes"
                placeholderTextColor="#8B9098"
                multiline
                textAlignVertical="top"
              />
              <Text style={s.diagnosisNotesCount}>{diagnosisNotes.length}/500</Text>
            </View>

            {recommendedServices.length > 0 && (
              <View style={s.recommendedBlock}>
                <Text style={s.recommendedTitle}>Recommended Services</Text>
                <Text style={s.recommendedSubtitle}>Recommendations based on your findings</Text>
                {recommendedServices.map(svc => (
                  <RecommendedServiceItem key={svc} label={svc} />
                ))}
              </View>
            )}
          </>
        ) : shopStatus === 'estimate' ? (
          /* Build Estimate */
          <>
            <View style={s.estimateHeaderRow}>
              <View style={s.estimateHeaderText}>
                <Text style={s.arrivedChecklistTitle}>Build Estimate</Text>
                <Text style={[s.arrivedChecklistSubtitle, { marginBottom: 0 }]}>Add recommended services and parts.</Text>
              </View>
            </View>

            <View style={s.recommendedReminderCard}>
              <View style={s.recommendedReminderIcon}>
                <Ionicons name="bulb-outline" size={18} color="#2563EB" />
              </View>
              <Text style={s.recommendedReminderText}>
                If you find another issue, add it as Recommended. It will appear in the final estimate as an optional repair after customer approval.
              </Text>
            </View>

            <EstimateSection title="Labor" icon="construct-outline" color="#17191D" onAdd={() => openEstimatePicker('labor')}>
              {estimate.labor.map((item, i) => <EstimateLine key={`${item.id}-${i}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
              <EstimateLine label="Labor Subtotal" amount={estimate.laborSubtotal} strong />
            </EstimateSection>

            <EstimateSection title="Parts" icon="cube-outline" color="#16A34A" onAdd={() => openEstimatePicker('parts')}>
              {estimate.parts.map((item, i) => <EstimateLine key={`${item.id}-${i}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
              <EstimateLine label="Parts Subtotal" amount={estimate.partsSubtotal} strong mutedLabel />
            </EstimateSection>

            <EstimateSection title="Fees" icon="cash-outline" color="#7C3AED">
              {estimate.fees.map((item, i) => <EstimateLine key={`${item.label}-${i}`} {...item} />)}
              {estimate.fees.length === 0 && <EstimateLine label="No fees applied" amount={0} mutedLabel />}
            </EstimateSection>

            {(estimate.optionalLabor.length > 0 || estimate.optionalParts.length > 0) && (
              <View style={s.optionalEstimateWrap}>
                <Text style={s.optionalEstimateTitle}>Recommended repairs</Text>
                <Text style={s.optionalEstimateSubtitle}>Additional issues found. Customer approval is separate.</Text>
                {estimate.optionalLabor.length > 0 && (
                  <EstimateSection title="Recommended Labor" icon="construct-outline" color="#F04416" optional>
                    {estimate.optionalLabor.map((item, i) => <EstimateLine key={`${item.id}-${i}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
                    <EstimateLine label="Recommended Labor Subtotal" amount={estimate.optionalLaborSubtotal} strong />
                  </EstimateSection>
                )}
                {estimate.optionalParts.length > 0 && (
                  <EstimateSection title="Recommended Parts" icon="cube-outline" color="#F04416" optional>
                    {estimate.optionalParts.map((item, i) => <EstimateLine key={`${item.id}-${i}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
                    <EstimateLine label="Recommended Parts Subtotal" amount={estimate.optionalPartsSubtotal} strong mutedLabel />
                  </EstimateSection>
                )}
              </View>
            )}

            <View style={s.estimateTotalCard}>
              <EstimateLine label="Required Subtotal" amount={estimate.subtotal} strong />
              <EstimateLine label="Tax (6.75%)" amount={estimate.tax} />
              <EstimateLine label="Required Total" amount={estimate.total} total />
              {estimate.optionalSubtotal > 0 && (
                <>
                  <EstimateLine label="Recommended Add-ons" amount={estimate.optionalSubtotal} strong mutedLabel />
                  <EstimateLine label="Recommended Tax" amount={estimate.optionalTax} />
                  <EstimateLine label="Total if approved" amount={estimate.totalIfApproved} total />
                </>
              )}
            </View>

            <TouchableOpacity style={s.previewEstimateBtn} activeOpacity={0.84} onPress={() => { pulseTabChange(); setEstimatePreviewOpen(true); }}>
              <Ionicons name="eye-outline" size={18} color="#2563EB" />
              <Text style={s.previewEstimateText}>Preview for Customer</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Request Details */
          <View style={s.card}>
            <Text style={s.sectionTitle}>Request Details</Text>

            <TouchableOpacity style={s.noteRow} activeOpacity={(customerNote || customerFiles.length) ? 0.82 : 1} onPress={(customerNote || customerFiles.length) ? () => setNoteOpen(true) : undefined}>
              <View style={[s.detailIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="chatbox-outline" size={15} color="#2563EB" />
              </View>
              <View style={s.noteRowContent}>
                <Text style={s.detailLabel}>Customer Note</Text>
                <Text style={s.notePreview} numberOfLines={1} ellipsizeMode="tail">{customerNote || 'No additional info'}</Text>
              </View>
              {!!(customerNote || customerFiles.length) && <Ionicons name="chevron-forward" size={14} color="#8B9098" />}
            </TouchableOpacity>
            <Sep />
            <DetailRow icon="calendar-outline" iconBg="#F3EEFF" iconColor="#7C3AED" label="Preferred Date & Time" value={preferredDateStr} />
            <Sep />
            <DetailRow icon="time-outline" iconBg="#FFF7ED" iconColor="#F97316" label="Estimated Labor Time" value="60–90 min" />
            <Sep />
            <TouchableOpacity style={s.detailRow} activeOpacity={0.82} onPress={() => setPayoutOpen(o => !o)}>
              <View style={[s.detailIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="cash-outline" size={15} color="#16A34A" />
              </View>
              <Text style={s.detailLabel}>Est. Payout (you'll earn) ⓘ</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.detailValueBold}>${net}</Text>
                <Ionicons name={payoutOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#8B9098" />
              </View>
            </TouchableOpacity>

            {payoutOpen && (
              <View style={s.payoutBreak}>
                <PRow label="Gross payout" value={`$${payout}`} />
                <PRow label="Platform fee" value={`−$${platformFee}`} />
                <View style={s.payoutNetSep} />
                <PRow label="Net earnings" value={`$${net}`} bold green />
              </View>
            )}

            <Sep />
            <View style={s.cancelBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={s.cancelTitle}>Cancellation Fee</Text>
                <Text style={s.cancelSub}>$35 if customer cancels after you accept ⓘ</Text>
              </View>
            </View>
          </View>
        )}

        {/* Step button inside scroll — accepted shop jobs only */}
        {isAccepted && (
          <View style={s.scrollStepBtn}>
            <ShopStepButtons
              shopStatus={shopStatus}
              order={order}
              onSchedule={onSchedule}
              onAdvance={advanceStep}
              onSendEstimate={sendEstimateToCustomer}
              preferredDateStr={preferredDateStr}
              photosReady={arrivedChecklist.photos}
            />
            {shopStatus === 'estimate' && (
              <View style={s.estimateApprovalNote}>
                <Ionicons name="lock-closed-outline" size={14} color="#8B9098" />
                <Text style={s.estimateApprovalText}>Customer approval required to start work</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Customer note modal */}
      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        <View style={s.noteModalOverlay}>
          <TouchableOpacity style={s.noteModalBackdrop} activeOpacity={1} onPress={() => setNoteOpen(false)} />
          <View style={s.noteModalCard}>
            <View style={s.noteModalHeader}>
              <Text style={s.noteModalTitle}>Customer Note</Text>
              <TouchableOpacity style={s.noteCloseBtn} activeOpacity={0.8} onPress={() => setNoteOpen(false)}>
                <Ionicons name="close" size={20} color="#17191D" />
              </TouchableOpacity>
            </View>
            <Text style={s.noteModalText}>{customerNote || 'No additional note from customer.'}</Text>
            {!!customerFiles.length && (
              <View style={s.noteFilesBlock}>
                <Text style={s.noteFilesTitle}>Uploaded files</Text>
                {customerFiles.map((file, index) => {
                  const fileName = typeof file === 'string' ? file : file.name || `Attachment ${index + 1}`;
                  const fileType = typeof file === 'string' ? 'file' : file.type || 'file';
                  const fileIcon = fileType === 'image' || fileType === 'photo' ? 'image-outline' : 'document-attach-outline';
                  return (
                    <View key={`${fileName}-${index}`} style={s.noteFileRow}>
                      <View style={s.noteFileIcon}>
                        <Ionicons name={fileIcon} size={16} color="#F04416" />
                      </View>
                      <Text style={s.noteFileName} numberOfLines={1}>{fileName}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Estimate modal */}
      <Modal visible={estimateOpen} transparent animationType="slide" onRequestClose={() => setEstimateOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.noteModalOverlay}>
            <TouchableOpacity style={s.noteModalBackdrop} activeOpacity={1} onPress={() => setEstimateOpen(false)} />
            <View style={[s.noteModalCard, { paddingBottom: 20 }]}>
              <View style={s.noteModalHeader}>
                <Text style={s.noteModalTitle}>Send Estimate</Text>
                <TouchableOpacity style={s.noteCloseBtn} activeOpacity={0.8} onPress={() => setEstimateOpen(false)}>
                  <Ionicons name="close" size={20} color="#17191D" />
                </TouchableOpacity>
              </View>

              <View style={s.estRow}>
                <View style={[s.detailIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="construct-outline" size={15} color="#2563EB" />
                </View>
                <Text style={s.estLabel}>Labor</Text>
                <View style={s.estInputWrap}>
                  <Text style={s.estCurrency}>$</Text>
                  <TextInput
                    style={s.estInput}
                    value={laborAmt}
                    onChangeText={setLaborAmt}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#C0C4CC"
                  />
                </View>
              </View>
              <View style={s.sep} />

              <View style={s.estRow}>
                <View style={[s.detailIconBox, { backgroundColor: '#F3EEFF' }]}>
                  <Ionicons name="cube-outline" size={15} color="#7C3AED" />
                </View>
                <Text style={s.estLabel}>Parts & Materials</Text>
                <View style={s.estInputWrap}>
                  <Text style={s.estCurrency}>$</Text>
                  <TextInput
                    style={s.estInput}
                    value={partsAmt}
                    onChangeText={setPartsAmt}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#C0C4CC"
                  />
                </View>
              </View>
              <View style={s.sep} />

              <View style={[s.estRow, { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10 }]}>
                <View style={[s.detailIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="cash-outline" size={15} color="#16A34A" />
                </View>
                <Text style={[s.estLabel, { color: '#15803D', fontWeight: '700' }]}>Total</Text>
                <Text style={s.estTotal}>${estimateTotal.toFixed(2)}</Text>
              </View>

              <View style={[s.sep, { marginVertical: 8 }]} />

              <Text style={[s.estLabel, { marginBottom: 6, marginLeft: 2 }]}>Notes to customer</Text>
              <TextInput
                style={s.estNoteInput}
                value={estimateNote}
                onChangeText={setEstimateNote}
                placeholder="Describe the work, parts needed..."
                placeholderTextColor="#C0C4CC"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[s.btnAccept, { marginTop: 14, height: 52, borderRadius: 12 }]}
                onPress={sendEstimate}
                activeOpacity={0.84}
              >
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={s.btnAcceptTitle}>Send Estimate to Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Checklist modal (photos / arrival notes) */}
      <Modal visible={!!activeChecklistItem} transparent animationType="fade" onRequestClose={() => setActiveChecklistItem(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.checklistModalOverlay}>
            <TouchableOpacity style={s.noteModalBackdrop} activeOpacity={1} onPress={() => setActiveChecklistItem(null)} />
            <View style={s.checklistModalCard}>
              <View style={s.noteModalHeader}>
                <Text style={s.noteModalTitle}>{activeChecklistMeta.title}</Text>
                <TouchableOpacity style={s.noteCloseBtn} activeOpacity={0.8} onPress={() => setActiveChecklistItem(null)}>
                  <Ionicons name="close" size={20} color="#17191D" />
                </TouchableOpacity>
              </View>
              <Text style={s.checklistModalSubtitle}>{activeChecklistMeta.subtitle}</Text>

              {activeChecklistItem === 'photos' ? (
                <View style={s.requiredPhotosList}>
                  {SHOP_PHOTO_ITEMS.map(item => {
                    const photo = requiredPhotos[item.key];
                    const checked = !!photo?.uri;
                    return (
                      <View key={item.key} style={s.requiredPhotoRow}>
                        <View style={s.requiredPhotoInfo}>
                          <View style={[s.requiredPhotoCheck, checked && s.requiredPhotoCheckDone]}>
                            {checked && <Ionicons name="checkmark" size={15} color="#FFF" />}
                          </View>
                          <View style={s.requiredPhotoTextWrap}>
                            <Text style={s.requiredPhotoLabel}>{item.label}</Text>
                            {!!item.hint && <Text style={s.requiredPhotoHint}>{item.hint}</Text>}
                            {checked && <Text style={s.requiredPhotoStateDone}>Photo added</Text>}
                          </View>
                        </View>
                        <TouchableOpacity style={[s.addPhotoIconBtn, checked && s.addPhotoBtnDone]} activeOpacity={0.84} onPress={() => takePhoto(item.key)}>
                          <Ionicons name="camera-outline" size={16} color={checked ? '#16A34A' : '#2563EB'} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={s.checklistTextInput}
                  value={checklistDraft}
                  onChangeText={setChecklistDraft}
                  placeholder="Add optional arrival notes"
                  placeholderTextColor="#8B9098"
                  multiline
                  textAlignVertical="top"
                />
              )}

              <TouchableOpacity
                style={[s.checklistSaveBtn, activeChecklistItem === 'photos' && !photosReady && s.checklistSaveBtnDisabled]}
                activeOpacity={(activeChecklistItem === 'photos' && !photosReady) ? 1 : 0.86}
                disabled={activeChecklistItem === 'photos' && !photosReady}
                onPress={saveChecklistItem}
              >
                <Text style={[s.checklistSaveText, activeChecklistItem === 'photos' && !photosReady && s.checklistSaveTextDisabled]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Customer estimate preview modal */}
      <Modal visible={estimatePreviewOpen} transparent animationType="fade" onRequestClose={() => setEstimatePreviewOpen(false)}>
        <CustomerEstimatePreview order={order} estimate={estimate} onClose={() => setEstimatePreviewOpen(false)} />
      </Modal>

      {/* Estimate picker modal */}
      <Modal visible={estimatePickerOpen} transparent animationType="fade" onRequestClose={() => setEstimatePickerOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.estimatePickerOverlay}>
            <TouchableOpacity style={s.noteModalBackdrop} activeOpacity={1} onPress={() => setEstimatePickerOpen(false)} />
            <View style={s.estimatePickerCard}>
              <View style={s.noteModalHeader}>
                <Text style={s.noteModalTitle}>{estimatePickerMode === 'labor' ? 'Add Labor' : 'Add Part'}</Text>
                <TouchableOpacity style={s.noteCloseBtn} activeOpacity={0.8} onPress={() => setEstimatePickerOpen(false)}>
                  <Ionicons name="close" size={20} color="#17191D" />
                </TouchableOpacity>
              </View>

              <View style={s.estimateSearchBox}>
                <Ionicons name="search-outline" size={16} color="#8B9098" />
                <TextInput style={s.estimateSearchInput} value={estimateSearch} onChangeText={setEstimateSearch}
                  placeholder={estimatePickerMode === 'labor' ? 'Search labor' : 'Search parts'} placeholderTextColor="#8B9098" />
              </View>

              <View style={s.estimateScopeControl}>
                {['required', 'optional'].map(scope => {
                  const active = estimateItemScope === scope;
                  return (
                    <TouchableOpacity key={scope} style={[s.estimateScopeBtn, active && s.estimateScopeBtnActive]}
                      activeOpacity={0.84} onPress={() => setEstimateItemScope(scope)}>
                      <Text style={[s.estimateScopeText, active && s.estimateScopeTextActive]}>
                        {scope === 'required' ? 'Required' : 'Recommended'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.customEstimateBox}>
                <Text style={s.customEstimateTitle}>{estimatePickerMode === 'labor' ? 'Custom labor' : 'Custom part'}</Text>
                <TextInput style={s.customEstimateInput} value={customEstimateName} onChangeText={setCustomEstimateName}
                  placeholder={estimatePickerMode === 'labor' ? 'Labor name' : 'Part name'} placeholderTextColor="#8B9098" />
                <View style={s.customEstimateRow}>
                  {estimatePickerMode === 'labor' && (
                    <TextInput style={[s.customEstimateInput, s.customEstimateSmallInput]} value={customEstimateHours}
                      onChangeText={setCustomEstimateHours} placeholder="Hours" placeholderTextColor="#8B9098" keyboardType="decimal-pad" />
                  )}
                  <TextInput style={[s.customEstimateInput, s.customEstimateSmallInput]} value={customEstimateAmount}
                    onChangeText={setCustomEstimateAmount} placeholder={estimatePickerMode === 'labor' ? 'Labor price' : 'Part price'}
                    placeholderTextColor="#8B9098" keyboardType="decimal-pad" />
                </View>
                {!!customPriceCheck.warning && (
                  <View style={s.priceWarningBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#F04416" />
                    <Text style={s.priceWarningText}>Above typical range {formatCurrency(customPriceCheck.min)}–{formatCurrency(customPriceCheck.max)}</Text>
                  </View>
                )}
                <TouchableOpacity style={[s.customEstimateAddBtn, !canAddCustomEstimate && s.checklistSaveBtnDisabled]}
                  activeOpacity={canAddCustomEstimate ? 0.84 : 1} disabled={!canAddCustomEstimate} onPress={addCustomEstimateItem}>
                  <Text style={[s.customEstimateAddText, !canAddCustomEstimate && s.checklistSaveTextDisabled]}>
                    {estimateItemScope === 'optional' ? 'Add Recommended' : 'Add Required'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={s.estimatePickerList} showsVerticalScrollIndicator={false}>
                {filteredEstimateCatalog.map(item => (
                  <TouchableOpacity key={`${item.type}-${item.label}`} style={s.estimatePickerRow} activeOpacity={0.84} onPress={() => addEstimateItem(item)}>
                    <View style={s.estimatePickerRowInfo}>
                      <Text style={s.estimatePickerRowTitle}>{item.label}</Text>
                      <Text style={s.estimatePickerRowMeta}>{estimateItemScope === 'optional' ? 'Recommended — ' : 'Required — '}{item.type === 'labor' ? `${item.hours || '1.0 hr'} labor` : item.category || 'Part'}</Text>
                    </View>
                    <Text style={s.estimatePickerPrice}>{formatCurrency(item.amount)}</Text>
                    <Ionicons name="add-circle-outline" size={21} color="#16A34A" />
                  </TouchableOpacity>
                ))}
                {!filteredEstimateCatalog.length && (
                  <View style={s.estimatePickerEmpty}>
                    <Text style={[s.arrivedNextSubtitle, { textAlign: 'center' }]}>No items found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Bottom panel — hidden for accepted jobs (buttons are in scroll) ─── */}
      {!isAccepted && <View style={s.bottomPanel} onLayout={e => setBottomH(e.nativeEvent.layout.height)}>
        <View style={s.bottomRow}>
          {isProposed ? (
            <>
              <TouchableOpacity style={s.btnDecline} onPress={() => onDecline?.(order)} activeOpacity={0.84}>
                <Text style={s.btnDeclineTitle}>Cancel</Text>
                <Text style={s.btnSub}>Withdraw proposal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSuggest} onPress={() => onSchedule?.(order)} activeOpacity={0.84}>
                <Text style={s.btnSuggestTitle}>{'Change\nProposal'}</Text>
                <Text style={s.btnSub}>Send new time</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnAccept, { backgroundColor: '#D97706' }]} activeOpacity={0.84}>
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text style={s.btnAcceptTitle}>Awaiting</Text>
                <Text style={s.btnAcceptSub}>Customer reviewing</Text>
              </TouchableOpacity>
            </>
          ) : isAccepted ? null : (
            <>
              <TouchableOpacity style={s.btnDecline} onPress={() => onDecline(order)} activeOpacity={0.84}>
                <Text style={s.btnDeclineTitle}>Decline</Text>
                <Text style={s.btnSub}>Not available</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSuggest} onPress={() => onSchedule?.(order)} activeOpacity={0.84}>
                <Text style={s.btnSuggestTitle}>{'Suggest\nAnother Time'}</Text>
                <Text style={s.btnSub}>Propose new options</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnAccept} onPress={handleAccept} disabled={accepting} activeOpacity={0.84}>
                <Text style={s.btnAcceptTitle}>{accepting ? 'Booking…' : 'Accept Request'}</Text>
                <Text style={s.btnAcceptSub}>{'Confirm preferred time\n'}{preferredDateStr}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>}

    </View>
  );
}

/* ─── Small helpers ─── */
function DetailRow({ icon, iconBg, iconColor, label, value }) {
  return (
    <View style={s.detailRow}>
      <View style={[s.detailIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}
function Sep() { return <View style={s.sep} />; }
function PRow({ label, value, bold, green }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={[s.pbLabel, bold && { color: '#17191D', fontWeight: '700' }]}>{label}</Text>
      <Text style={[s.pbValue, green && { color: '#16A34A', fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const SHOP_STEP_ICONS = {
  scheduled:   'calendar-outline',
  checked_in:  'person-add-outline',
  inspection:  'search-outline',
  in_progress: 'construct-outline',
  completed:   'checkmark-done-outline',
};

/* ─── Shop progress stepper ─── */
function ShopStepper({ steps, currentIndex }) {
  return (
    <View style={s.stepperContainer}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent   = index === currentIndex;
        const isFirst     = index === 0;
        const isLast      = index === steps.length - 1;
        const lineColor   = (done) => done ? '#2563EB' : '#E1E4E8';
        return (
          <View key={step.key} style={s.stepperItem}>
            <View style={s.stepperRow}>
              <View style={[s.stepperLineSeg, { backgroundColor: isFirst ? 'transparent' : lineColor(index <= currentIndex) }]} />
              <View style={[s.stepperCircle, isCompleted && s.stepperCircleDone, isCurrent && s.stepperCircleCurrent]}>
                {isCompleted
                  ? <Ionicons name="checkmark" size={13} color="#FFF" />
                  : <Ionicons name={SHOP_STEP_ICONS[step.key] || 'ellipse-outline'} size={13} color={isCurrent ? '#FFF' : '#C0C4CC'} />}
              </View>
              <View style={[s.stepperLineSeg, { backgroundColor: isLast ? 'transparent' : lineColor(index < currentIndex) }]} />
            </View>
            <Text style={[s.stepperLabel, isCompleted && s.stepperLabelDone, isCurrent && s.stepperLabelCurrent]} numberOfLines={1}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ─── Step-based bottom buttons ─── */
function ShopStepButtons({ shopStatus, order, onSchedule, onAdvance, onSendEstimate, preferredDateStr, photosReady }) {
  if (shopStatus === 'scheduled') {
    return (
      <TouchableOpacity style={[s.btnAccept, { flex: 1 }]} onPress={() => onAdvance('checked_in')} activeOpacity={0.84}>
        <Text style={s.btnAcceptTitle}>Check In Customer</Text>
        <Text style={s.btnAcceptSub}>{preferredDateStr}</Text>
      </TouchableOpacity>
    );
  }
  if (shopStatus === 'checked_in') {
    return (
      <TouchableOpacity
        style={[s.btnAccept, { flex: 1 }, !photosReady && s.btnAcceptDisabled]}
        onPress={photosReady ? () => onAdvance('inspection') : undefined}
        activeOpacity={photosReady ? 0.84 : 1}
      >
        <Text style={[s.btnAcceptTitle, !photosReady && { color: '#8B9098' }]}>Start Inspection</Text>
        <Text style={[s.btnAcceptSub, !photosReady && { color: '#8B9098' }]}>
          {photosReady ? 'Begin vehicle diagnosis' : 'Add required photos first'}
        </Text>
      </TouchableOpacity>
    );
  }
  if (shopStatus === 'inspection') {
    return (
      <TouchableOpacity style={[s.btnAccept, { flex: 1 }]} onPress={() => onAdvance('estimate')} activeOpacity={0.84}>
        <Text style={s.btnAcceptTitle}>Continue to Estimate</Text>
        <Text style={s.btnAcceptSub}>Build cost breakdown</Text>
      </TouchableOpacity>
    );
  }
  if (shopStatus === 'estimate') {
    return (
      <TouchableOpacity style={[s.btnAccept, { flex: 1 }]} onPress={onSendEstimate} activeOpacity={0.84}>
        <Text style={s.btnAcceptTitle}>Send Estimate to Customer</Text>
      </TouchableOpacity>
    );
  }
  if (shopStatus === 'in_progress') {
    return (
      <TouchableOpacity style={[s.btnAccept, { flex: 1, backgroundColor: '#16A34A' }]} onPress={() => onAdvance('completed')} activeOpacity={0.84}>
        <Text style={s.btnAcceptTitle}>Mark Complete</Text>
        <Text style={s.btnAcceptSub}>Customer picks up vehicle</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[s.btnAccept, { flex: 1, backgroundColor: '#6B7280' }]} activeOpacity={1} disabled>
      <Text style={s.btnAcceptTitle}>Job Completed</Text>
    </TouchableOpacity>
  );
}

function EstimateSection({ title, icon, color, onAdd, optional, children }) {
  return (
    <View style={[s.estimateCard, optional && s.estimateCardOptional]}>
      <View style={s.estimateSectionHeader}>
        <View style={s.estimateSectionTitleGroup}>
          <View style={[s.estimateSectionIcon, { backgroundColor: color + (optional ? '18' : '14') }]}>
            <Ionicons name={icon} size={17} color={color} />
          </View>
          <Text style={s.estimateSectionTitle}>{title}</Text>
        </View>
        {!!onAdd && (
          <TouchableOpacity style={s.estimateSectionAddBtn} activeOpacity={0.84} onPress={onAdd}>
            <Ionicons name="add" size={18} color="#16A34A" />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function EstimateLine({ label, hours, amount, strong, total, mutedLabel, onRemove, priceWarning }) {
  return (
    <View style={s.estimateLine}>
      <Text style={[s.estimateLineLabel, strong && s.estimateLineStrong, mutedLabel && s.estimateLineMuted]} numberOfLines={1}>{label}</Text>
      {!!priceWarning && <Ionicons name="alert-circle-outline" size={14} color="#F04416" />}
      {!!hours && <Text style={s.estimateLineHours}>{hours}</Text>}
      <Text style={[s.estimateLineAmount, strong && s.estimateLineStrong, total && s.estimateTotalAmount]}>{formatCurrency(amount)}</Text>
      {!!onRemove && (
        <TouchableOpacity style={s.estimateRemoveBtn} activeOpacity={0.84} onPress={onRemove}>
          <Ionicons name="close" size={14} color="#F04416" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function DiagnosisOption({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={[s.diagnosisOption, selected && s.diagnosisOptionSelected]} activeOpacity={0.84} onPress={onPress}>
      <View style={[s.diagnosisRadio, selected && s.diagnosisRadioSelected]}>
        {selected && <Ionicons name="checkmark" size={13} color="#FFF" />}
      </View>
      <Text style={[s.diagnosisOptionText, selected && s.diagnosisOptionTextSelected]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function RecommendedServiceItem({ label }) {
  return (
    <View style={s.recommendedRow}>
      <View style={s.recommendedLeft}>
        <Ionicons name="checkmark" size={16} color="#16A34A" />
        <Text style={s.recommendedRowText}>{label}</Text>
      </View>
      <View style={s.recommendedCheck}>
        <Ionicons name="checkmark" size={13} color="#FFF" />
      </View>
    </View>
  );
}



function CustomerEstimatePreview({ order, estimate, onClose }) {
  const serviceMeta = getServiceMeta(order);
  const vehicle = getVehicleLabel(order);
  const optionalAvailable = estimate.optionalSubtotal > 0;
  return (
    <View style={s.customerEstimateOverlay}>
      <TouchableOpacity style={s.navChoiceBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.customerEstimateCard}>
        <View style={s.customerEstimateHeader}>
          <TouchableOpacity style={s.noteCloseBtn} activeOpacity={0.8} onPress={onClose}>
            <Ionicons name="chevron-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <View style={s.customerEstimateTitleWrap}>
            <Text style={s.customerEstimateTitle}>Estimate</Text>
            <Text style={s.customerEstimateSubtitle}>Job #{order.number || order.id}</Text>
          </View>
          <TouchableOpacity style={s.noteCloseBtn} activeOpacity={0.8} onPress={onClose}>
            <Ionicons name="close" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>
        <ScrollView style={s.customerEstimateScroll} contentContainerStyle={s.customerEstimateContent} showsVerticalScrollIndicator={false}>
          <View style={s.customerEstimateHero}>
            <View style={s.customerEstimateServiceIcon}>
              <Ionicons name={serviceMeta.icon} size={24} color="#F04416" />
            </View>
            <View style={s.customerEstimateHeroInfo}>
              <Text style={s.customerEstimateService} numberOfLines={1}>{serviceMeta.title}</Text>
              <Text style={s.customerEstimateVehicle} numberOfLines={2}>{vehicle}</Text>
              <Text style={s.customerEstimateLocation} numberOfLines={1}>{order.pickup?.address || order.location || 'Service location'}</Text>
            </View>
          </View>
          <View style={s.customerEstimateNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#16A34A" />
            <Text style={s.customerEstimateNoticeText}>Required work is needed to complete this service. Recommended repairs are optional and need separate approval.</Text>
          </View>
          <CustomerPreviewSection title="Required Labor">
            {estimate.labor.map((item, index) => <CustomerPreviewLine key={`required-labor-${item.id}-${index}`} {...item} />)}
          </CustomerPreviewSection>
          <CustomerPreviewSection title="Required Parts">
            {estimate.parts.map((item, index) => <CustomerPreviewLine key={`required-part-${item.id}-${index}`} {...item} />)}
          </CustomerPreviewSection>
          <CustomerPreviewSection title="Fees">
            {estimate.fees.map((item, index) => <CustomerPreviewLine key={`fee-${item.label}-${index}`} {...item} />)}
          </CustomerPreviewSection>
          {optionalAvailable && (
            <>
              {estimate.optionalLabor.length > 0 && (
                <CustomerPreviewSection title="Recommended Labor" optional>
                  {estimate.optionalLabor.map((item, index) => <CustomerPreviewLine key={`optional-labor-${item.id}-${index}`} {...item} />)}
                </CustomerPreviewSection>
              )}
              {estimate.optionalParts.length > 0 && (
                <CustomerPreviewSection title="Recommended Parts" optional>
                  {estimate.optionalParts.map((item, index) => <CustomerPreviewLine key={`optional-part-${item.id}-${index}`} {...item} />)}
                </CustomerPreviewSection>
              )}
            </>
          )}
          <View style={s.customerEstimateTotals}>
            <CustomerPreviewLine label="Required subtotal" amount={estimate.subtotal} strong />
            <CustomerPreviewLine label="Tax" amount={estimate.tax} />
            <CustomerPreviewLine label="Required total" amount={estimate.total} total />
            {optionalAvailable && (
              <>
                <View style={s.customerEstimateDivider} />
                <CustomerPreviewLine label="Optional repairs" amount={estimate.optionalSubtotal} strong />
                <CustomerPreviewLine label="Optional tax" amount={estimate.optionalTax} />
                <CustomerPreviewLine label="Total with recommended repairs" amount={estimate.totalIfApproved} total />
              </>
            )}
          </View>
          <View style={s.customerPreviewOnlyNote}>
            <Ionicons name="eye-outline" size={15} color="#8B9098" />
            <Text style={s.customerPreviewOnlyText}>Preview only. Customer approval happens in the Auterio app.</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function CustomerPreviewSection({ title, optional, children }) {
  return (
    <View style={[s.customerPreviewSection, optional && s.customerPreviewSectionOptional]}>
      <View style={s.customerPreviewSectionHeader}>
        <Text style={s.customerPreviewSectionTitle}>{title}</Text>
        {optional && <Text style={s.customerPreviewOptionalPill}>Optional</Text>}
      </View>
      {children}
    </View>
  );
}

function CustomerPreviewLine({ label, hours, amount, strong, total }) {
  return (
    <View style={s.customerPreviewLine}>
      <View style={s.customerPreviewLineInfo}>
        <Text style={[s.customerPreviewLineLabel, strong && s.customerPreviewLineStrong]} numberOfLines={1}>{label}</Text>
        {!!hours && <Text style={s.customerPreviewLineMeta}>{hours}</Text>}
      </View>
      <Text style={[s.customerPreviewLineAmount, strong && s.customerPreviewLineStrong, total && s.customerPreviewTotalAmount]}>{formatCurrency(amount)}</Text>
    </View>
  );
}

/* ─── Styles ─── */
const CARD = {
  backgroundColor: '#F3F4F5',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#ECEEF0',
};

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#ECEEF0',
    paddingHorizontal: 16, paddingTop: 72, paddingBottom: 16, gap: 12,
  },
  closeBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F4F5',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerMid: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#17191D', fontSize: 19, fontWeight: '700' },
  headerSub: { color: '#8B9098', fontSize: 12, fontWeight: '500', marginTop: 3, textAlign: 'center' },
  timerBadge: {
    backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA',
    paddingHorizontal: 11, paddingVertical: 8, flexShrink: 0, alignItems: 'center',
  },
  timerTop: { color: '#92400E', fontSize: 10, fontWeight: '600' },
  timerVal: { color: '#F97316', fontSize: 17, fontWeight: '800' },

  acceptedHeader: { backgroundColor: '#020C1A' },
  acceptedHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  acceptedBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  acceptedHeaderTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  acceptedTopSection: { backgroundColor: '#020C1A', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10 },
  acceptedJobStatusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(66,212,99,0.08)', borderWidth: 1, borderColor: 'rgba(66,212,99,0.22)', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11 },
  acceptedJobStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  acceptedJobStatusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#42D463' },
  acceptedJobStatusText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  acceptedJobEtaText: { color: '#93C5FD', fontSize: 12, fontWeight: '600' },
  acceptedJobCard: { backgroundColor: '#07182B', borderWidth: 1, borderColor: '#17304E', borderRadius: 13, padding: 13 },
  acceptedCustomerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  acceptedCustomerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E3048', alignItems: 'center', justifyContent: 'center' },
  acceptedCustomerInitials: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  acceptedCustomerInfo: { flex: 1 },
  acceptedCustomerName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 3 },
  acceptedCustomerPhone: { color: '#7A9FCC', fontSize: 12, fontWeight: '500' },
  acceptedCustomerActions: { flexDirection: 'row', gap: 8 },
  acceptedCallBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(66,212,99,0.12)', borderWidth: 1, borderColor: 'rgba(66,212,99,0.3)', alignItems: 'center', justifyContent: 'center' },
  acceptedMsgBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(47,128,255,0.12)', borderWidth: 1, borderColor: 'rgba(47,128,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  acceptedServiceRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  acceptedServiceIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  acceptedServiceInfo: { flex: 1 },
  acceptedServiceType: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 3 },
  acceptedServiceVehicle: { color: '#7A9FCC', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  acceptedServiceAddress: { color: '#5A7FA8', fontSize: 12, fontWeight: '500' },

  unlockedInitials: { color: '#17191D', fontSize: 17, fontWeight: '800' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6E8EB', paddingHorizontal: 7, paddingVertical: 3 },
  ratingPillText: { color: '#17191D', fontSize: 12, fontWeight: '700' },
  unlockedDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#E1E4E8', marginHorizontal: 4 },
  unlockedActions: { flexDirection: 'row', gap: 10, flexShrink: 0 },
  unlockedCallBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  unlockedMsgBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  card: { ...CARD, padding: 14 },

  /* Time card */
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timeMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  timeIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3EEFF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  timeTopLabel: { color: '#8B9098', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  timeBig: { color: '#17191D', fontSize: 18, fontWeight: '800', lineHeight: 22 },
  timeTime: { color: '#5E646D', fontSize: 16, fontWeight: '600', marginTop: 3 },
  timeInfoBox: {
    width: 150, flexShrink: 0, backgroundColor: '#EFF6FF', borderRadius: 10,
    borderWidth: 1, borderColor: '#BFDBFE', padding: 10,
    justifyContent: 'center',
  },
  timeInfoHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  timeInfoBold: { color: '#1D4ED8', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  timeInfoBody: { color: '#374151', fontSize: 10, fontWeight: '500', lineHeight: 14, textAlign: 'center' },

  /* Vehicle card */
  vehicleInfoCard: { height: 84, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  reqVehicleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  vehicleInfo: { flex: 1, minWidth: 0 },
  vehicleName: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', marginBottom: 2, flexShrink: 1 },
  vehicleSpec: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginBottom: 3 },
  vinRow: { flexDirection: 'row', alignItems: 'center' },
  vinText: { color: '#2563EB', fontSize: 11, fontWeight: '600', marginLeft: 3 },
  svcMetaBox: { width: 100, minHeight: 44, borderLeftWidth: 1, borderLeftColor: '#E1E4E8', paddingLeft: 8, justifyContent: 'center', alignItems: 'center' },
  svcMetaLabel: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center', marginBottom: 3 },
  svcMetaValue: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center', flexShrink: 1 },

  /* Verified customer card */
  verifiedCard: { height: 94, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifiedIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  verifiedInfo: { flex: 1, minWidth: 0 },
  verifiedTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', marginBottom: 3 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  ratingScore: { color: '#FFB000', fontSize: 12, lineHeight: 15, fontWeight: '800' },
  trustedLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustedText: { color: '#2563EB', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  lockedContact: { width: 126, minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 7 },
  lockedContactText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', textAlign: 'center' },

  /* Detail rows */
  sectionTitle: { color: '#17191D', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  noteRowContent: { flex: 1 },
  notePreview: { color: '#5E646D', fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 2 },
  detailIconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  detailLabel: { color: '#8B9098', fontSize: 12, fontWeight: '500', flex: 1 },
  detailValue: { color: '#17191D', fontSize: 13, fontWeight: '700' },
  detailValueBold: { color: '#17191D', fontSize: 13, fontWeight: '800' },
  sep: { height: 1, backgroundColor: '#E1E4E8' },

  /* Payout breakdown */
  payoutBreak: {
    backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0',
    padding: 12, marginTop: 4, marginBottom: 8, gap: 7,
  },
  payoutNetSep: { height: 1, backgroundColor: '#E1E4E8', marginVertical: 4 },
  pbLabel: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  pbValue: { color: '#17191D', fontSize: 12, fontWeight: '600' },

  /* Cancel box */
  cancelBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE',
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 8,
  },
  cancelTitle: { color: '#1D4ED8', fontSize: 11, fontWeight: '700', marginBottom: 1 },
  cancelSub: { color: '#374151', fontSize: 10, fontWeight: '500' },

  /* Note modal */
  noteModalOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  noteModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.32)' },
  noteModalCard: { borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 96, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  noteModalHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  noteModalTitle: { color: '#17191D', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  noteCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  noteModalText: { color: '#17191D', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  noteFilesBlock: { borderTopWidth: 1, borderTopColor: '#ECEEF0', paddingTop: 11, gap: 8 },
  noteFilesTitle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  noteFileRow: { minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10 },
  noteFileIcon: { width: 26, height: 26, borderRadius: 7, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  noteFileName: { flex: 1, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '600' },

  /* Shop stepper */
  stepperCard: { ...CARD, padding: 14 },
  stepperContainer: { flexDirection: 'row' },
  stepperItem: { flex: 1, alignItems: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 7 },
  stepperLineSeg: { flex: 1, height: 2 },
  stepperCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E1E4E8', alignItems: 'center', justifyContent: 'center' },
  stepperCircleDone: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  stepperCircleCurrent: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  stepperLabel: { color: '#C0C4CC', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  stepperLabelDone: { color: '#6B7280' },
  stepperLabelCurrent: { color: '#2563EB' },

  /* Before we continue — matches mobile mechanic arrived flow */
  arrivedSectionCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 10 },
  arrivedChecklistTitle: { color: '#17191D', fontSize: 22, lineHeight: 27, fontWeight: '800', marginBottom: 8 },
  arrivedChecklistSubtitle: { color: '#5E646D', fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 14 },
  arrivedChecklistBox: { overflow: 'hidden' },
  arrivedNextRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  arrivedNextRowBorder: { borderTopWidth: 1, borderTopColor: '#ECEEF0' },
  arrivedNextInfo: { flex: 1, minWidth: 0 },
  arrivedNextTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' },
  arrivedNextTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  arrivedNextOptional: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  arrivedNextSubtitle: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  arrivedCheckCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  arrivedCheckCircleDone: { borderColor: '#16A34A', backgroundColor: '#16A34A' },
  /* Checklist modal */
  checklistModalOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  checklistModalCard: { maxHeight: '86%', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  checklistModalSubtitle: { color: '#5E646D', fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 12 },
  checklistTextInput: { minHeight: 132, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', color: '#17191D', fontSize: 13, lineHeight: 18, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  checklistSaveBtn: { height: 50, borderRadius: 9, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  checklistSaveText: { color: '#FFFFFF', fontSize: 15, lineHeight: 19, fontWeight: '800' },
  checklistSaveBtnDisabled: { backgroundColor: '#E6E8EB' },
  checklistSaveTextDisabled: { color: '#8B9098' },
  /* Required photos */
  requiredPhotosList: { marginBottom: 12 },
  requiredPhotoRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9, paddingVertical: 4 },
  requiredPhotoInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  requiredPhotoCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  requiredPhotoCheckDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  requiredPhotoTextWrap: { flex: 1, minWidth: 0 },
  requiredPhotoLabel: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', flexShrink: 1 },
  requiredPhotoHint: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 1 },
  requiredPhotoStateDone: { color: '#16A34A', fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 1 },
  addPhotoIconBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(37,99,235,0.28)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  addPhotoBtnDone: { borderColor: 'rgba(22,163,74,0.26)', backgroundColor: 'rgba(22,163,74,0.08)' },
  /* Disabled button */
  btnAcceptDisabled: { backgroundColor: '#E6E8EB' },

  /* Diagnosis */
  diagnosisHeader: { marginTop: 5, marginBottom: 2 },
  diagnosisCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 12 },
  diagnosisGroupTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '800', marginBottom: 12 },
  diagnosisMetricRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  diagnosisMetricLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  diagnosisItemTitle: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', flexShrink: 1 },
  diagnosisVoltageInputWrap: { width: 86, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 9 },
  diagnosisVoltageInput: { flex: 1, minWidth: 0, color: '#16A34A', fontSize: 14, lineHeight: 18, fontWeight: '800', textAlign: 'right', padding: 0 },
  diagnosisVoltageUnit: { color: '#16A34A', fontSize: 13, lineHeight: 17, fontWeight: '800', marginLeft: 4 },
  diagnosisBlock: { borderTopWidth: 1, borderTopColor: '#E1E4E8', paddingTop: 12, marginTop: 2, marginBottom: 12 },
  diagnosisOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  diagnosisOption: { flex: 1, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  diagnosisOptionSelected: { borderColor: 'rgba(22,163,74,0.34)', backgroundColor: 'rgba(22,163,74,0.08)' },
  diagnosisRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.4, borderColor: '#C5CBD3', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  diagnosisRadioSelected: { borderColor: '#16A34A', backgroundColor: '#16A34A' },
  diagnosisOptionText: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  diagnosisOptionTextSelected: { color: '#16A34A' },
  diagnosisNotesBlock: { marginBottom: 14 },
  diagnosisNotesLabel: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', marginBottom: 7 },
  diagnosisNotesInput: { minHeight: 86, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', color: '#17191D', fontSize: 12, lineHeight: 17, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10 },
  diagnosisNotesCount: { color: '#8B9098', fontSize: 10, lineHeight: 13, fontWeight: '700', textAlign: 'right', marginTop: 4 },
  recommendedBlock: { marginBottom: 14 },
  recommendedTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '800', marginBottom: 3 },
  recommendedSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginBottom: 9 },
  recommendedRow: { minHeight: 42, borderRadius: 8, backgroundColor: 'rgba(22,163,74,0.08)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.16)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 },
  recommendedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  recommendedRowText: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', flexShrink: 1 },
  recommendedCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  /* Build Estimate screen */
  estimateHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginTop: 5 },
  estimateHeaderText: { flex: 1, minWidth: 0 },
  recommendedReminderCard: { minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(37,99,235,0.18)', backgroundColor: 'rgba(37,99,235,0.07)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  recommendedReminderIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(37,99,235,0.16)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recommendedReminderText: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  estimateCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12 },
  estimateCardOptional: { borderColor: 'rgba(240,68,22,0.28)', backgroundColor: 'rgba(240,68,22,0.07)' },
  estimateSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  estimateSectionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  estimateSectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  estimateSectionTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '800', flexShrink: 1 },
  estimateSectionAddBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(22,163,74,0.1)', alignItems: 'center', justifyContent: 'center' },
  estimateLine: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#E1E4E8' },
  estimateLineLabel: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  estimateLineMuted: { color: '#5E646D' },
  estimateLineHours: { width: 52, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'right' },
  estimateLineAmount: { width: 74, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'right' },
  estimateLineStrong: { fontWeight: '900' },
  estimateTotalAmount: { color: '#2563EB', fontSize: 14, fontWeight: '900' },
  estimateRemoveBtn: { width: 22, height: 22, borderRadius: 6, backgroundColor: 'rgba(240,68,22,0.1)', alignItems: 'center', justifyContent: 'center' },
  optionalEstimateWrap: { gap: 8 },
  optionalEstimateTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  optionalEstimateSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  estimateTotalCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', paddingHorizontal: 12, paddingVertical: 8 },
  estimateApprovalNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, marginBottom: 8 },
  estimateApprovalText: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'center' },
  /* Estimate picker modal */
  estimatePickerOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  estimatePickerCard: { maxHeight: '82%', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  estimateSearchBox: { height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, marginBottom: 10 },
  estimateSearchInput: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '600', padding: 0 },
  estimateScopeControl: { height: 40, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', flexDirection: 'row', padding: 3, marginBottom: 10 },
  estimateScopeBtn: { flex: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  estimateScopeBtnActive: { backgroundColor: '#FFFFFF' },
  estimateScopeText: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  estimateScopeTextActive: { color: '#2563EB' },
  customEstimateBox: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, marginBottom: 10 },
  customEstimateTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '800', marginBottom: 8 },
  customEstimateInput: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 0, marginBottom: 8 },
  customEstimateRow: { flexDirection: 'row', gap: 8 },
  customEstimateSmallInput: { flex: 1, minWidth: 0 },
  priceWarningBox: { minHeight: 30, borderRadius: 8, backgroundColor: 'rgba(240,68,22,0.08)', borderWidth: 1, borderColor: 'rgba(240,68,22,0.18)', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, marginBottom: 8 },
  priceWarningText: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '800', flex: 1 },
  customEstimateAddBtn: { height: 40, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  customEstimateAddText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  estimatePickerList: { maxHeight: 360 },
  estimatePickerRow: { minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 8 },
  estimatePickerRowInfo: { flex: 1, minWidth: 0 },
  estimatePickerRowTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '800' },
  estimatePickerRowMeta: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 2 },
  estimatePickerPrice: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '900' },
  estimatePickerEmpty: { minHeight: 110, alignItems: 'center', justifyContent: 'center' },

  /* Waiting approval screen */
  approvalHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 72, backgroundColor: '#FFFFFF' },
  approvalHeaderBtn: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  approvalHeaderTextWrap: { position: 'absolute', left: 72, right: 72, bottom: 10, alignItems: 'center' },
  approvalHeaderTitle: { color: '#17191D', fontSize: 16, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  approvalHeaderSub: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', textAlign: 'center', marginTop: 1 },
  approvalContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 34 },
  stepperCard: { backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', borderRadius: 8, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, marginBottom: 8 },
  approvalHero: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  approvalClock: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#EAB308', borderWidth: 8, borderColor: 'rgba(234,179,8,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  approvalTitle: { color: '#17191D', fontSize: 20, lineHeight: 25, fontWeight: '900', textAlign: 'center' },
  approvalSubtitle: { color: '#5E646D', fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  approvalEstimateCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, marginBottom: 12 },
  approvalEstimateTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  approvalCardLabel: { color: '#17191D', fontSize: 12, lineHeight: 15, fontWeight: '700', marginBottom: 5 },
  approvalAmount: { color: '#17191D', fontSize: 24, lineHeight: 29, fontWeight: '800' },
  approvalSentTime: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', marginTop: 1 },
  approvalViewRow: { borderTopWidth: 1, borderTopColor: '#E1E4E8', flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, marginTop: 9 },
  approvalViewText: { color: '#5E646D', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  approvalNextCard: { marginBottom: 20 },
  approvalNextTitle: { color: '#17191D', fontSize: 17, lineHeight: 22, fontWeight: '900', marginBottom: 12 },
  approvalNextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 10 },
  approvalNextText: { flex: 1, minWidth: 0, color: '#5E646D', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  approvalActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  approvalEditBtn: { flex: 1, height: 54, borderRadius: 10, borderWidth: 1.3, borderColor: 'rgba(47,128,255,0.45)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  approvalEditText: { color: '#2F80FF', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  approvalCallBtn: { flex: 1, height: 54, borderRadius: 10, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  approvalCallText: { color: '#FFFFFF', fontSize: 15, lineHeight: 19, fontWeight: '900' },

  /* Preview for Customer button */
  previewEstimateBtn: { height: 44, borderRadius: 9, borderWidth: 1.2, borderColor: 'rgba(37,99,235,0.45)', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16 },
  previewEstimateText: { color: '#2563EB', fontSize: 12, lineHeight: 16, fontWeight: '800' },

  /* Customer estimate preview modal */
  customerEstimateOverlay: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  navChoiceBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.32)' },
  customerEstimateCard: { height: '92%', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  customerEstimateHeader: { height: 58, borderBottomWidth: 1, borderBottomColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  customerEstimateTitleWrap: { flex: 1, minWidth: 0, alignItems: 'center' },
  customerEstimateTitle: { color: '#17191D', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  customerEstimateSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700', marginTop: 1 },
  customerEstimateScroll: { flex: 1, backgroundColor: '#FFFFFF' },
  customerEstimateContent: { padding: 14, paddingBottom: 22 },
  customerEstimateHero: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, marginBottom: 10 },
  customerEstimateServiceIcon: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  customerEstimateHeroInfo: { flex: 1, minWidth: 0 },
  customerEstimateService: { color: '#17191D', fontSize: 17, lineHeight: 21, fontWeight: '900' },
  customerEstimateVehicle: { color: '#5E646D', fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 2 },
  customerEstimateLocation: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 3 },
  customerEstimateNotice: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(22,163,74,0.18)', backgroundColor: 'rgba(22,163,74,0.08)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 10 },
  customerEstimateNoticeText: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  customerPreviewSection: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  customerPreviewSectionOptional: { borderColor: 'rgba(240,68,22,0.28)', backgroundColor: 'rgba(240,68,22,0.07)' },
  customerPreviewSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  customerPreviewSectionTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  customerPreviewOptionalPill: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '900', borderWidth: 1, borderColor: 'rgba(240,68,22,0.22)', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  customerPreviewLine: { minHeight: 34, borderTopWidth: 1, borderTopColor: '#E1E4E8', flexDirection: 'row', alignItems: 'center', gap: 10 },
  customerPreviewLineInfo: { flex: 1, minWidth: 0 },
  customerPreviewLineLabel: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  customerPreviewLineMeta: { color: '#8B9098', fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 1 },
  customerPreviewLineAmount: { width: 86, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'right' },
  customerPreviewLineStrong: { fontWeight: '900' },
  customerPreviewTotalAmount: { color: '#16A34A', fontSize: 15, lineHeight: 19 },
  customerEstimateTotals: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  customerEstimateDivider: { height: 1, backgroundColor: '#E1E4E8', marginVertical: 6 },
  customerPreviewOnlyNote: { minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
  customerPreviewOnlyText: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },

  /* Estimate modal fields */
  estRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  estLabel: { flex: 1, color: '#8B9098', fontSize: 13, fontWeight: '500' },
  estInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  estCurrency: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  estInput: { minWidth: 70, color: '#17191D', fontSize: 15, fontWeight: '700', textAlign: 'right', padding: 0 },
  estTotal: { color: '#15803D', fontSize: 16, fontWeight: '800' },
  estNoteInput: { backgroundColor: '#F3F4F5', borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 12, paddingVertical: 10, color: '#17191D', fontSize: 13, fontWeight: '500', minHeight: 72, textAlignVertical: 'top' },

  scrollStepBtn: {},

  /* Bottom panel */
  bottomPanel: {
    position: 'absolute', left: 10, right: 10, bottom: 22,
    backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#E4E6EA',
    padding: 10,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 14,
  },
  bottomRow: { flexDirection: 'row', gap: 8 },

  btnDecline: {
    flex: 1, height: 66, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDeclineTitle: { color: '#17191D', fontSize: 14, fontWeight: '700' },

  btnSuggest: {
    flex: 1.1, height: 66, borderRadius: 12, borderWidth: 1.5, borderColor: '#BFDBFE',
    alignItems: 'center', justifyContent: 'center', gap: 1,
  },
  btnSuggestTitle: { color: '#2563EB', fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 15, marginTop: 2 },

  btnSub: { color: '#8B9098', fontSize: 10, fontWeight: '500', textAlign: 'center', marginTop: 1 },

  btnAccept: {
    flex: 1.7, height: 66, borderRadius: 12, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  btnAcceptTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  btnAcceptTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  btnAcceptSub: { color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '500', textAlign: 'center', lineHeight: 13 },
});
