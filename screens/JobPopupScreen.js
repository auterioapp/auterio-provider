import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Share, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView, PanGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { RequestInfoRow } from './RequestDetailScreen';
import { JobStepper } from './JobDetailScreen';
import { useProvider } from '../ProviderContext';
import styles from '../appStyles';
import { fetchJson } from '../jobApiClient';
import { pulseTabChange } from '../utils/haptics';
import { API_URL, JOB_STEPS } from '../constants';
import { getJobProgressIndex } from '../utils/jobUtils';
import { formatMoney, getServiceMeta, getServiceFlowSchema, getDiagnosisSchema, getProviderIntakeItems, isTowingService, getDropoffAddress, getVehicleVin, getCustomerComplaintItems, getAcceptedAtLabel, getVehicleDisplayParts, hasKnownVin, stripCountryFromAddress, getArrivedAtLabel } from '../utils/serviceUtils';
import { getRecommendedServicesFromDiagnosis, getDemoEstimate, getEstimateCatalog, getEstimatePriceCheck, sumAmounts, formatCurrency, getInvoiceData } from '../utils/estimateUtils';
import { loadPricing } from '../utils/pricingStore';

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function JobPopupScreen({ job, workflow = {}, onWorkflowChange, onBack, onCancel, refreshControl, providerLiveCoord }) {
  const serviceMeta = getServiceMeta(job);
  const [noteOpen, setNoteOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(workflow.stage === 'route');

  // While en route, periodically push the provider's live GPS position to the
  // backend (order.tracking.providerLatitude/Longitude) so the customer's app can
  // compute a real distance-based ETA instead of a static dispatch estimate.
  useEffect(() => {
    if (!routeOpen) return;
    let cancelled = false;
    const sendLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const position = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        onWorkflowChange?.({
          stage: 'route',
          providerLocation: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        });
      } catch (error) {
        console.log('Provider location send error:', error.message);
      }
    };
    sendLocation();
    const interval = setInterval(sendLocation, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [routeOpen]);
  const [arrivedOpen, setArrivedOpen] = useState(workflow.stage === 'arrived');
  const [diagnosisOpen, setDiagnosisOpen] = useState(workflow.stage === 'diagnosis');
  const [estimateOpen, setEstimateOpen] = useState(workflow.stage === 'estimate');
  const [approvalOpen, setApprovalOpen] = useState(workflow.stage === 'approval');
  const [estimateDeclinedOpen, setEstimateDeclinedOpen] = useState(workflow.stage === 'estimate_declined');
  const [workOpen, setWorkOpen] = useState(workflow.stage === 'working');
  const [completeOpen, setCompleteOpen] = useState(workflow.stage === 'complete_review' || workflow.stage === 'invoice');
  const [estimateItems, setEstimateItems] = useState(workflow.estimateItems || []);
  const [estimateRemovedItems, setEstimateRemovedItems] = useState(workflow.estimateRemovedItems || []);
  const [estimatePickerOpen, setEstimatePickerOpen] = useState(false);
  const [estimatePickerMode, setEstimatePickerMode] = useState('labor');
  const [estimateItemScope, setEstimateItemScope] = useState('required');
  const [estimatePreviewOpen, setEstimatePreviewOpen] = useState(false);
  const [completeInvoicePreviewOpen, setCompleteInvoicePreviewOpen] = useState(false);
  const [completedInvoicePreviewOpen, setCompletedInvoicePreviewOpen] = useState(false);
  const [completedServiceDetailsOpen, setCompletedServiceDetailsOpen] = useState(false);
  const [customerProfileOpen, setCustomerProfileOpen] = useState(false);
  const [jobActionsOpen, setJobActionsOpen] = useState(false);
  const [customerStats, setCustomerStats] = useState(null);
  const [customerStatsLoading, setCustomerStatsLoading] = useState(false);
  const cpPanX = useRef(new Animated.Value(0)).current;
  const openCustomerProfile = () => {
    cpPanX.setValue(Dimensions.get('window').width);
    setCustomerProfileOpen(true);
    const customerId = job.customer?.id;
    if (!customerId) { setCustomerStats(null); return; }
    setCustomerStatsLoading(true);
    fetchJson(`${API_URL}/orders/customer-stats/${customerId}`)
      .then(setCustomerStats)
      .catch(() => setCustomerStats(null))
      .finally(() => setCustomerStatsLoading(false));
  };
  const closeCustomerProfile = (velocity = 1200) => {
    Animated.spring(cpPanX, {
      toValue: Dimensions.get('window').width,
      velocity,
      bounciness: 0,
      useNativeDriver: true,
    }).start(() => {
      setCustomerProfileOpen(false);
      cpPanX.setValue(0);
    });
  };
  const onCpGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: cpPanX } }],
    { useNativeDriver: true }
  );
  const onCpHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === GestureState.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;
      if (translationX > 90 || velocityX > 700) {
        closeCustomerProfile(Math.max(velocityX, 1200));
      } else {
        Animated.spring(cpPanX, { toValue: 0, velocity: velocityX, useNativeDriver: true, bounciness: 0 }).start();
      }
    }
  };
  const [estimateSearch, setEstimateSearch] = useState('');
  const [customEstimateName, setCustomEstimateName] = useState('');
  const [customEstimateHours, setCustomEstimateHours] = useState('');
  const [customEstimateAmount, setCustomEstimateAmount] = useState('');
  const [additionalApprovals, setAdditionalApprovals] = useState((job.additionalApprovals || workflow.additionalApprovals || []).filter(item => item.kind === 'required'));
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeRequestName, setChangeRequestName] = useState('');
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [changeRequestAmount, setChangeRequestAmount] = useState('');
  const [changeRequestEvidence, setChangeRequestEvidence] = useState('');
  const [workPhotos, setWorkPhotos] = useState(workflow.workPhotos || ['Old battery', 'New battery', 'System test']);
  const [workSummary, setWorkSummary] = useState(workflow.workSummary || 'Replaced old battery with new Group 35 battery.\nSystem tested. Vehicle starts normally.');
  const [workCustomerNote, setWorkCustomerNote] = useState(workflow.workCustomerNote || 'Thanks for choosing our service!');
  const [diagnosisAnswers, setDiagnosisAnswers] = useState(workflow.diagnosisAnswers || {
    jumpStart: 'started',
    alternator: 'failed',
    loadTest: 'weak',
  });
  const [batteryVoltage, setBatteryVoltage] = useState(workflow.batteryVoltage || '');
  const [includeCallFee, setIncludeCallFee] = useState(true);
  const [providerTypeCached, setProviderTypeCached] = useState('mobile');
  const [workTimer, setWorkTimer] = useState(0);
  const addWorkPhoto = () => {
    pulseTabChange();
    const nextPhotos = [...workPhotos, `Repair photo ${workPhotos.length + 1}`];
    setWorkPhotos(nextPhotos);
    onWorkflowChange?.({ stage: completeOpen ? 'complete_review' : 'working', workPhotos: nextPhotos, workSummary, workCustomerNote, additionalApprovals });
  };
  const updateWorkSummary = (value) => {
    setWorkSummary(value);
    onWorkflowChange?.({ stage: completeOpen ? 'complete_review' : 'working', workSummary: value, workCustomerNote, workPhotos, additionalApprovals });
  };
  useEffect(() => { loadPricing().then(p => { const t = p.providerType || 'mobile'; setProviderTypeCached(t); setIncludeCallFee(t !== 'shop'); }); }, []);
  useEffect(() => {
    if (!workOpen) return;
    const approvedAt = job.estimateApprovedAt ?? workflow.estimateApprovedAt;
    const startTs = approvedAt && !isNaN(new Date(approvedAt).getTime())
      ? new Date(approvedAt).getTime()
      : Date.now();
    const tick = () => setWorkTimer(Math.floor((Date.now() - startTs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [workOpen, job.estimateApprovedAt, workflow.estimateApprovedAt]);
  const formatWorkTimer = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  useEffect(() => {
    if (!workOpen || !job.id) return;
    const interval = setInterval(async () => {
      try {
        const order = await fetchJson(`${API_URL}/orders/${job.id}`);
        const liveApprovals = order?.orderContext?.additionalApprovals;
        if (!Array.isArray(liveApprovals)) return;
        setAdditionalApprovals(prev => {
          const hasChange = liveApprovals.some(live => {
            const local = prev.find(p => p.id === live.id);
            return local && local.status !== live.status;
          });
          return hasChange ? liveApprovals.filter(item => item.kind === 'required') : prev;
        });
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [workOpen, job.id]);

  useEffect(() => {
    if (!approvalOpen || !job.id) return;
    const interval = setInterval(async () => {
      try {
        const order = await fetchJson(`${API_URL}/orders/${job.id}`);
        const step = order?.tracking?.currentStep;
        if (step === 'estimate_approved') {
          clearInterval(interval);
          setApprovalOpen(false);
          setWorkOpen(true);
          onWorkflowChange?.({
            stage: 'working',
            estimateItems,
            estimateRemovedItems,
            estimateApprovedAt: order?.orderContext?.estimateApprovedAt || 'Approved just now',
            approveOptional: order?.orderContext?.approveOptional ?? false,
            approvedTotal: order?.orderContext?.approvedTotal ?? null,
            additionalApprovals,
          });
        } else if (step === 'estimate_declined') {
          clearInterval(interval);
          setApprovalOpen(false);
          setEstimateDeclinedOpen(true);
          onWorkflowChange?.({ stage: 'estimate_declined', declineReason: order?.orderContext?.declineReason });
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [approvalOpen]);
  const [diagnosisNotes, setDiagnosisNotes] = useState(workflow.diagnosisNotes || '');
  const [arrivedChecklist, setArrivedChecklist] = useState(workflow.arrivedChecklist || {
    photos: false,
    complaint: false,
    notes: false,
  });
  const [arrivedChecklistData, setArrivedChecklistData] = useState(workflow.arrivedChecklistData || {
    photos: '',
    complaint: '',
    notes: '',
  });
  const [complaintConfirmations, setComplaintConfirmations] = useState(workflow.complaintConfirmations || {});
  const [requiredPhotos, setRequiredPhotos] = useState(workflow.requiredPhotos || {
    front: null,
    vin: null,
    odometer: null,
    problem: null,
  });
  const [activeChecklistItem, setActiveChecklistItem] = useState(null);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [navigationChoiceOpen, setNavigationChoiceOpen] = useState(false);
  const currentStepIndex = getJobProgressIndex(job.status);
  const isCompleted = job.status === 'completed' || workflow.stage === 'completed';
  const address = stripCountryFromAddress(job.pickup?.address) || 'Location pending';
  const isTowing = isTowingService(job);
  const dropoffAddress = getDropoffAddress(job);
  const customerMapCoord = (job.pickup?.latitude != null && job.pickup?.longitude != null)
    ? { latitude: Number(job.pickup.latitude), longitude: Number(job.pickup.longitude) }
    : null;
  const providerMapCoord = (job.tracking?.providerLatitude != null && job.tracking?.providerLongitude != null)
    ? { latitude: Number(job.tracking.providerLatitude), longitude: Number(job.tracking.providerLongitude) }
    : providerLiveCoord;
  const liveDistanceMi = (customerMapCoord && providerMapCoord)
    ? haversineMiles(providerMapCoord.latitude, providerMapCoord.longitude, customerMapCoord.latitude, customerMapCoord.longitude)
    : null;
  const liveEta = liveDistanceMi != null
    ? `${Math.round(liveDistanceMi * 4)} min`
    : null;
  const mapPoints = [customerMapCoord, providerMapCoord].filter(Boolean);
  const jobMapRegion = mapPoints.length ? (() => {
    const lats = mapPoints.map(p => p.latitude);
    const lngs = mapPoints.map(p => p.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.8),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.8),
    };
  })() : null;
  const vin = getVehicleVin(job);
  const hasVin = hasKnownVin(job);
  const vehicleDisplayParts = getVehicleDisplayParts(job);
  const phone = job.customer?.phone || '';
  const customerNote = job.customerNote || 'No note provided';
  const acceptedLabel = getAcceptedAtLabel(job);
  const arrivedAtLabel = getArrivedAtLabel(job);
  const jobDuration = (() => {
    const start = job.acceptedAt ? new Date(job.acceptedAt).getTime() : null;
    const end = job.completedAt && job.completedAt !== 'Completed just now' ? new Date(job.completedAt).getTime() : Date.now();
    if (!start || isNaN(start)) return null;
    const mins = Math.round((end - start) / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  })();
  const customerFirstName = (job.customer?.name || 'customer').split(' ')[0] || 'customer';
  const rawCustomerFiles = job.orderContext?.files || job.files || job.photos || [];
  const customerFiles = Array.isArray(rawCustomerFiles) ? rawCustomerFiles : [rawCustomerFiles].filter(Boolean);
  const intakeRows = getProviderIntakeItems(job)
    .filter(item => item.value !== undefined && item.value !== null && String(item.value).trim())
    .map((item, index) => ({
      key: `intake-${item.key || index}`,
      icon: 'help-circle-outline',
      color: '#F04416',
      label: item.label,
      value: String(item.value),
    }));
  const locationDetailRows = [
    { key: 'pickup', icon: 'location-outline', color: '#7C3AED', label: isTowing ? 'Pickup Location' : 'Service Location', value: address },
    ...(isTowing ? [{ key: 'dropoff', icon: 'flag-outline', color: '#EF4444', label: 'Drop-off Location', value: dropoffAddress }] : []),
    ...(!isCompleted ? [
      { key: 'distance', icon: 'trail-sign-outline', color: '#42D463', label: 'Distance', value: liveDistanceMi != null ? `${liveDistanceMi.toFixed(1)} mi away` : (job.distance || '—') },
      { key: 'payout', icon: 'cash-outline', color: '#EAB308', label: 'Est. Payout', value: formatCurrency(job.payment?.total || 0) },
    ] : []),
  ];
  const openNavigationApp = async (provider) => {
    const destination = encodeURIComponent(address);
    const urls = {
      google: {
        app: `comgooglemaps://?daddr=${destination}&directionsmode=driving`,
        web: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
      },
      apple: {
        app: `maps://?daddr=${destination}&dirflg=d`,
        web: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
      },
      waze: {
        app: `waze://?q=${destination}&navigate=yes`,
        web: `https://waze.com/ul?q=${destination}&navigate=yes`,
      },
    };
    const target = urls[provider] || urls.google;
    setNavigationChoiceOpen(false);
    const canOpenApp = await Linking.canOpenURL(target.app);
    Linking.openURL(canOpenApp ? target.app : target.web);
  };

  if (estimateOpen) {
    const workingIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'inspection'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job, { includeServiceCallFee: includeCallFee });
    const estimateCatalog = getEstimateCatalog(estimatePickerMode);
    const filteredEstimateCatalog = estimateCatalog.filter(item => {
      const query = estimateSearch.trim().toLowerCase();
      if (!query) return true;
      return `${item.label} ${item.category || ''}`.toLowerCase().includes(query);
    });
    const openEstimatePicker = (mode = 'labor') => {
      pulseTabChange();
      setEstimatePickerMode(mode);
      setEstimateSearch('');
      setEstimateItemScope('required');
      setCustomEstimateName('');
      setCustomEstimateHours('');
      setCustomEstimateAmount('');
      setEstimatePickerOpen(true);
    };
    const addEstimateItem = (item) => {
      pulseTabChange();
      const nextItems = [...estimateItems, { ...item, scope: estimateItemScope, id: `${item.type}-${estimateItemScope}-${item.label}-${Date.now()}` }];
      setEstimateItems(nextItems);
      onWorkflowChange?.({ stage: 'estimate', estimateItems: nextItems, estimateRemovedItems });
      setCustomEstimateName('');
      setCustomEstimateHours('');
      setCustomEstimateAmount('');
    };
    const findAddedCatalogItem = (item) => estimateItems.find(
      added => added.type === item.type && added.label === item.label && added.scope === estimateItemScope
    );
    const customAmount = Number.parseFloat(String(customEstimateAmount || '').replace(',', '.'));
    const customHours = Number.parseFloat(String(customEstimateHours || '').replace(',', '.'));
    const customPriceCheck = getEstimatePriceCheck(estimatePickerMode, customEstimateName, customAmount);
    const canAddCustomEstimate = customEstimateName.trim()
      && Number.isFinite(customAmount)
      && customAmount > 0
      && (estimatePickerMode === 'parts' || (Number.isFinite(customHours) && customHours > 0));
    const addCustomEstimateItem = () => {
      if (!canAddCustomEstimate) return;
      addEstimateItem({
        type: estimatePickerMode === 'parts' ? 'parts' : 'labor',
        label: customEstimateName.trim(),
        hours: estimatePickerMode === 'labor' ? `${customHours.toFixed(1)} hr` : undefined,
        amount: Math.round(customAmount * 100) / 100,
        category: 'Custom',
        priceWarning: customPriceCheck.warning,
      });
    };
    const removeEstimateItem = (item) => {
      pulseTabChange();
      const nextItems = estimateItems.filter(current => current.id !== item.id);
      const nextRemovedItems = item.source === 'custom'
        ? estimateRemovedItems
        : [...new Set([...estimateRemovedItems, item.id])];
      setEstimateItems(nextItems);
      setEstimateRemovedItems(nextRemovedItems);
      onWorkflowChange?.({ stage: 'estimate', estimateItems: nextItems, estimateRemovedItems: nextRemovedItems });
    };
    const sendEstimateToCustomer = () => {
      pulseTabChange();
      setEstimateOpen(false);
      setApprovalOpen(true);
      onWorkflowChange?.({
        stage: 'approval',
        estimateItems,
        estimateRemovedItems,
        estimateSentAt: workflow.estimateSentAt || 'Sent just now',
        estimate: {
          labor: estimate.laborSubtotal,
          parts: estimate.partsSubtotal,
          laborItems: estimate.labor,
          partsItems: estimate.parts,
          optionalLabor: estimate.optionalLabor,
          optionalParts: estimate.optionalParts,
          fees: estimate.fees,
          laborSubtotal: estimate.laborSubtotal,
          partsSubtotal: estimate.partsSubtotal,
          subtotal: estimate.subtotal,
          tax: estimate.tax,
          total: estimate.total,
          optionalSubtotal: estimate.optionalSubtotal,
          optionalTax: estimate.optionalTax,
          totalIfApproved: estimate.totalIfApproved,
        },
      });
    };
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
          </View>
          <View style={styles.requestHeaderIconBtn} />
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.estimateContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={workingIndex} />
          </View>

          <View style={styles.estimateHeaderRow}>
            <View style={styles.estimateHeaderText}>
              <Text style={styles.arrivedChecklistTitle}>Build Estimate</Text>
              <Text style={styles.arrivedChecklistSubtitle}>Add recommended services and parts.</Text>
            </View>
          </View>

          <View style={styles.recommendedReminderCard}>
            <View style={styles.recommendedReminderIcon}>
              <Ionicons name="bulb-outline" size={18} color="#F04416" />
            </View>
            <Text style={styles.recommendedReminderText}>
              If you find another issue, add it as Recommended. It will appear in the final estimate as an optional repair after customer approval.
            </Text>
          </View>

          <EstimateSection title="Labor" icon="construct-outline" color="#17191D" onAdd={() => openEstimatePicker('labor')}>
            {estimate.labor.map((item, index) => <EstimateLine key={`${item.id}-${index}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
            <EstimateLine label="Labor Subtotal" amount={estimate.laborSubtotal} strong />
          </EstimateSection>

          <EstimateSection title="Parts" icon="cube-outline" color="#16A34A" onAdd={() => openEstimatePicker('parts')}>
            {estimate.parts.map((item, index) => <EstimateLine key={`${item.id}-${index}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
            <EstimateLine label="Parts Subtotal" amount={estimate.partsSubtotal} strong mutedLabel />
          </EstimateSection>

          <EstimateSection title="Fees" icon="cash-outline" color="#7C3AED">
            {providerTypeCached === 'both' && (
              <View style={styles.callFeeToggleRow}>
                <View style={styles.callFeeToggleInfo}>
                  <Text style={styles.callFeeToggleLabel}>Service Call Fee</Text>
                  <Text style={styles.callFeeToggleSub}>{includeCallFee ? 'Mobile — provider drove to customer' : 'In-shop — no call fee applied'}</Text>
                </View>
                <Switch
                  value={includeCallFee}
                  onValueChange={setIncludeCallFee}
                  trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}
            {estimate.fees.map((item, index) => <EstimateLine key={`${item.label}-${index}`} {...item} />)}
            {estimate.fees.length === 0 && <EstimateLine label="No fees applied" amount={0} mutedLabel />}
          </EstimateSection>

          {(estimate.optionalLabor.length > 0 || estimate.optionalParts.length > 0) && (
            <View style={styles.optionalEstimateWrap}>
              <Text style={styles.optionalEstimateTitle}>Recommended repairs</Text>
              <Text style={styles.optionalEstimateSubtitle}>Additional issues found by the provider. Customer approval is separate.</Text>
              {estimate.optionalLabor.length > 0 && (
                <EstimateSection title="Recommended Labor" icon="construct-outline" color="#F04416" optional>
                  {estimate.optionalLabor.map((item, index) => <EstimateLine key={`${item.id}-${index}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
                  <EstimateLine label="Recommended Labor Subtotal" amount={estimate.optionalLaborSubtotal} strong />
                </EstimateSection>
              )}
              {estimate.optionalParts.length > 0 && (
                <EstimateSection title="Recommended Parts" icon="cube-outline" color="#F04416" optional>
                  {estimate.optionalParts.map((item, index) => <EstimateLine key={`${item.id}-${index}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
                  <EstimateLine label="Recommended Parts Subtotal" amount={estimate.optionalPartsSubtotal} strong mutedLabel />
                </EstimateSection>
              )}
            </View>
          )}

          <View style={styles.estimateTotalCard}>
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

          <TouchableOpacity style={styles.previewEstimateBtn} activeOpacity={0.84} onPress={() => { pulseTabChange(); setEstimatePreviewOpen(true); }}>
            <Ionicons name="eye-outline" size={18} color="#16A34A" />
            <Text style={styles.previewEstimateText}>Preview for Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.startInspectionBtn} activeOpacity={0.86} onPress={sendEstimateToCustomer}>
            <Text style={styles.startInspectionText}>Send Estimate to Customer</Text>
          </TouchableOpacity>

          <View style={styles.estimateApprovalNote}>
            <Ionicons name="lock-closed-outline" size={14} color="#5E646D" />
            <Text style={styles.estimateApprovalText}>Customer approval required to start work</Text>
          </View>
        </ScrollView>

        <Modal visible={estimatePreviewOpen} transparent animationType="fade" onRequestClose={() => setEstimatePreviewOpen(false)}>
          <CustomerEstimatePreview job={job} estimate={estimate} onClose={() => setEstimatePreviewOpen(false)} />
        </Modal>

        <Modal visible={estimatePickerOpen} transparent animationType="fade" onRequestClose={() => setEstimatePickerOpen(false)}>
          <View style={styles.estimatePickerOverlay}>
            <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={() => setEstimatePickerOpen(false)} />
            <View style={styles.estimatePickerCard}>
              <View style={styles.navChoiceHeader}>
                <Text style={styles.navChoiceTitle}>{estimatePickerMode === 'labor' ? 'Add Labor' : 'Add Part'}</Text>
                <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setEstimatePickerOpen(false)}>
                  <Ionicons name="close" size={20} color="#17191D" />
                </TouchableOpacity>
              </View>

              <View style={styles.estimateSearchBox}>
                <Ionicons name="search-outline" size={16} color="#5E646D" />
                <TextInput
                  style={styles.estimateSearchInput}
                  value={estimateSearch}
                  onChangeText={setEstimateSearch}
                  placeholder={estimatePickerMode === 'labor' ? 'Search labor' : 'Search parts'}
                  placeholderTextColor="#5E646D"
                />
              </View>

              <View style={styles.estimateScopeControl}>
                {['required', 'optional'].map(scope => {
                  const active = estimateItemScope === scope;
                  return (
                    <TouchableOpacity
                      key={scope}
                      style={[styles.estimateScopeBtn, active && styles.estimateScopeBtnActive]}
                      activeOpacity={0.84}
                      onPress={() => {
                        pulseTabChange();
                        setEstimateItemScope(scope);
                      }}
                    >
                      <Text style={[styles.estimateScopeText, active && styles.estimateScopeTextActive]}>
                        {scope === 'required' ? 'Required' : 'Recommended'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.customEstimateBox}>
                <Text style={styles.customEstimateTitle}>{estimatePickerMode === 'labor' ? 'Custom labor' : 'Custom part'}</Text>
                <TextInput
                  style={styles.customEstimateInput}
                  value={customEstimateName}
                  onChangeText={setCustomEstimateName}
                  placeholder={estimatePickerMode === 'labor' ? 'Labor name' : 'Part name'}
                  placeholderTextColor="#5E646D"
                />
                <View style={styles.customEstimateRow}>
                  {estimatePickerMode === 'labor' && (
                    <TextInput
                      style={[styles.customEstimateInput, styles.customEstimateSmallInput]}
                      value={customEstimateHours}
                      onChangeText={setCustomEstimateHours}
                      placeholder="Hours"
                      placeholderTextColor="#5E646D"
                      keyboardType="decimal-pad"
                    />
                  )}
                  <TextInput
                    style={[styles.customEstimateInput, styles.customEstimateSmallInput]}
                    value={customEstimateAmount}
                    onChangeText={setCustomEstimateAmount}
                    placeholder={estimatePickerMode === 'labor' ? 'Labor price' : 'Part price'}
                    placeholderTextColor="#5E646D"
                    keyboardType="decimal-pad"
                  />
                </View>
                {!!customPriceCheck.warning && (
                  <View style={styles.priceWarningBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#F04416" />
                    <Text style={styles.priceWarningText}>Above typical range {formatCurrency(customPriceCheck.min)}-{formatCurrency(customPriceCheck.max)}</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.customEstimateAddBtn, !canAddCustomEstimate && styles.startInspectionBtnDisabled]} activeOpacity={canAddCustomEstimate ? 0.84 : 1} disabled={!canAddCustomEstimate} onPress={addCustomEstimateItem}>
                  <Text style={[styles.customEstimateAddText, !canAddCustomEstimate && styles.startInspectionTextDisabled]}>{estimateItemScope === 'optional' ? 'Add Recommended' : 'Add Required'}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.estimatePickerList} showsVerticalScrollIndicator={false}>
                {filteredEstimateCatalog.map(item => {
                  const addedItem = findAddedCatalogItem(item);
                  return (
                    <TouchableOpacity
                      key={`${item.type}-${item.label}`}
                      style={styles.estimatePickerRow}
                      activeOpacity={0.84}
                      onPress={() => (addedItem ? removeEstimateItem(addedItem) : addEstimateItem(item))}
                    >
                      <View style={styles.estimatePickerRowInfo}>
                        <Text style={styles.estimatePickerRowTitle}>{item.label}</Text>
                        <Text style={styles.estimatePickerRowMeta}>{estimateItemScope === 'optional' ? 'Recommended - ' : 'Required - '}{item.type === 'labor' ? `${item.hours || '1.0 hr'} labor` : item.category || 'Part'}</Text>
                      </View>
                      <Text style={styles.estimatePickerPrice}>{formatCurrency(item.amount)}</Text>
                      <Ionicons name={addedItem ? 'close-circle' : 'add-circle-outline'} size={21} color={addedItem ? '#F04416' : '#16A34A'} />
                    </TouchableOpacity>
                  );
                })}
                {!filteredEstimateCatalog.length && (
                  <View style={styles.estimatePickerEmpty}>
                    <Text style={styles.requestEmptyText}>No items found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (estimateDeclinedOpen) {
    const declineReason = workflow.declineReason || 'No reason provided';
    const isShop = providerTypeCached === 'shop';
    const feeLabel = isShop ? 'Diagnostic Fee' : 'Service Call Fee';
    const feeAmount = isShop
      ? formatMoney(job.payment?.dispatchFee || job.payment?.totalHeld || 75)
      : formatMoney(job.payment?.dispatchFee || job.payment?.totalHeld || job.payment?.priceMin || 45);
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="close" size={22} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
          </View>
          <View style={styles.requestHeaderIconBtn} />
        </View>
        <ScrollView style={styles.requestDetailScroll} contentContainerStyle={styles.requestDetailContent} showsVerticalScrollIndicator={false}>
          <View style={styles.declinedNoticeCard}>
            <View style={styles.declinedNoticeIcon}>
              <Ionicons name="close-circle" size={32} color="#DC2626" />
            </View>
            <Text style={styles.declinedNoticeTitle}>Estimate Declined</Text>
            <Text style={styles.declinedNoticeSubtitle}>The customer has declined your estimate.</Text>
          </View>

          <View style={styles.declinedReasonCard}>
            <Text style={styles.declinedReasonLabel}>Reason from customer</Text>
            <Text style={styles.declinedReasonValue}>{declineReason}</Text>
          </View>

          <View style={styles.declinedFeeCard}>
            <View style={styles.declinedFeeRow}>
              <Ionicons name="card-outline" size={18} color="#16A34A" />
              <Text style={styles.declinedFeeLabel}>{feeLabel} charged</Text>
              <Text style={styles.declinedFeeAmount}>{feeAmount}</Text>
            </View>
            <Text style={styles.declinedFeeNote}>
              {isShop
                ? 'The diagnostic fee has been charged to the customer for the inspection performed.'
                : 'The service call fee has been charged to the customer for your time and travel to the location.'}
            </Text>
          </View>

          <Text style={styles.declinedActionsTitle}>What would you like to do?</Text>

          <TouchableOpacity
            style={styles.declinedReviseBtn}
            activeOpacity={0.86}
            onPress={() => {
              setEstimateDeclinedOpen(false);
              setEstimateOpen(true);
              onWorkflowChange?.({ stage: 'estimate', estimateItems, estimateRemovedItems });
            }}
          >
            <Ionicons name="create-outline" size={20} color="#F04416" />
            <Text style={styles.declinedReviseBtnText}>Send Revised Estimate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declinedCloseBtn}
            activeOpacity={0.86}
            onPress={() => {
              fetchJson(`${API_URL}/orders/${job.id}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelledBy: 'provider', reason: 'Customer declined estimate' }),
              }).catch(() => {});
              onBack?.();
            }}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="#5E646D" />
            <Text style={styles.declinedCloseBtnText}>Close Job</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (approvalOpen) {
    const workingIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'inspection'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job);
    const sentTotal = estimate.optionalSubtotal > 0 ? estimate.totalIfApproved : estimate.total;
    const sentLabel = workflow.estimateSentAt || 'Sent just now';
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
          </View>
          <View style={styles.requestHeaderIconBtn} />
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.approvalContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={workingIndex} />
          </View>

          <View style={styles.approvalHero}>
            <View style={styles.approvalClock}>
              <Ionicons name="time" size={34} color="#FFFFFF" />
            </View>
            <Text style={styles.approvalTitle}>Waiting Customer Approval</Text>
            <Text style={styles.approvalSubtitle}>We've sent the estimate to {customerFirstName}.</Text>
          </View>

          <TouchableOpacity style={styles.approvalEstimateCard} activeOpacity={0.86} onPress={() => { pulseTabChange(); setEstimatePreviewOpen(true); }}>
            <View style={styles.approvalEstimateTop}>
              <View>
                <Text style={styles.approvalCardLabel}>Estimate Sent</Text>
                <Text style={styles.approvalAmount}>{formatCurrency(sentTotal)}</Text>
                <Text style={styles.approvalSentTime}>{sentLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#5E646D" />
            </View>
            <View style={styles.approvalViewRow}>
              <Ionicons name="eye-outline" size={15} color="#5E646D" />
              <Text style={styles.approvalViewText}>View Estimate</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.approvalNextCard}>
            <Text style={styles.approvalNextTitle}>What happens next?</Text>
            <View style={styles.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={styles.approvalNextText}>{customerFirstName} will review and approve the estimate.</Text>
            </View>
            <View style={styles.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={styles.approvalNextText}>You'll be notified as soon as we get a response.</Text>
            </View>
            <View style={styles.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={styles.approvalNextText}>After the customer approves the estimate, you can start the work.</Text>
            </View>
          </View>

          <View style={styles.approvalActions}>
            <TouchableOpacity style={styles.approvalEditBtn} activeOpacity={0.86} onPress={() => { pulseTabChange(); setApprovalOpen(false); setEstimateOpen(true); onWorkflowChange?.({ stage: 'estimate' }); }}>
              <Text style={styles.approvalEditText}>Edit Estimate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approvalCallBtn} activeOpacity={0.86} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
              <Text style={styles.approvalCallText}>Call Customer</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <Modal visible={estimatePreviewOpen} transparent animationType="fade" onRequestClose={() => setEstimatePreviewOpen(false)}>
          <CustomerEstimatePreview job={job} estimate={estimate} onClose={() => setEstimatePreviewOpen(false)} />
        </Modal>
      </View>
    );
  }

  if (workOpen) {
    const workingIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'inspection'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job);
    // job.approveOptional/approvedTotal are restored from orderContext in normalizeOrderToJob
    // and are reliable regardless of whether this screen's approvalOpen polling ever ran.
    // workflow.* is ephemeral local state — only trust it if the job-level value is missing.
    const approveOptional = job.approveOptional ?? workflow.approveOptional ?? false;
    const originalTotal = job.approvedTotal ?? workflow.approvedTotal ?? (approveOptional ? estimate.totalIfApproved : estimate.total);
    // Prefer the persisted, actually-sent estimate for the "Full Estimate" preview over the
    // locally recomputed one, which resets whenever diagnosisAnswers/estimateItems aren't restored.
    const persistedEstimate = job.orderContext?.estimate || null;
    const previewEstimate = persistedEstimate ? {
      ...persistedEstimate,
      labor: persistedEstimate.laborItems || [],
      parts: persistedEstimate.partsItems || [],
      fees: persistedEstimate.fees || [],
      optionalLabor: persistedEstimate.optionalLabor || [],
      optionalParts: persistedEstimate.optionalParts || [],
    } : estimate;
    const approvedAdditionalTotal = sumAmounts(additionalApprovals.filter(item => item.status === 'approved'));
    const pendingAdditionalTotal = sumAmounts(additionalApprovals.filter(item => item.status === 'pending'));
    const saveAdditionalApprovals = (nextItems) => {
      setAdditionalApprovals(nextItems);
      onWorkflowChange?.({ stage: 'working', additionalApprovals: nextItems, estimateItems, estimateRemovedItems, workPhotos, workSummary, workCustomerNote });
    };
    const openRequiredChangeRequest = () => {
      pulseTabChange();
      setChangeRequestName('');
      setChangeRequestReason('');
      setChangeRequestAmount('');
      setChangeRequestEvidence('');
      setChangeRequestOpen(true);
    };
    const changeRequestParsedAmount = Number.parseFloat(String(changeRequestAmount || '').replace(',', '.'));
    const canSubmitChangeRequest = changeRequestName.trim()
      && changeRequestReason.trim()
      && Number.isFinite(changeRequestParsedAmount)
      && changeRequestParsedAmount > 0
      && changeRequestEvidence.trim();
    const submitRequiredChangeRequest = () => {
      if (!canSubmitChangeRequest) return;
      pulseTabChange();
      const nextItem = {
        id: `required-change-${Date.now()}`,
        kind: 'required',
        status: 'pending',
        title: changeRequestName.trim(),
        description: changeRequestReason.trim(),
        evidence: changeRequestEvidence.trim(),
        amount: Math.round(changeRequestParsedAmount * 100) / 100,
      };
      saveAdditionalApprovals([...additionalApprovals, nextItem]);
      fetchJson(`${API_URL}/orders/${job.id}/change-request`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', changeRequest: nextItem }),
      }).catch(e => console.log('Change request sync error:', e.message));
      setChangeRequestOpen(false);
    };
    const updateAdditionalApproval = (id, status) => {
      pulseTabChange();
      saveAdditionalApprovals(additionalApprovals.map(item => item.id === id ? { ...item, status } : item));
    };
    const updateWorkCustomerNote = (value) => {
      setWorkCustomerNote(value);
      onWorkflowChange?.({ stage: 'working', workCustomerNote: value, workSummary, workPhotos, additionalApprovals });
    };
    const openCompleteReview = () => {
      pulseTabChange();
      setWorkOpen(false);
      setCompleteOpen(true);
      onWorkflowChange?.({ stage: 'complete_review', workPhotos, workSummary, workCustomerNote, additionalApprovals, estimateItems, estimateRemovedItems });
    };
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>
              {(() => {
                const approvedAt = job.estimateApprovedAt ?? workflow.estimateApprovedAt;
                return approvedAt && !isNaN(new Date(approvedAt).getTime())
                  ? 'Approved ' + new Date(approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date(approvedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : 'Estimate approved';
              })()}
            </Text>
          </View>
          <View style={styles.requestHeaderIconBtn} />
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.workContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={workingIndex} />
          </View>

          <TouchableOpacity style={styles.approvedEstimateCard} activeOpacity={0.84} onPress={() => setEstimatePreviewOpen(true)}>
            <View style={styles.approvedEstimateLeft}>
              <View style={styles.approvedEstimateIconWrap}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.approvedEstimateTitle}>Estimate Approved</Text>
                <Text style={styles.approvedEstimateAmount}>{formatCurrency(originalTotal)}</Text>
              </View>
            </View>
            <View style={styles.approvedEstimateRight}>
              <View style={[styles.approvedEstimateBadge, !approveOptional && styles.approvedEstimateBadgePartial]}>
                <Text style={[styles.approvedEstimateBadgeText, !approveOptional && styles.approvedEstimateBadgeTextPartial]}>
                  {approveOptional ? 'Full Estimate' : 'Required Only'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#5E646D" />
            </View>
          </TouchableOpacity>

          <View style={styles.additionalApprovalCard}>
            <Text style={styles.changeRequestsSectionTitle}>Required change requests</Text>
            <Text style={styles.additionalApprovalSubtitle}>Use this only if the approved repair cannot be completed without an extra required item. Non-urgent recommendations should be saved for a future service.</Text>
            <View style={styles.additionalActionRow}>
              <TouchableOpacity style={styles.additionalRequiredBtn} activeOpacity={0.86} onPress={openRequiredChangeRequest}>
                <Ionicons name="alert-circle-outline" size={17} color="#FFFFFF" />
                <Text style={styles.additionalRequiredText}>Request required change</Text>
              </TouchableOpacity>
            </View>
            {additionalApprovals.length === 0 ? (
              <View style={styles.additionalEmptyBox}>
                <Ionicons name="document-text-outline" size={20} color="#5E646D" />
                <Text style={styles.additionalEmptyText}>No additional approvals yet.</Text>
              </View>
            ) : (
              additionalApprovals.map(item => {
                const isApproved = item.status === 'approved';
                const isDeclined = item.status === 'declined';
                const isPending = item.status === 'pending';
                return (
                  <View key={item.id} style={[styles.crCard, isApproved && styles.crCardApproved, isDeclined && styles.crCardDeclined]}>
                    <View style={styles.crHeader}>
                      <Text style={styles.crTitle}>Additional Work Required</Text>
                      <Text style={[styles.crAmount, isApproved && styles.crAmountApproved, isDeclined && styles.crAmountDeclined]}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                    <View style={styles.crFieldGroup}>
                      <Text style={styles.crFieldLabel}>Work or part needed</Text>
                      <Text style={styles.crSubtitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                    {item.description ? (
                      <View style={styles.crFieldGroup}>
                        <Text style={styles.crFieldLabel}>Why is it required?</Text>
                        <Text style={styles.crDesc}>{item.description}</Text>
                      </View>
                    ) : null}
                    {item.evidence ? (
                      <View style={styles.crFieldGroup}>
                        <Text style={styles.crFieldLabel}>Evidence</Text>
                        <View style={styles.crEvidenceRow}>
                          <Ionicons name="camera-outline" size={13} color="#5E646D" />
                          <Text style={styles.crEvidenceText}>{item.evidence}</Text>
                        </View>
                      </View>
                    ) : null}
                    <View style={[styles.crStatusRow, isApproved && styles.crStatusApproved, isDeclined && styles.crStatusDeclined, isPending && styles.crStatusPending]}>
                      <Ionicons
                        name={isApproved ? 'checkmark-circle' : isDeclined ? 'close-circle' : 'time-outline'}
                        size={14}
                        color={isApproved ? '#16A34A' : isDeclined ? '#DC2626' : '#5E646D'}
                      />
                      <Text style={[styles.crStatusText, isApproved && styles.crStatusTextApproved, isDeclined && styles.crStatusTextDeclined]}>
                        {isApproved ? 'Approved by customer' : isDeclined ? 'Declined by customer' : 'Waiting for customer...'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.repairProgressCard}>
            <View style={styles.repairProgressHeader}>
              <View>
                <Text style={styles.repairProgressTitle}>Repair in Progress</Text>
                <Text style={styles.repairProgressMeta}>Timer</Text>
                <Text style={styles.repairTimer}>{formatWorkTimer(workTimer)}</Text>
              </View>
              <View style={styles.repairLivePill}>
                <View style={styles.repairLiveDot} />
                <Text style={styles.repairLiveText}>In progress</Text>
              </View>
            </View>
          </View>

          <View style={styles.workContactCard}>
            <View style={styles.customerPopupAvatar}>
              <Text style={styles.customerPopupInitials}>{job.customer?.initials || 'CU'}</Text>
            </View>
            <View style={styles.workContactInfo}>
              <Text style={styles.workContactName} numberOfLines={1}>{job.customer?.name || 'Customer'}</Text>
              <Text style={styles.workContactMeta}>Verified & trusted</Text>
            </View>
            <View style={styles.workContactActions}>
              <TouchableOpacity style={styles.workContactBtn} activeOpacity={0.84} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
                <Ionicons name="call-outline" size={18} color="#17191D" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.workContactBtn} activeOpacity={0.84} onPress={() => phone && Linking.openURL(`sms:${phone}`)}>
                <Ionicons name="chatbubble-outline" size={18} color="#17191D" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.repairNoteCard}>
            <Text style={styles.repairFieldLabel}>Customer Note (Optional)</Text>
            <TextInput
              style={styles.repairCustomerNoteInput}
              value={workCustomerNote}
              onChangeText={updateWorkCustomerNote}
              multiline
              placeholder="Add a short note for the customer"
              placeholderTextColor="#5E646D"
            />
          </View>

          <TouchableOpacity style={styles.completeWorkBtn} activeOpacity={0.86} onPress={openCompleteReview}>
            <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
            <Text style={styles.completeWorkText}>Complete Work</Text>
          </TouchableOpacity>

        </ScrollView>

        <Modal visible={estimatePreviewOpen} transparent animationType="fade" onRequestClose={() => setEstimatePreviewOpen(false)}>
          <CustomerEstimatePreview
            job={job}
            estimate={approveOptional ? previewEstimate : { ...previewEstimate, optionalLabor: [], optionalParts: [], optionalSubtotal: 0, optionalTax: 0, totalIfApproved: previewEstimate.total }}
            onClose={() => setEstimatePreviewOpen(false)}
          />
        </Modal>

        <Modal visible={changeRequestOpen} transparent animationType="fade" onRequestClose={() => setChangeRequestOpen(false)}>
          <KeyboardAvoidingView style={styles.checklistKeyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.changeRequestOverlay}>
              <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={() => setChangeRequestOpen(false)} />
              <View style={styles.changeRequestCard}>
                <View style={styles.navChoiceHeader}>
                  <View style={styles.changeRequestHeaderText}>
                    <Text style={styles.navChoiceTitle}>Required Change Request</Text>
                    <Text style={styles.changeRequestSubtitle}>Only use this if the approved repair cannot be completed without it.</Text>
                  </View>
                  <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setChangeRequestOpen(false)}>
                    <Ionicons name="close" size={20} color="#17191D" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.changeRequestLabel}>Work or part needed</Text>
                <TextInput
                  style={styles.changeRequestInput}
                  value={changeRequestName}
                  onChangeText={setChangeRequestName}
                  placeholder="Example: Battery terminal replacement"
                  placeholderTextColor="#5E646D"
                />

                <Text style={styles.changeRequestLabel}>Why is it required?</Text>
                <TextInput
                  style={styles.changeRequestTextArea}
                  value={changeRequestReason}
                  onChangeText={setChangeRequestReason}
                  multiline
                  placeholder="Explain why the approved repair cannot be completed without this change."
                  placeholderTextColor="#5E646D"
                />

                <Text style={styles.changeRequestLabel}>Price</Text>
                <TextInput
                  style={styles.changeRequestInput}
                  value={changeRequestAmount}
                  onChangeText={setChangeRequestAmount}
                  placeholder="64.00"
                  placeholderTextColor="#5E646D"
                  keyboardType="decimal-pad"
                />

                <Text style={styles.changeRequestLabel}>Evidence</Text>
                <TouchableOpacity style={styles.changeRequestEvidenceBox} activeOpacity={0.84} onPress={() => setChangeRequestEvidence('Photo attached: damaged battery terminal')}>
                  <Ionicons name={changeRequestEvidence ? 'checkmark-circle' : 'camera-outline'} size={20} color={changeRequestEvidence ? '#16A34A' : '#F04416'} />
                  <View style={styles.changeRequestEvidenceTextWrap}>
                    <Text style={styles.changeRequestEvidenceTitle}>{changeRequestEvidence ? 'Evidence attached' : 'Add required photo'}</Text>
                    <Text style={styles.changeRequestEvidenceHint}>{changeRequestEvidence || 'Tap to attach a photo or note for the customer.'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.startInspectionBtn, !canSubmitChangeRequest && styles.startInspectionBtnDisabled]} activeOpacity={canSubmitChangeRequest ? 0.86 : 1} disabled={!canSubmitChangeRequest} onPress={submitRequiredChangeRequest}>
                  <Text style={[styles.startInspectionText, !canSubmitChangeRequest && styles.startInspectionTextDisabled]}>Send to Customer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (completeOpen) {
    const completeIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'completed'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job, { includeServiceCallFee: includeCallFee });
    const pendingRequiredChanges = additionalApprovals.filter(item => item.status === 'pending');
    const canSubmitCompletion = pendingRequiredChanges.length === 0;
    const {
      invoiceEstimate, invoiceNumber, paymentMethod, invoiceTax, invoiceSubtotal, finalTotal, approvedRequiredChanges, approveOptional: invoiceApproveOptional,
    } = getInvoiceData(job, workflow, additionalApprovals, estimate);

    const submitCompletion = async () => {
      if (!canSubmitCompletion) return;
      pulseTabChange();
      const startedAt = job?.startedAt ? new Date(job.startedAt) : null;
      const durationMins = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 60000) : null;
      const workDuration = durationMins
        ? (durationMins < 60 ? `${durationMins} min` : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`)
        : null;
      let warranty = { id: '90d', days: 90, miles: 4000 };
      try {
        const wVal = await AsyncStorage.getItem('@warranty_policy');
        if (wVal) warranty = JSON.parse(wVal);
      } catch { }
      onWorkflowChange?.({
        stage: 'completed',
        workPhotos,
        workSummary,
        workCustomerNote,
        additionalApprovals,
        completedAt: 'Completed just now',
        invoiceNumber,
        workDuration,
        warranty,
      });
      onBack?.();
    };

    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>Final review</Text>
          </View>
          <View style={styles.requestHeaderIconBtn} />
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.completeContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={completeIndex} />
          </View>

          <View style={styles.completeHeroCard}>
            <View style={styles.completeHeroIcon}>
              <Ionicons name="clipboard-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.completeHeroInfo}>
              <Text style={styles.completeHeroTitle}>Complete Job</Text>
              <Text style={styles.completeHeroSubtitle}>Review final photos, work summary, approvals, and total before submitting completion.</Text>
            </View>
          </View>

          <View style={styles.completeChecklistCard}>
            <Text style={styles.completeChecklistTitle}>Completion checklist</Text>
            <CompletionCheckRow done={!pendingRequiredChanges.length} title="No pending approvals" detail={pendingRequiredChanges.length ? 'Resolve pending required changes first' : 'All change requests resolved'} />
          </View>

          <View style={styles.repairNoteCard}>
            <Text style={styles.repairFieldLabel}>Work Summary (Optional)</Text>
            <TextInput
              style={styles.repairSummaryInput}
              value={workSummary}
              onChangeText={updateWorkSummary}
              multiline
              placeholder="Describe completed work"
              placeholderTextColor="#5E646D"
            />
            {!!workCustomerNote.trim() && (
              <>
                <View style={styles.customerEstimateDivider} />
                <Text style={styles.repairFieldLabel}>Customer Note</Text>
                <Text style={styles.completeSummaryText}>{workCustomerNote}</Text>
              </>
            )}
          </View>

          <View style={styles.repairNoteCard}>
            <Text style={styles.repairFieldLabel}>Photos (Optional)</Text>
            <View style={styles.completePhotosGrid}>
              {workPhotos.map((photo, index) => (
                <View key={`${photo}-complete-${index}`} style={styles.completePhotoTile}>
                  <Ionicons name={index === 2 ? 'speedometer-outline' : 'image-outline'} size={20} color="#F04416" />
                  <Text style={styles.repairPhotoText} numberOfLines={2}>{photo}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.completePhotoTile} activeOpacity={0.84} onPress={addWorkPhoto}>
                <Ionicons name="add" size={20} color="#5E646D" />
                <Text style={styles.repairPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Compact invoice summary — tap to review the exact invoice the customer sees */}
          <TouchableOpacity style={styles.approvedEstimateCard} activeOpacity={0.84} onPress={() => setCompleteInvoicePreviewOpen(true)}>
            <View style={styles.approvedEstimateLeft}>
              <View style={[styles.approvedEstimateIconWrap, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
                <Ionicons name="document-text-outline" size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.approvedEstimateTitle}>Invoice · {invoiceNumber}</Text>
                <Text style={styles.approvedEstimateAmount}>{formatCurrency(finalTotal)}</Text>
              </View>
            </View>
            <View style={styles.approvedEstimateRight}>
              <Text style={{ color: '#5E646D', fontSize: 11, fontWeight: '700' }}>Review</Text>
              <Ionicons name="chevron-forward" size={16} color="#5E646D" />
            </View>
          </TouchableOpacity>

          {!canSubmitCompletion && (
            <View style={styles.completeBlockedCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#F04416" />
              <Text style={styles.completeBlockedText}>Resolve pending customer approvals before completing this job.</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.completeSubmitBtn, !canSubmitCompletion && styles.startInspectionBtnDisabled]} activeOpacity={canSubmitCompletion ? 0.86 : 1} disabled={!canSubmitCompletion} onPress={submitCompletion}>
            <Text style={[styles.completeSubmitText, !canSubmitCompletion && styles.startInspectionTextDisabled]}>Complete & Collect Payment · {formatCurrency(finalTotal)}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Full invoice preview — exactly what the customer will see, read-only */}
        <InvoicePreviewModal
          visible={completeInvoicePreviewOpen}
          onClose={() => setCompleteInvoicePreviewOpen(false)}
          job={job}
          vin={vin}
          invoiceEstimate={invoiceEstimate}
          invoiceNumber={invoiceNumber}
          invoiceSubtotal={invoiceSubtotal}
          invoiceTax={invoiceTax}
          finalTotal={finalTotal}
          paymentMethod={paymentMethod}
          approvedRequiredChanges={approvedRequiredChanges}
          approveOptional={invoiceApproveOptional}
        />
      </View>
    );
  }

  if (diagnosisOpen) {
    const workingIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'inspection'));
    const diagnosisSchema = getDiagnosisSchema(job);
    const recommendedServices = getRecommendedServicesFromDiagnosis(diagnosisAnswers, batteryVoltage, job);
    const setDiagnosisAnswer = (key, value) => {
      pulseTabChange();
      const nextAnswers = { ...diagnosisAnswers, [key]: value };
      setDiagnosisAnswers(nextAnswers);
      onWorkflowChange?.({ stage: 'diagnosis', diagnosisAnswers: nextAnswers });
    };
    const updateBatteryVoltage = (value) => {
      setBatteryVoltage(value);
      onWorkflowChange?.({ stage: 'diagnosis', batteryVoltage: value });
    };
    const updateDiagnosisNotes = (value) => {
      setDiagnosisNotes(value);
      onWorkflowChange?.({ stage: 'diagnosis', diagnosisNotes: value });
    };
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
          </View>
          <View style={styles.requestHeaderIconBtn} />
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.diagnosisContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={workingIndex} />
          </View>

          <View style={styles.diagnosisHeader}>
            <Text style={styles.arrivedChecklistTitle}>Diagnosis</Text>
            <Text style={styles.arrivedChecklistSubtitle}>Run basic tests and record your findings.</Text>
          </View>

          <View style={styles.diagnosisCard}>
            <Text style={styles.diagnosisGroupTitle}>{diagnosisSchema.title}</Text>

            {!!diagnosisSchema.metric && (
              <View style={styles.diagnosisMetricRow}>
                <View style={styles.diagnosisMetricLeft}>
                  <Ionicons name={diagnosisSchema.metric.icon || 'speedometer-outline'} size={18} color="#16A34A" />
                  <Text style={styles.diagnosisItemTitle}>{diagnosisSchema.metric.label}</Text>
                </View>
                <View style={styles.diagnosisVoltageInputWrap}>
                  <TextInput
                    style={styles.diagnosisVoltageInput}
                    value={batteryVoltage}
                    onChangeText={updateBatteryVoltage}
                    placeholder="0.0"
                    placeholderTextColor="#5E646D"
                    keyboardType={diagnosisSchema.metric.keyboardType || 'default'}
                  />
                  {!!diagnosisSchema.metric.unit && <Text style={styles.diagnosisVoltageUnit}>{diagnosisSchema.metric.unit}</Text>}
                </View>
              </View>
            )}

            {diagnosisSchema.checks.map((check) => (
              <View key={check.key} style={styles.diagnosisBlock}>
                <View style={styles.diagnosisMetricLeft}>
                  <Ionicons name={check.icon || 'checkmark-circle-outline'} size={18} color={check.color || '#F04416'} />
                  <Text style={styles.diagnosisItemTitle}>{check.label}</Text>
                </View>
                <View style={styles.diagnosisOptionRow}>
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

          <View style={styles.diagnosisNotesBlock}>
            <Text style={styles.diagnosisNotesLabel}>Technician Notes (optional)</Text>
            <TextInput
              style={styles.diagnosisNotesInput}
              value={diagnosisNotes}
              onChangeText={updateDiagnosisNotes}
              placeholder="Add diagnosis notes"
              placeholderTextColor="#5E646D"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.diagnosisNotesCount}>{diagnosisNotes.length}/500</Text>
          </View>

          <View style={styles.recommendedBlock}>
            <Text style={styles.recommendedTitle}>Recommended Services</Text>
            <Text style={styles.recommendedSubtitle}>AI-ready recommendations based on your findings</Text>
            {recommendedServices.map(service => (
              <RecommendedService key={service} label={service} />
            ))}
          </View>

          <TouchableOpacity style={styles.startInspectionBtn} activeOpacity={0.86} onPress={() => { setDiagnosisOpen(false); setEstimateOpen(true); onWorkflowChange?.({ stage: 'estimate' }); }}>
            <Text style={styles.startInspectionText}>Continue to Estimate</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (arrivedOpen) {
    const arrivedIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'arrived'));
    const serviceFlow = getServiceFlowSchema(job);
    const checklistItems = [
      { key: 'photos', title: 'Required Photos', subtitle: 'Add clear photos of the vehicle', icon: 'camera-outline', color: '#16A34A' },
      { key: 'notes', title: 'Arrival Notes', optional: true, subtitle: 'Add notes from arrival', icon: 'clipboard-outline', color: '#7C3AED' },
    ];
    const requiredPhotoItems = serviceFlow.requiredPhotos || getServiceFlowSchema({ service: { serviceType: 'mobile_mechanic' } }).requiredPhotos;
    const canContinueDiagnosis = arrivedChecklist.photos;
    const activeChecklistMeta = checklistItems.find(item => item.key === activeChecklistItem);
    const photosReady = requiredPhotoItems.every(item => !!requiredPhotos[item.key]?.uri);
    const customerComplaintItems = getCustomerComplaintItems(job, customerNote);
    const complaintReady = customerComplaintItems.length > 0 && customerComplaintItems.every(item => !!complaintConfirmations[item.key]);
    const canSaveChecklistItem = activeChecklistItem === 'photos' ? photosReady : true;
    const openChecklistItem = (key) => {
      pulseTabChange();
      setActiveChecklistItem(key);
      setChecklistDraft(arrivedChecklistData[key] || '');
    };
    const saveChecklistItem = () => {
      if (!activeChecklistItem || !canSaveChecklistItem) return;
      pulseTabChange();
      const nextValue = activeChecklistItem === 'photos'
        ? 'Required photos completed'
        : checklistDraft.trim() || 'No arrival notes added';
      const nextData = { ...arrivedChecklistData, [activeChecklistItem]: nextValue };
      const nextChecklist = { ...arrivedChecklist, [activeChecklistItem]: true };
      setArrivedChecklistData(nextData);
      setArrivedChecklist(nextChecklist);
      onWorkflowChange?.({ stage: 'arrived', arrivedChecklistData: nextData, arrivedChecklist: nextChecklist });
      setActiveChecklistItem(null);
      setChecklistDraft('');
    };
    const setComplaintDecision = (key, decision) => {
      pulseTabChange();
      const nextConfirmations = { ...complaintConfirmations, [key]: decision };
      setComplaintConfirmations(nextConfirmations);
      onWorkflowChange?.({ stage: 'arrived', complaintConfirmations: nextConfirmations });
    };
    const takeRequiredPhoto = async (key) => {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera access needed', 'Enable camera access in your device settings to add required photos.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        pulseTabChange();
        const nextPhotos = { ...requiredPhotos, [key]: { uri: result.assets[0].uri } };
        setRequiredPhotos(nextPhotos);
        onWorkflowChange?.({ stage: 'arrived', requiredPhotos: nextPhotos });
      } catch (error) {
        console.log('Camera error:', error.message);
      }
    };
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
            {!!arrivedAtLabel && <Text style={styles.jobPopupArrivedText}>{arrivedAtLabel}</Text>}
          </View>
          <View style={styles.requestHeaderIconBtn} />
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.arrivedContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobCustomerCard}>
            <View style={styles.customerPopupAvatar}>
              <Text style={styles.customerPopupInitials}>{job.customer?.initials || 'CU'}</Text>
            </View>
            <View style={styles.customerPopupInfo}>
              <View style={styles.customerNameRatingRow}>
                <Text style={styles.customerPopupName} numberOfLines={1}>{job.customer?.name || 'Customer'}</Text>
              </View>
              <View style={styles.customerTrustedLine}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#F04416" />
                <Text style={styles.customerTrustedText}>Verified & trusted</Text>
              </View>
            </View>
            <View style={styles.customerActionsDivider} />
            <View style={styles.customerPopupActions}>
              <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
                <Ionicons name="call-outline" size={19} color="#F04416" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`sms:${phone}`)}>
                <Ionicons name="chatbox-outline" size={19} color="#F04416" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.vehicleInfoCard}>
            <View style={styles.requestVehicleIcon}>
              <Ionicons name={job.service?.icon || job.icon || 'car-outline'} size={22} color="#F04416" />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceType} numberOfLines={2}>{vehicleDisplayParts.main}{!!vehicleDisplayParts.suffix && <Text style={styles.serviceTypeSuffix}>{vehicleDisplayParts.suffix}</Text>}</Text>
              {hasVin && (
                <View style={[styles.trustedLine, styles.vehicleTrustedLine]}>
                  <Ionicons name="barcode-outline" size={13} color="#F04416" />
                  <Text style={styles.verifiedTrusted} numberOfLines={1}>VIN {vin}</Text>
                </View>
              )}
            </View>
            <View style={styles.vehicleMetaBox}>
              <View style={styles.requestSpecRow}>
                <Text style={styles.requestSpecLabel}>Service Type</Text>
                <Text style={styles.requestSpecValue} numberOfLines={1}>{serviceMeta.title}</Text>
              </View>
            </View>
          </View>

          <View style={styles.requestBriefCard}>
            <RequestInfoRow icon="chatbox-outline" color="#2F80FF" label="Customer Note" value={customerNote} />
          </View>

          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={arrivedIndex} />
          </View>

          <View style={styles.arrivedSectionCard}>
            <Text style={styles.arrivedChecklistTitle}>Before we continue</Text>
            <Text style={styles.arrivedChecklistSubtitle}>Let's gather some basic information before diagnosis.</Text>
            <View style={styles.arrivedChecklistBox}>
              {checklistItems.map((item, index) => {
                const checked = arrivedChecklist[item.key];
                return (
              <TouchableOpacity key={item.key} style={[styles.arrivedNextRow, index > 0 && styles.arrivedNextRowBorder]} activeOpacity={0.84} onPress={() => openChecklistItem(item.key)}>
                {!item.optional && (
                  <View style={[styles.arrivedCheckCircle, checked && styles.arrivedCheckCircleDone]}>
                    {checked && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                  </View>
                )}
                <View style={styles.arrivedNextInfo}>
                  <View style={styles.arrivedNextTitleRow}>
                    <Text style={styles.arrivedNextTitle}>{item.title}</Text>
                    {item.optional && <Text style={styles.arrivedNextOptional}>(optional)</Text>}
                  </View>
                  <Text style={styles.arrivedNextSubtitle} numberOfLines={1}>{arrivedChecklistData[item.key] || item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#5E646D" />
              </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={[styles.startInspectionBtn, !canContinueDiagnosis && styles.startInspectionBtnDisabled]} activeOpacity={canContinueDiagnosis ? 0.86 : 1} disabled={!canContinueDiagnosis} onPress={() => { setArrivedOpen(false); setDiagnosisOpen(true); onWorkflowChange?.({ stage: 'diagnosis' }); }}>
            <Text style={[styles.startInspectionText, !canContinueDiagnosis && styles.startInspectionTextDisabled]}>Continue to Diagnosis</Text>
          </TouchableOpacity>
          {!canContinueDiagnosis && (
            <Text style={styles.arrivedContinueHint}>Complete required photos to continue</Text>
          )}
        </ScrollView>

        <Modal visible={!!activeChecklistItem} transparent animationType="fade" onRequestClose={() => setActiveChecklistItem(null)}>
          <KeyboardAvoidingView
            style={styles.checklistKeyboardAvoider}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          >
            <View style={styles.checklistModalOverlay}>
              <TouchableOpacity style={styles.noteModalBackdrop} activeOpacity={1} onPress={() => setActiveChecklistItem(null)} />
              <View style={styles.checklistModalCard}>
                <View style={styles.noteModalHeader}>
                  <Text style={styles.noteModalTitle}>{activeChecklistMeta?.title || 'Checklist'}</Text>
                  <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setActiveChecklistItem(null)}>
                    <Ionicons name="close" size={20} color="#17191D" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.checklistModalSubtitle}>{activeChecklistMeta?.subtitle}</Text>
                {activeChecklistItem === 'photos' ? (
                  <View style={styles.requiredPhotosList}>
                    {requiredPhotoItems.map(item => {
                      const photo = requiredPhotos[item.key];
                      const checked = !!photo?.uri;
                      return (
                        <View key={item.key} style={styles.requiredPhotoRow}>
                          <View style={styles.requiredPhotoInfo}>
                            <View style={[styles.requiredPhotoCheck, checked && styles.requiredPhotoCheckDone]}>
                              {checked ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                            </View>
                            <View style={styles.requiredPhotoTextWrap}>
                              <Text style={styles.requiredPhotoLabel}>{item.label}</Text>
                              {!!item.hint && <Text style={styles.requiredPhotoHint}>{item.hint}</Text>}
                              {checked && <Text style={styles.requiredPhotoStateDone}>Photo added</Text>}
                            </View>
                          </View>
                          <View style={styles.requiredPhotoActions}>
                            <TouchableOpacity style={[styles.addPhotoIconBtn, checked && styles.addPhotoBtnDone]} activeOpacity={0.84} onPress={() => takeRequiredPhoto(item.key)}>
                              <Ionicons name="camera-outline" size={16} color={checked ? '#16A34A' : '#F04416'} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <TextInput
                    style={styles.checklistTextInput}
                    value={checklistDraft}
                    onChangeText={setChecklistDraft}
                    placeholder="Add optional arrival notes"
                    placeholderTextColor="#5E646D"
                    multiline
                    textAlignVertical="top"
                  />
                )}
                <TouchableOpacity style={[styles.checklistSaveBtn, !canSaveChecklistItem && styles.startInspectionBtnDisabled]} activeOpacity={canSaveChecklistItem ? 0.86 : 1} disabled={!canSaveChecklistItem} onPress={saveChecklistItem}>
                  <Text style={[styles.checklistSaveText, !canSaveChecklistItem && styles.startInspectionTextDisabled]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (routeOpen) {
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
          </View>
          <View style={styles.requestHeaderIconBtn} />
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.jobRouteContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobRouteMap}>
            {jobMapRegion ? (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.mapView}
                region={jobMapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
              >
                {providerMapCoord && (
                  <Marker coordinate={providerMapCoord} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.mapStartMarker} />
                  </Marker>
                )}
                {customerMapCoord && (
                  <Marker coordinate={customerMapCoord} anchor={{ x: 0.5, y: 1 }}>
                    <View style={styles.mapEndMarker}>
                      <Ionicons name="location" size={20} color="#FFFFFF" />
                    </View>
                  </Marker>
                )}
              </MapView>
            ) : (
              <View style={[styles.mapView, styles.mapPlaceholder]}>
                <Ionicons name="map-outline" size={32} color="#C4C9D1" />
                <Text style={styles.mapPlaceholderText}>Map unavailable</Text>
              </View>
            )}
            <View style={styles.mapBubble}><Text style={styles.mapBubbleText}>{liveEta || job.eta || '15 min'}{`\n`}To customer</Text></View>
          </View>

          <View style={styles.jobCustomerCard}>
            <View style={styles.customerPopupAvatar}>
              <Text style={styles.customerPopupInitials}>{job.customer?.initials || 'CU'}</Text>
            </View>
            <View style={styles.customerPopupInfo}>
              <View style={styles.customerNameRatingRow}>
                <Text style={styles.customerPopupName} numberOfLines={1}>{job.customer?.name || 'Customer'}</Text>
              </View>
              <View style={styles.customerTrustedLine}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#F04416" />
                <Text style={styles.customerTrustedText}>Verified & trusted</Text>
              </View>
            </View>
            <View style={styles.customerActionsDivider} />
            <View style={styles.customerPopupActions}>
              <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
                <Ionicons name="call-outline" size={19} color="#F04416" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`sms:${phone}`)}>
                <Ionicons name="chatbox-outline" size={19} color="#F04416" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.routeAddressCard}>
            <View style={styles.routeAddressIcon}>
              <Ionicons name="location-outline" size={20} color="#F04416" />
            </View>
            <View style={styles.routeAddressInfo}>
              <Text style={styles.routeAddressLabel}>Customer Location</Text>
              <Text style={styles.routeAddressText} numberOfLines={2}>{address}</Text>
            </View>
            <TouchableOpacity style={styles.navigateBtn} activeOpacity={0.84} onPress={() => setNavigationChoiceOpen(true)}>
              <Text style={styles.navigateBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.routeBottomPanel}>
          <TouchableOpacity style={styles.arrivedRouteBtn} activeOpacity={0.86} onPress={() => { setRouteOpen(false); setArrivedOpen(true); onWorkflowChange?.({ stage: 'arrived' }); }}>
            <Text style={styles.arrivedRouteText}>Arrived</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={navigationChoiceOpen} transparent animationType="fade" onRequestClose={() => setNavigationChoiceOpen(false)}>
          <View style={styles.navChoiceOverlay}>
            <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={() => setNavigationChoiceOpen(false)} />
            <View style={styles.navChoiceCard}>
              <View style={styles.navChoiceHeader}>
                <Text style={styles.navChoiceTitle}>Choose navigation</Text>
                <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setNavigationChoiceOpen(false)}>
                  <Ionicons name="close" size={20} color="#17191D" />
                </TouchableOpacity>
              </View>
              {[
                { id: 'google', label: 'Google Maps', icon: 'map-outline' },
                { id: 'apple', label: 'Apple Maps', icon: 'navigate-outline' },
                { id: 'waze', label: 'Waze', icon: 'navigate-circle-outline' },
              ].map(option => (
                <TouchableOpacity key={option.id} style={styles.navChoiceRow} activeOpacity={0.84} onPress={() => openNavigationApp(option.id)}>
                  <Ionicons name={option.icon} size={20} color="#F04416" />
                  <Text style={styles.navChoiceText}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#5E646D" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const cancelJob = () => {
    Alert.alert(
      'Cancel Order?',
      'The customer will be notified that this job was cancelled.',
      [
        { text: 'Keep Job', style: 'cancel' },
        { text: 'Cancel Order', style: 'destructive', onPress: () => onCancel?.(job) },
      ]
    );
  };
  const {
    invoiceEstimate: completedInvoiceEstimate, invoiceNumber: completedInvoiceNumber, paymentMethod: completedPaymentMethod,
    invoiceTax: completedInvoiceTax, invoiceSubtotal: completedInvoiceSubtotal, finalTotal: completedFinalTotal,
    approvedRequiredChanges: completedApprovedRequiredChanges, approveOptional: completedApproveOptional,
  } = getInvoiceData(job, workflow, additionalApprovals);

  if (isCompleted) {
    const startedDate = job.startedAt && !isNaN(new Date(job.startedAt).getTime()) ? new Date(job.startedAt) : null;
    const completedDate = job.completedAt && job.completedAt !== 'Completed just now' && !isNaN(new Date(job.completedAt).getTime())
      ? new Date(job.completedAt) : null;
    const timeLabel = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const durationLabel = job.orderContext?.serviceDetails?.duration || workflow?.workDuration || jobDuration;
    const completedPhotos = job.orderContext?.serviceDetails?.photos || [];
    const warranty = job.orderContext?.serviceDetails?.warranty;
    const servicesPerformed = completedInvoiceEstimate.labor.map(item => item.label);
    const shareInvoice = async () => {
      setJobActionsOpen(false);
      try {
        await Share.share({
          message: `Invoice ${completedInvoiceNumber} · ${job.service?.issueName || job.service?.type || 'Service'} · ${formatCurrency(completedFinalTotal)}`,
        });
      } catch { }
    };

    return (
      <View style={styles.detailScreen}>
        {/* Nav bar */}
        <View style={styles.detailNavBar}>
          <TouchableOpacity style={styles.detailBackBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.detailNavTitle}>Order Details</Text>
          <TouchableOpacity style={styles.detailBackBtn} onPress={() => setJobActionsOpen(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent} refreshControl={refreshControl}>

          {/* Completed badge + title */}
          <View style={styles.detailCompletedBadge}>
            <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
            <Text style={styles.detailCompletedBadgeText}>Completed</Text>
          </View>
          <Text style={styles.detailTitle}>{job.service?.issueName || job.service?.type || 'Service'}</Text>
          <Text style={styles.detailSubtitle}>{completedDate ? dateLabel(completedDate) : 'Recently completed'}{'  ·  Order #'}{job.number || '00000'}</Text>

          {/* Customer card */}
          <View style={styles.detailProviderCard}>
            <View style={styles.detailProviderMain}>
              <View style={styles.detailProviderLogo}>
                <Text style={styles.detailProviderInitials}>{job.customer?.initials || 'CU'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.detailProviderNameRow}>
                  <Text style={styles.detailProviderName}>{job.customer?.name || 'Customer'}</Text>
                  <View style={styles.detailProviderReturningPill}>
                    <Ionicons name="bag-outline" size={11} color="#16A34A" />
                    <Text style={styles.detailProviderReturningText}>Returning</Text>
                  </View>
                </View>
                <View style={styles.detailProviderBadgeRow}>
                  <View style={styles.detailProviderVerifiedPill}>
                    <Ionicons name="shield-checkmark-outline" size={11} color="#2563EB" />
                    <Text style={styles.detailProviderVerifiedText}>Verified</Text>
                  </View>
                  <Ionicons name="star" size={11} color="#FFC107" />
                  <Text style={styles.detailProviderRatingValue}>4.9</Text>
                </View>
              </View>
              <View style={styles.detailProviderActions}>
                <TouchableOpacity style={styles.detailProviderBtn} onPress={openCustomerProfile}>
                  <View style={styles.detailProviderBtnIcon}><Ionicons name="person-outline" size={17} color="#5E646D" /></View>
                  <Text style={styles.detailProviderBtnText}>View Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Payment card */}
          <View style={styles.detailPriceCard}>
            <View style={styles.detailPriceTop}>
              <Text style={styles.detailPriceLabel}>Total Paid</Text>
              <View style={styles.detailPaidBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                <Text style={styles.detailPaidText}>PAID</Text>
              </View>
            </View>
            <Text style={styles.detailPriceValue}>{formatCurrency(completedFinalTotal)}</Text>
            <View style={styles.detailPaymentRow}>
              <View style={styles.detailPaymentLeft}>
                <Text style={styles.detailPaymentMethod}>{completedPaymentMethod}</Text>
              </View>
              <TouchableOpacity style={styles.detailInvoiceLink} onPress={() => setCompletedInvoicePreviewOpen(true)}>
                <Ionicons name="document-text-outline" size={14} color="#F04416" />
                <Text style={styles.detailInvoiceLinkText}>View Invoice</Text>
                <Ionicons name="chevron-forward" size={13} color="#F04416" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Vehicle + Location grid */}
          <View style={styles.detailGrid}>
            <View style={styles.detailGridCard}>
              <View style={styles.detailGridHeader}>
                <Ionicons name="car-outline" size={15} color="#5E646D" />
                <Text style={styles.detailGridTitle}>Vehicle</Text>
              </View>
              <Text style={styles.detailGridMain}>{vehicleDisplayParts.main}{!!vehicleDisplayParts.suffix && <Text style={styles.serviceTypeSuffix}>{vehicleDisplayParts.suffix}</Text>}</Text>
              {hasVin && (
                <View style={styles.detailVinPill}>
                  <Text style={styles.detailVinPillText}>VIN {vin}</Text>
                </View>
              )}
            </View>
            <View style={styles.detailGridCard}>
              <View style={styles.detailGridHeader}>
                <Ionicons name="location-outline" size={15} color="#5E646D" />
                <Text style={styles.detailGridTitle}>Service Location</Text>
              </View>
              <Text style={styles.detailGridMain} numberOfLines={2}>{address}</Text>
            </View>
          </View>

          {/* Service details link row */}
          <TouchableOpacity style={styles.detailServiceLink} onPress={() => setCompletedServiceDetailsOpen(true)} activeOpacity={0.7}>
            <Ionicons name="construct-outline" size={17} color="#5E646D" />
            <Text style={styles.detailServiceLinkText}>Service Details</Text>
            <Ionicons name="chevron-forward" size={17} color="#5E646D" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* Warranty */}
          {(() => {
            if (!warranty || (!warranty.days && !warranty.miles)) return null;
            const daysLabel = warranty.days === 365 ? '1 Year' : `${warranty.days} Days`;
            const milesLabel = `${(warranty.miles || 0).toLocaleString()} Miles`;
            return (
              <TouchableOpacity style={styles.detailWarrantyCard} activeOpacity={0.8}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#16A34A" />
                <Text style={styles.detailWarrantyLabel}>Warranty</Text>
                <View style={styles.detailWarrantyRange}>
                  <Text style={styles.detailWarrantyDays}>{daysLabel}</Text>
                  <Text style={styles.detailWarrantyOr}>or</Text>
                  <Text style={styles.detailWarrantyMiles}>{milesLabel}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={styles.detailWarrantyCovered}>What's Covered</Text>
                <Ionicons name="chevron-forward" size={14} color="#F04416" />
              </TouchableOpacity>
            );
          })()}

          {/* Price breakdown */}
          <View style={styles.detailBreakdownCard}>
            <Text style={styles.detailBreakdownTitle}>Price Breakdown</Text>
            <View style={styles.detailBreakdownRow}>
              <Text style={styles.detailBreakdownLabel}>Service Call</Text>
              <Text style={styles.detailBreakdownValue}>$45.00</Text>
            </View>
            <View style={styles.detailBreakdownRow}>
              <Text style={styles.detailBreakdownLabel}>Labor</Text>
              <Text style={styles.detailBreakdownValue}>$20.00</Text>
            </View>
            <View style={styles.detailBreakdownRow}>
              <Text style={styles.detailBreakdownLabel}>Tax</Text>
              <Text style={styles.detailBreakdownValue}>$0.00</Text>
            </View>
            <View style={styles.detailBreakdownDivider} />
            <View style={styles.detailBreakdownRow}>
              <Text style={styles.detailBreakdownTotal}>Total</Text>
              <Text style={styles.detailBreakdownTotalValue}>{formatCurrency(completedFinalTotal)}</Text>
            </View>
          </View>

        </ScrollView>

        {/* Service detail overlay */}
        <Modal visible={completedServiceDetailsOpen} animationType="slide" onRequestClose={() => setCompletedServiceDetailsOpen(false)}>
          <View style={styles.detailScreen}>
            <View style={styles.detailNavBar}>
              <TouchableOpacity style={styles.detailBackBtn} onPress={() => setCompletedServiceDetailsOpen(false)} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={22} color="#17191D" />
              </TouchableOpacity>
              <Text style={styles.detailNavTitle}>Service Details</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sdContent}>

              {servicesPerformed.length > 0 && <>
                <Text style={styles.sdSectionTitle}>Services Performed</Text>
                <View style={styles.sdCard}>
                  {servicesPerformed.map((s, i) => (
                    <View key={i} style={[styles.sdRow, i > 0 && styles.sdRowBorder]}>
                      <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                      <Text style={styles.sdRowText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </>}

              <Text style={styles.sdSectionTitle}>Time</Text>
              <View style={styles.sdCard}>
                <View style={styles.sdRow}>
                  <Ionicons name="time-outline" size={15} color="#5E646D" />
                  <Text style={styles.sdRowLabel}>Service Duration</Text>
                  <Text style={styles.sdRowValue}>{durationLabel || '—'}</Text>
                </View>
                <View style={[styles.sdRow, styles.sdRowBorder]}>
                  <Ionicons name="calendar-outline" size={15} color="#5E646D" />
                  <Text style={styles.sdRowLabel}>Date & Time</Text>
                  <Text style={styles.sdRowValue}>
                    {completedDate ? dateLabel(completedDate) : ''}{completedDate ? `  ·  ${timeLabel(completedDate)}` : ''}
                  </Text>
                </View>
              </View>

              {customerNote !== 'No note provided' && !!customerNote && <>
                <Text style={styles.sdSectionTitle}>Provider Notes</Text>
                <View style={styles.sdCard}>
                  <Text style={styles.sdNotesText}>{customerNote}</Text>
                </View>
              </>}

              {completedPhotos.length > 0 && <>
                <Text style={styles.sdSectionTitle}>Photos ({completedPhotos.length})</Text>
                <View style={styles.sdPhotosRow}>
                  {completedPhotos.map((photo, i) => (
                    <View key={i} style={styles.sdPhotoItem}>
                      <View style={styles.sdPhotoPlaceholder}>
                        <Ionicons name="image-outline" size={22} color="#5E646D" />
                      </View>
                      <Text style={styles.sdPhotoLabel} numberOfLines={1}>{typeof photo === 'string' ? photo : `Photo ${i + 1}`}</Text>
                    </View>
                  ))}
                </View>
              </>}

              {!servicesPerformed.length && !completedPhotos.length && (customerNote === 'No note provided' || !customerNote) && (
                <Text style={{ color: '#5E646D', fontSize: 13, textAlign: 'center', marginTop: 40 }}>No service details available</Text>
              )}

            </ScrollView>
          </View>
        </Modal>

        {/* Invoice overlay */}
        <InvoicePreviewModal
          visible={completedInvoicePreviewOpen}
          onClose={() => setCompletedInvoicePreviewOpen(false)}
          job={job}
          vin={vin}
          invoiceEstimate={completedInvoiceEstimate}
          invoiceNumber={completedInvoiceNumber}
          invoiceSubtotal={completedInvoiceSubtotal}
          invoiceTax={completedInvoiceTax}
          finalTotal={completedFinalTotal}
          paymentMethod={completedPaymentMethod}
          approvedRequiredChanges={completedApprovedRequiredChanges}
          approveOptional={completedApproveOptional}
        />

        {/* Customer Profile overlay */}
        <Modal visible={customerProfileOpen} transparent animationType="none" onRequestClose={closeCustomerProfile} onShow={() => {
          Animated.timing(cpPanX, { toValue: 0, duration: 260, useNativeDriver: true }).start();
        }}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <PanGestureHandler
              onGestureEvent={onCpGestureEvent}
              onHandlerStateChange={onCpHandlerStateChange}
              activeOffsetX={[-100000, 12]}
              failOffsetY={[-14, 14]}
            >
              <Animated.View style={[styles.detailScreen, { transform: [{ translateX: cpPanX }] }]}>
                <View style={styles.detailNavBar}>
                  <TouchableOpacity style={styles.detailBackBtn} onPress={closeCustomerProfile} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={22} color="#17191D" />
                  </TouchableOpacity>
                  <Text style={styles.detailNavTitle}>Customer Profile</Text>
                  <View style={{ width: 40 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cpContent}>
              <View style={styles.cpAvatarWrap}>
                <Text style={styles.cpAvatarText}>{job.customer?.initials || 'CU'}</Text>
              </View>
              <Text style={styles.cpName}>{job.customer?.name || 'Customer'}</Text>

              <View style={styles.cpBadgeRow}>
                {!!job.customer?.phoneVerified && (
                  <View style={styles.cpVerifiedPill}>
                    <Ionicons name="shield-checkmark-outline" size={13} color="#2563EB" />
                    <Text style={styles.cpVerifiedText}>Verified</Text>
                  </View>
                )}
                {!!customerStats?.returning && (
                  <View style={styles.cpReturningPill}>
                    <Ionicons name="bag-outline" size={13} color="#16A34A" />
                    <Text style={styles.cpReturningText}>Returning</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cpJobsCount}>
                {customerStatsLoading ? 'Loading…' : `${customerStats?.completedJobs ?? 0} completed jobs with you`}
              </Text>

              <View style={styles.cpStatsCard}>
                <View style={styles.cpStatItem}>
                  <Text style={styles.cpStatLabel}>Customer since</Text>
                  <Text style={styles.cpStatValue}>{customerStats?.memberSince ? new Date(customerStats.memberSince).getFullYear() : '—'}</Text>
                </View>
                <View style={styles.cpStatDivider} />
                <View style={styles.cpStatItem}>
                  <Text style={styles.cpStatLabel}>Completed jobs</Text>
                  <Text style={styles.cpStatValue}>{customerStatsLoading ? '—' : customerStats?.completedJobs ?? '—'}</Text>
                </View>
                <View style={styles.cpStatDivider} />
                <View style={styles.cpStatItem}>
                  <Text style={styles.cpStatLabel}>Canceled</Text>
                  <Text style={styles.cpStatValue}>{customerStatsLoading ? '—' : customerStats?.canceledJobs ?? '—'}</Text>
                </View>
                <View style={styles.cpStatDivider} />
                <View style={styles.cpStatItem}>
                  <Text style={styles.cpStatLabel}>Rating</Text>
                  <Text style={styles.cpStatValue}>—</Text>
                </View>
              </View>

              <View style={styles.cpActionsRow}>
                <TouchableOpacity style={styles.cpActionBtn} activeOpacity={0.84} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
                  <Ionicons name="call-outline" size={18} color="#16A34A" />
                  <Text style={styles.cpActionText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cpActionBtn} activeOpacity={0.84} onPress={() => phone && Linking.openURL(`sms:${phone}`)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#2563EB" />
                  <Text style={styles.cpActionText}>Message</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cpListCard}>
                <View style={styles.cpListRow}>
                  <Ionicons name="clipboard-outline" size={18} color="#5E646D" />
                  <Text style={styles.cpListLabel}>Previous jobs</Text>
                  <Text style={styles.cpListValue}>{customerStatsLoading ? '—' : customerStats?.completedJobs ?? '—'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C4C9D1" />
                </View>
                <View style={[styles.cpListRow, styles.cpListRowBorder]}>
                  <Ionicons name="car-outline" size={18} color="#5E646D" />
                  <Text style={styles.cpListLabel}>Vehicles</Text>
                  <Text style={styles.cpListValue}>—</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C4C9D1" />
                </View>
                <View style={[styles.cpListRow, styles.cpListRowBorder]}>
                  <Ionicons name="star-outline" size={18} color="#5E646D" />
                  <Text style={styles.cpListLabel}>Reviews</Text>
                  <Text style={styles.cpListValue}>—</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C4C9D1" />
                </View>
                <View style={[styles.cpListRow, styles.cpListRowBorder]}>
                  <Ionicons name="document-text-outline" size={18} color="#5E646D" />
                  <Text style={styles.cpListLabel}>Notes</Text>
                  <Text style={styles.cpListValue}>—</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C4C9D1" />
                </View>
              </View>

              <Text style={styles.cpFooterNote}>Customer details are visible only{`\n`}for your completed jobs.</Text>
                </ScrollView>
              </Animated.View>
            </PanGestureHandler>
          </GestureHandlerRootView>
        </Modal>

        {/* Job actions — compact dropdown anchored under the ... button */}
        <Modal visible={jobActionsOpen} transparent animationType="fade" onRequestClose={() => setJobActionsOpen(false)}>
          <TouchableOpacity style={styles.jaBackdropFill} activeOpacity={1} onPress={() => setJobActionsOpen(false)}>
            <View style={styles.jaMenu}>
              <TouchableOpacity style={styles.jaMenuRow} activeOpacity={0.7} onPress={shareInvoice}>
                <Ionicons name="arrow-up-outline" size={17} color="#7C3AED" />
                <Text style={styles.jaMenuRowText}>Share invoice</Text>
              </TouchableOpacity>
              <View style={styles.jaMenuDivider} />
              <TouchableOpacity style={styles.jaMenuRow} activeOpacity={0.7} onPress={() => setJobActionsOpen(false)}>
                <Ionicons name="document-outline" size={17} color="#DC2626" />
                <Text style={styles.jaMenuRowText}>Export PDF</Text>
              </TouchableOpacity>
              <View style={styles.jaMenuDivider} />
              <TouchableOpacity style={styles.jaMenuRow} activeOpacity={0.7} onPress={() => setJobActionsOpen(false)}>
                <Ionicons name="flag-outline" size={17} color="#DC2626" />
                <Text style={styles.jaMenuRowText}>Report issue</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.requestDetailShell}>
      <View style={styles.requestDetailHeader}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
          <Ionicons name="close" size={24} color="#17191D" />
        </TouchableOpacity>
        <View style={styles.jobPopupHeaderTextWrap}>
          <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
          <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
        </View>
        <View style={styles.requestHeaderIconBtn} />
      </View>

      <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.jobPopupContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
        <View style={styles.jobCustomerCard}>
          <View style={styles.customerPopupAvatar}>
            <Text style={styles.customerPopupInitials}>{job.customer?.initials || 'CU'}</Text>
          </View>
          <View style={styles.customerPopupInfo}>
            <View style={styles.customerNameRatingRow}>
              <Text style={styles.customerPopupName} numberOfLines={1}>{job.customer?.name || 'Customer'}</Text>
            </View>
            <View style={styles.customerTrustedLine}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#F04416" />
              <Text style={styles.customerTrustedText}>Verified & trusted</Text>
            </View>
          </View>
          <View style={styles.customerActionsDivider} />
          <View style={styles.customerPopupActions}>
            <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
              <Ionicons name="call-outline" size={19} color="#F04416" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`sms:${phone}`)}>
              <Ionicons name="chatbox-outline" size={19} color="#F04416" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.vehicleInfoCard}>
          <View style={styles.requestVehicleIcon}>
            <Ionicons name={job.service?.icon || job.icon || 'car-outline'} size={22} color="#F04416" />
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceType} numberOfLines={2}>{vehicleDisplayParts.main}{!!vehicleDisplayParts.suffix && <Text style={styles.serviceTypeSuffix}>{vehicleDisplayParts.suffix}</Text>}</Text>
            {hasVin && (
              <View style={[styles.trustedLine, styles.vehicleTrustedLine]}>
                <Ionicons name="barcode-outline" size={13} color="#F04416" />
                <Text style={styles.verifiedTrusted} numberOfLines={1}>VIN {vin}</Text>
              </View>
            )}
          </View>
          <View style={styles.vehicleMetaBox}>
            <View style={styles.requestSpecRow}>
              <Text style={styles.requestSpecLabel}>Service Type</Text>
              <Text style={styles.requestSpecValue} numberOfLines={1}>{serviceMeta.title}</Text>
            </View>
          </View>
        </View>

        {isCompleted ? (
          <View style={styles.completedSummaryCard}>
            {!!jobDuration && (
              <View style={styles.completedSummaryRow}>
                <View style={[styles.completedSummaryIcon, { backgroundColor: '#2F80FF18' }]}>
                  <Ionicons name="time-outline" size={18} color="#2F80FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.completedSummaryLabel}>Time on Job</Text>
                  <Text style={styles.completedSummaryValue}>{jobDuration}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={[styles.completedSummaryRow, !!jobDuration && styles.completedSummaryRowBorder]} activeOpacity={0.84} onPress={() => { setCompletedInvoicePreviewOpen(true); }}>
              <View style={[styles.completedSummaryIcon, { backgroundColor: '#7C3AED18' }]}>
                <Ionicons name="document-text-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.completedSummaryLabel}>Invoice</Text>
                <Text style={styles.completedSummaryValue}>{workflow?.invoiceNumber || job.invoiceNumber || `INV-${job.number || '00000'}`}</Text>
              </View>
              <View style={styles.completedInvoicePaid}>
                <Text style={styles.completedInvoicePaidText}>PAID</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C9D1" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mapPreview}>
            {jobMapRegion ? (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.mapView}
                region={jobMapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
              >
                {providerMapCoord && (
                  <Marker coordinate={providerMapCoord} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.mapStartMarker} />
                  </Marker>
                )}
                {customerMapCoord && (
                  <Marker coordinate={customerMapCoord} anchor={{ x: 0.5, y: 1 }}>
                    <View style={styles.mapEndMarker}>
                      <Ionicons name="location" size={20} color="#FFFFFF" />
                    </View>
                  </Marker>
                )}
              </MapView>
            ) : (
              <View style={[styles.mapView, styles.mapPlaceholder]}>
                <Ionicons name="map-outline" size={32} color="#C4C9D1" />
                <Text style={styles.mapPlaceholderText}>Map unavailable</Text>
              </View>
            )}
            <View style={styles.mapBubble}><Text style={styles.mapBubbleText}>{liveEta || job.eta || '15 min'}{`\n`}On route</Text></View>
          </View>
        )}

        {!isCompleted && (
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={currentStepIndex} />
          </View>
        )}

        <View style={styles.requestBriefCard}>
          <Text style={styles.jobDetailHeading}>Job Details</Text>

          <RequestInfoRow icon="chatbox-outline" color="#2F80FF" label="Customer Note" value={customerNote} chevron onPress={() => setNoteOpen(true)} />

          {intakeRows.length > 0 && (
            <>
              <View style={styles.jobDetailSectionRow}>
                <View style={[styles.requestInfoIcon, { backgroundColor: '#F04416' + '18' }]}>
                  <Ionicons name="clipboard-outline" size={16} color="#F04416" />
                </View>
                <Text style={styles.jobDetailSectionLabel} numberOfLines={1}>Customer Diagnostic</Text>
              </View>
              <View style={styles.diagnosticIndent}>
                {intakeRows.map(row => (
                  <View key={row.key} style={styles.diagnosticRow}>
                    <View style={styles.diagnosticDot} />
                    <Text style={styles.diagnosticLabel} numberOfLines={2}>{row.label}</Text>
                    <Text style={styles.diagnosticValue} numberOfLines={1}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {locationDetailRows.map(row => (
            <RequestInfoRow key={row.key} icon={row.icon} color={row.color} label={row.label} value={row.value} />
          ))}
        </View>

        {!isCompleted && (
          <TouchableOpacity style={styles.onTheWayBtn} activeOpacity={0.86} onPress={() => { setRouteOpen(true); onWorkflowChange?.({ stage: 'route' }); }}>
            <Text style={styles.onTheWayText}>On the way</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {!isCompleted && (
          <TouchableOpacity style={styles.cancelJobBtn} activeOpacity={0.86} onPress={cancelJob}>
            <Text style={styles.cancelJobBtnText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        <View style={styles.noteModalOverlay}>
          <TouchableOpacity style={styles.noteModalBackdrop} activeOpacity={1} onPress={() => setNoteOpen(false)} />
          <View style={styles.noteModalCard}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>Customer Note</Text>
              <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setNoteOpen(false)}>
                <Ionicons name="close" size={20} color="#17191D" />
              </TouchableOpacity>
            </View>
            <Text style={styles.noteModalText}>{customerNote}</Text>
            {!!customerFiles.length && (
              <View style={styles.noteFilesBlock}>
                <Text style={styles.noteFilesTitle}>Uploaded files</Text>
                {customerFiles.map((file, index) => {
                  const fileName = typeof file === 'string' ? file : file.name || `Attachment ${index + 1}`;
                  const fileType = typeof file === 'string' ? 'file' : file.type || 'file';
                  const fileIcon = fileType === 'image' || fileType === 'photo' ? 'image-outline' : 'document-attach-outline';
                  return (
                    <View key={`${fileName}-${index}`} style={styles.noteFileRow}>
                      <View style={styles.noteFileIcon}>
                        <Ionicons name={fileIcon} size={16} color="#F04416" />
                      </View>
                      <Text style={styles.noteFileName} numberOfLines={1}>{fileName}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>

      <InvoicePreviewModal
        visible={completedInvoicePreviewOpen}
        onClose={() => setCompletedInvoicePreviewOpen(false)}
        job={job}
        vin={vin}
        invoiceEstimate={completedInvoiceEstimate}
        invoiceNumber={completedInvoiceNumber}
        invoiceSubtotal={completedInvoiceSubtotal}
        invoiceTax={completedInvoiceTax}
        finalTotal={completedFinalTotal}
        paymentMethod={completedPaymentMethod}
        approvedRequiredChanges={completedApprovedRequiredChanges}
        approveOptional={completedApproveOptional}
      />
    </View>
  );
}

function DiagnosisOption({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.diagnosisOption, selected && styles.diagnosisOptionSelected]} activeOpacity={0.84} onPress={onPress}>
      <View style={[styles.diagnosisRadio, selected && styles.diagnosisRadioSelected]}>
        {selected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
      </View>
      <Text style={[styles.diagnosisOptionText, selected && styles.diagnosisOptionTextSelected]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function RecommendedService({ label }) {
  return (
    <View style={styles.recommendedRow}>
      <View style={styles.recommendedLeft}>
        <Ionicons name="checkmark" size={16} color="#16A34A" />
        <Text style={styles.recommendedRowText}>{label}</Text>
      </View>
      <View style={styles.recommendedCheck}>
        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
      </View>
    </View>
  );
}

function EstimateSection({ title, icon, color, onAdd, optional, children }) {
  return (
    <View style={[styles.estimateCard, optional && styles.estimateCardOptional]}>
      <View style={styles.estimateSectionHeader}>
        <View style={styles.estimateSectionTitleGroup}>
          <View style={[styles.estimateSectionIcon, { backgroundColor: color + (optional ? '18' : '14') }, optional && styles.estimateSectionIconOptional]}>
            <Ionicons name={icon} size={17} color={color} />
          </View>
          <Text style={styles.estimateSectionTitle}>{title}</Text>
          {optional && <Text style={styles.estimateOptionalBadge}>Optional</Text>}
        </View>
        {!!onAdd && (
          <TouchableOpacity style={styles.estimateSectionAddBtn} activeOpacity={0.84} onPress={onAdd}>
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
    <View style={styles.estimateLine}>
      <Text style={[styles.estimateLineLabel, strong && styles.estimateLineStrong, mutedLabel && styles.estimateLineMuted]} numberOfLines={1}>{label}</Text>
      {!!priceWarning && <Ionicons name="alert-circle-outline" size={14} color="#F04416" />}
      {!!hours && <Text style={styles.estimateLineHours}>{hours}</Text>}
      <Text style={[styles.estimateLineAmount, strong && styles.estimateLineStrong, total && styles.estimateTotalAmount]} numberOfLines={1}>{formatCurrency(amount)}</Text>
      {!!onRemove && (
        <TouchableOpacity style={styles.estimateRemoveBtn} activeOpacity={0.84} onPress={onRemove}>
          <Ionicons name="close" size={14} color="#F04416" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function CustomerEstimatePreview({ job, estimate, onClose }) {
  const serviceMeta = getServiceMeta(job);
  const vehicleParts = getVehicleDisplayParts(job);
  const optionalAvailable = estimate.optionalSubtotal > 0;

  return (
    <View style={styles.customerEstimateOverlay}>
      <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.customerEstimateCard}>
        <View style={styles.customerEstimateHeader}>
          <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={onClose}>
            <Ionicons name="chevron-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.customerEstimateTitleWrap}>
            <Text style={styles.customerEstimateTitle}>Estimate</Text>
            <Text style={styles.customerEstimateSubtitle}>Job #{job.number}</Text>
          </View>
          <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={onClose}>
            <Ionicons name="close" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.customerEstimateScroll} contentContainerStyle={styles.customerEstimateContent} showsVerticalScrollIndicator={false}>
          <View style={styles.customerEstimateHero}>
            <View style={styles.customerEstimateServiceIcon}>
              <Ionicons name={serviceMeta.icon} size={24} color="#F04416" />
            </View>
            <View style={styles.customerEstimateHeroInfo}>
              <Text style={styles.customerEstimateService} numberOfLines={1}>{serviceMeta.title}</Text>
              <Text style={styles.customerEstimateVehicle} numberOfLines={2}>{vehicleParts.main}{!!vehicleParts.suffix && <Text style={styles.serviceTypeSuffix}>{vehicleParts.suffix}</Text>}</Text>
              <Text style={styles.customerEstimateLocation} numberOfLines={1}>{job.pickup?.address || 'Service location'}</Text>
            </View>
          </View>

          <View style={styles.customerEstimateNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#16A34A" />
            <Text style={styles.customerEstimateNoticeText}>Required work is needed to complete this service. Recommended repairs are optional and need separate approval.</Text>
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

          <View style={styles.customerEstimateTotals}>
            <CustomerPreviewLine label="Required subtotal" amount={estimate.subtotal} strong />
            <CustomerPreviewLine label="Tax" amount={estimate.tax} />
            <CustomerPreviewLine label="Required total" amount={estimate.total} total />
            {optionalAvailable && (
              <>
                <View style={styles.customerEstimateDivider} />
                <CustomerPreviewLine label="Optional repairs" amount={estimate.optionalSubtotal} strong />
                <CustomerPreviewLine label="Optional tax" amount={estimate.optionalTax} />
                <CustomerPreviewLine label="Total with recommended repairs" amount={estimate.totalIfApproved} total />
              </>
            )}
          </View>

          <View style={styles.customerPreviewOnlyNote}>
            <Ionicons name="eye-outline" size={15} color="#5E646D" />
            <Text style={styles.customerPreviewOnlyText}>Preview only. Customer approval happens in the Auterio app.</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function CustomerPreviewSection({ title, optional, children }) {
  return (
    <View style={[styles.customerPreviewSection, optional && styles.customerPreviewSectionOptional]}>
      <View style={styles.customerPreviewSectionHeader}>
        <Text style={styles.customerPreviewSectionTitle}>{title}</Text>
        {optional && <Text style={styles.customerPreviewOptionalPill}>Optional</Text>}
      </View>
      {children}
    </View>
  );
}

function CustomerPreviewLine({ label, hours, amount, strong, total }) {
  return (
    <View style={styles.customerPreviewLine}>
      <View style={styles.customerPreviewLineInfo}>
        <Text style={[styles.customerPreviewLineLabel, strong && styles.customerPreviewLineStrong]} numberOfLines={1}>{label}</Text>
        {!!hours && <Text style={styles.customerPreviewLineMeta}>{hours}</Text>}
      </View>
      <Text style={[styles.customerPreviewLineAmount, strong && styles.customerPreviewLineStrong, total && styles.customerPreviewTotalAmount]}>{formatCurrency(amount)}</Text>
    </View>
  );
}


function formatPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length !== 10) return raw || '';
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function InvoicePreviewModal({ visible, onClose, job, vin, invoiceEstimate, invoiceNumber, invoiceSubtotal, invoiceTax, finalTotal, paymentMethod, approvedRequiredChanges, approveOptional }) {
  const { provider } = useProvider();
  const vehicleDisplayParts = getVehicleDisplayParts(job);
  const hasVin = hasKnownVin(job);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.customerEstimateOverlay}>
        <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.customerEstimateCard}>
          <View style={styles.customerEstimateHeader}>
            <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={onClose}>
              <Ionicons name="chevron-back" size={22} color="#17191D" />
            </TouchableOpacity>
            <View style={styles.customerEstimateTitleWrap}>
              <Text style={styles.customerEstimateTitle}>Invoice</Text>
              <Text style={styles.customerEstimateSubtitle}>{invoiceNumber}</Text>
            </View>
            <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={onClose}>
              <Ionicons name="close" size={20} color="#17191D" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.customerEstimateScroll} contentContainerStyle={styles.customerEstimateContent} showsVerticalScrollIndicator={false}>
            <View style={styles.invHeaderCard}>
              <View style={styles.invHeaderTop}>
                <View style={styles.invIconWrap}>
                  <Ionicons name="document-text-outline" size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invTitle}>Invoice</Text>
                  <Text style={styles.invMeta}>{invoiceNumber}{job.completedAt && !isNaN(new Date(job.completedAt).getTime()) ? `  ·  ${new Date(job.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</Text>
                </View>
                <View style={styles.invPaidBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                  <Text style={styles.invPaidText}>PAID</Text>
                </View>
              </View>
            </View>
            <View style={styles.invoicePartyCard}>
              <View style={styles.invoicePartyRow}>
                <Text style={styles.invoicePartyLabel}>FROM</Text>
                <Text style={styles.invoicePartyName}>{provider?.company || 'Provider'}</Text>
                <Text style={styles.invoicePartySub}>{formatPhone(provider?.phone)}</Text>
              </View>
              <View style={styles.invoiceDivider} />
              <View style={styles.invoicePartyRow}>
                <Text style={styles.invoicePartyLabel}>TO</Text>
                <Text style={styles.invoicePartyName}>{job.customer?.name || 'Customer'}</Text>
                <Text style={styles.invoicePartySub}>{vehicleDisplayParts.main}{!!vehicleDisplayParts.suffix && <Text style={styles.serviceTypeSuffix}>{vehicleDisplayParts.suffix}</Text>}</Text>
                {hasVin && <Text style={styles.invoicePartySub}>VIN: {vin}</Text>}
              </View>
              <View style={styles.invoiceDivider} />
              <View style={styles.invoicePartyRow}>
                <Text style={styles.invoicePartyLabel}>SERVICE</Text>
                <Text style={styles.invoicePartyName}>{job.service?.issueName || job.service?.type || 'Service'}</Text>
                <Text style={styles.invoicePartySub}>{job.pickup?.address || 'Service location'}</Text>
              </View>
            </View>

            {invoiceEstimate.labor.length > 0 && (
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionLabel}>LABOR</Text>
                {invoiceEstimate.labor.map((item, i) => (
                  <View key={item.id || i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceLineName}>{item.label}</Text>
                      {!!item.hours && <Text style={styles.invoiceLineSub}>{item.hours}</Text>}
                    </View>
                    <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {invoiceEstimate.parts.length > 0 && (
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionLabel}>PARTS & MATERIALS</Text>
                {invoiceEstimate.parts.map((item, i) => (
                  <View key={item.id || i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                    <Text style={[styles.invoiceLineName, { flex: 1 }]}>{item.label}</Text>
                    <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {invoiceEstimate.fees.length > 0 && (
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionLabel}>FEES</Text>
                {invoiceEstimate.fees.map((item, i) => (
                  <View key={i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                    <Text style={[styles.invoiceLineName, { flex: 1 }]}>{item.label}</Text>
                    <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {approveOptional && invoiceEstimate.optionalLabor?.length > 0 && (
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionLabel}>RECOMMENDED LABOR</Text>
                {invoiceEstimate.optionalLabor.map((item, i) => (
                  <View key={item.id || i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceLineName}>{item.label}</Text>
                      {!!item.hours && <Text style={styles.invoiceLineSub}>{item.hours}</Text>}
                    </View>
                    <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {approveOptional && invoiceEstimate.optionalParts?.length > 0 && (
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionLabel}>RECOMMENDED PARTS</Text>
                {invoiceEstimate.optionalParts.map((item, i) => (
                  <View key={item.id || i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                    <Text style={[styles.invoiceLineName, { flex: 1 }]}>{item.label}</Text>
                    <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {approvedRequiredChanges.length > 0 && (
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionLabel}>ADDITIONAL WORK</Text>
                {approvedRequiredChanges.map((item, i) => (
                  <View key={i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                    <Text style={[styles.invoiceLineName, { flex: 1 }]}>{item.name || item.label}</Text>
                    <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.invoiceTotalsCard}>
              <View style={styles.invoiceTotalRow}>
                <Text style={styles.invoiceTotalLabel}>Subtotal</Text>
                <Text style={styles.invoiceTotalValue}>{formatCurrency(invoiceSubtotal)}</Text>
              </View>
              <View style={[styles.invoiceTotalRow, styles.invoiceLineRowBorder]}>
                <Text style={styles.invoiceTotalLabel}>Tax (6.75%)</Text>
                <Text style={styles.invoiceTotalValue}>{formatCurrency(invoiceTax)}</Text>
              </View>
              <View style={[styles.invoiceTotalRow, styles.invoiceLineRowBorder]}>
                <Text style={styles.invoiceTotalLabelBold}>Total</Text>
                <Text style={styles.invoiceTotalValueBold}>{formatCurrency(finalTotal)}</Text>
              </View>
            </View>

            <View style={styles.invoicePaymentRow}>
              <Ionicons name="card-outline" size={16} color="#5E646D" />
              <Text style={styles.invoicePaymentText}>Payment method: <Text style={{ color: '#17191D', fontWeight: '700' }}>{paymentMethod}</Text></Text>
            </View>

            <View style={styles.invoiceWarrantyRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#16A34A" />
              <Text style={styles.invoiceWarrantyText}>90-day / 4,000-mile warranty on parts and labor</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CompletionCheckRow({ done, title, detail }) {
  return (
    <View style={styles.completionCheckRow}>
      <View style={[styles.completionCheckIcon, done && styles.completionCheckIconDone]}>
        <Ionicons name={done ? 'checkmark' : 'alert'} size={13} color={done ? '#FFFFFF' : '#F04416'} />
      </View>
      <View style={styles.completionCheckInfo}>
        <Text style={styles.completionCheckTitle}>{title}</Text>
        <Text style={styles.completionCheckDetail}>{detail}</Text>
      </View>
    </View>
  );
}

export default JobPopupScreen;
