/* State: Cached configuration from the backend */
let BILLING_CONFIG = {
  room_rates: {},
  svc_rate: 0,
  vat_rate: 0
};

let currentStep    = 1;
let reservation    = null;  // from sessionStorage
let selectedMethod = 'cash';

/* ---------------------------------------------------------------
   HELPERS
--------------------------------------------------------------- */
/**
 * Configuration Initialization
 */
async function initConfiguration() {
  try {
    const res = await fetch('get_config.php');
    const data = await res.json();
    if (data.success) {
      BILLING_CONFIG.room_rates = data.room_rates;
      BILLING_CONFIG.svc_rate   = data.svc_rate;
      BILLING_CONFIG.vat_rate   = data.vat_rate;
      
      // Now safe to load confirmation
      loadConfirmation();
    }
  } catch (err) {
    console.error('Failed to load configuration:', err);
    loadConfirmation(); // Fallback
  }
}

/* ---------------------------------------------------------------
   STEP NAVIGATION
--------------------------------------------------------------- */
function showStep(n) {
  currentStep = n;
  [1,2,3].forEach(i => {
    $('pageStep' + i).style.display = (i === n) ? '' : 'none';
    const dot = $('s' + i);
    dot.className = 'step' + (i < n ? ' done' : i === n ? ' active' : '');
  });
  [1,2].forEach(i => {
    const ln = $('l' + i);
    if (ln) ln.className = 'step-line' + (i < n ? ' done' : '');
  });

  // Update hero text
  const titles = { 1:['Booking Confirmation','Review your reservation before proceeding to payment'],
                   2:['Payment Details','Complete your booking securely'],
                   3:['Reservation Confirmed!','Your booking has been successfully received'] };
  setText('heroTitle', titles[n][0]);
  setText('heroSub', titles[n][1]);
  window.scrollTo({ top:0, behavior:'smooth' });
}


function loadConfirmation() {
  const raw = sessionStorage.getItem('pendingReservation');

  if (!raw) {
    $('noResNotice').style.display = '';
    $('confLayout').style.display  = 'none';
    return;
  }

  try {
    reservation = JSON.parse(raw);
    console.log('Billing: Reservation data loaded', reservation);
  } catch (err) {
    console.warn('Billing: Failed to parse reservation JSON', err);
    $('noResNotice').style.display = '';
    $('confLayout').style.display  = 'none';
    showToast('Invalid reservation data. Please book again.', 'error');
    sessionStorage.removeItem('pendingReservation');
    return;
  }

  // Phase 2: Check for presence of dbId to abort on legacy stale caches
  if (!reservation || !reservation.dbId) {
    $('noResNotice').style.display = '';
    $('confLayout').style.display  = 'none';
    showToast('Stale session data detected. Please book again.', 'error');
    sessionStorage.removeItem('pendingReservation');
    return;
  }

 
  const rateObj   = BILLING_CONFIG.room_rates[reservation.roomKey] || { label: reservation.roomKey, dayRate: 0, nightRate: 0 };
  
  const nights    = Number(reservation.nights) || calculateNights(reservation.checkIn, reservation.checkOut) || 0;
  const nightRate = Number(reservation.nightRate) || Number(rateObj.nightRate) || 0;
  
  const subtotal  = nights * nightRate;
  const svc       = Math.round(subtotal * BILLING_CONFIG.svc_rate);
  const vat       = Math.round(subtotal * BILLING_CONFIG.vat_rate);
  const total     = subtotal + svc + vat;

  /* Cache computed values */
  reservation._nights   = nights;
  reservation._rate     = nightRate;
  reservation._subtotal = subtotal;
  reservation._svc      = svc;
  reservation._vat      = vat;
  reservation._total    = total;
  reservation._room     = reservation?.roomLabel || rateObj?.label || reservation?.roomKey || '—';
  
  // Re-save to session storage to ensure values persist correctly
  sessionStorage.setItem('pendingReservation', JSON.stringify(reservation));

  setText('confId',           reservation?.id);
  setText('confCheckIn',      formatDate(reservation?.checkIn));
  setText('confCheckOut',     formatDate(reservation?.checkOut));
  setText('confNightsSummary', nights + (nights===1?' Night':' Nights') + ', ' + getGuestLabel(reservation?.guests));
  setText('confRoomLine',     reservation?._room);
  setText('confGuestLine',    getGuestLabel(reservation?.guests) + '  ·  ' + formatPHP(nightRate) + ' / night');
  setText('confSubtotal',     formatPHP(subtotal));
  setText('confServiceFee',   formatPHP(svc));
  setText('confVat',          formatPHP(vat));
  setText('confTotal',        formatPHP(total));

  /* ── Sidebar (Step 1) ── */
  setText('sbRoom',     reservation?._room);
  setText('sbGuests',   getGuestLabel(reservation?.guests));
  setText('sbRate',     formatPHP(nightRate) + ' / night');
  setText('sbNights',   nights + (nights===1?' night':' nights'));
  setText('sbCheckIn',  formatDate(reservation?.checkIn));
  setText('sbCheckOut', formatDate(reservation?.checkOut));
  setText('sbSubtotal', formatPHP(subtotal));
  setText('sbService',  formatPHP(svc));
  setText('sbVat',      formatPHP(vat));
  setText('sbGrand',    formatPHP(total));

  // Ensure layouts are toggled correctly BEFORE population to ensure they are visible even if partial error occurs
  console.log('Billing: Revealing layout');
  if ($('noResNotice')) $('noResNotice').style.display = 'none';
  if ($('confLayout'))  $('confLayout').style.display  = 'grid'; // Grid layout per CSS
}

/* Go to payment page */
function goToPayment() {
  if (!reservation) { showToast('No reservation found. Please book again.', 'error'); return; }
  fillPaymentSummary();
  showStep(2);
}

function goBack() { showStep(1); }

function fillPaymentSummary() {
  if (!reservation) return;
  setText('ps-id',      reservation?.id);
  setText('ps-room',    reservation?._room);
  setText('ps-guests',  getGuestLabel(reservation?.guests));
  setText('ps-in',      formatDateShort(reservation?.checkIn));
  setText('ps-out',     formatDateShort(reservation?.checkOut));
  setText('ps-nights',  (reservation?._nights || 0) + (reservation?._nights===1?' night':' nights'));
  setText('ps-sub',     formatPHP(reservation?._subtotal || 0));
  setText('ps-svc',     formatPHP(reservation?._svc || 0));
  setText('ps-vat',     formatPHP(reservation?._vat || 0));
  setText('ps-total',   formatPHP(reservation?._total || 0));
}

function selectMethod(m) {
  selectedMethod = m;
  ['cash','gcash','bank'].forEach(k => {
    $('meth' + k.charAt(0).toUpperCase() + k.slice(1)).classList.toggle('active', k === m);
    $('panel' + k.charAt(0).toUpperCase() + k.slice(1)).style.display = (k === m) ? '' : 'none';
  });
}

/* Validate + submit payment */
async function submitPayment() {
  let ok = true;
  const err  = (id, msg) => { setText(id + 'Err', msg); ok = false; };
  const clr  = id => setText(id + 'Err', '');

  ['pfirst','plast','pemail','pphone'].forEach(clr);
  clr('pTerms');

  if (!$('pfirst').value.trim()) err('pfirst', 'First name is required.');
  if (!$('plast').value.trim())  err('plast',  'Last name is required.');
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test($('pemail').value.trim())) err('pemail', 'Please enter a valid email.');
  if (!$('pphone').value.trim()) err('pphone', 'Phone number is required.');

  if (selectedMethod === 'gcash' && !$('pgcashRef').value.trim()) {
    setText('pgcashRefErr', 'GCash reference number is required.');
    ok = false;
  }
  if (selectedMethod === 'bank' && !$('pbankRef').value.trim()) {
    setText('pbankRefErr', 'Bank reference number is required.');
    ok = false;
  }
  if (!$('pTerms').checked) { setText('pTermsErr', 'You must agree to the terms to continue.'); ok = false; }

  if (!ok) { showToast('Please fix the errors above.', 'error'); return; }

  // Show a loading UI state natively here if we want, or just wait for network
  const submitBtn = document.querySelector('.btn-primary[type="button"]');
  const oldText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) submitBtn.textContent = 'Processing...';

  const guest = {
    firstName: $('pfirst').value.trim(),
    lastName:  $('plast').value.trim(),
    email:     $('pemail').value.trim(),
    phone:     $('pphone').value.trim(),
    notes:     $('pnotes').value.trim(),
    method:    selectedMethod,
  };

  try {
    const fd = new FormData();
    fd.append("reservation_id", reservation.dbId); 
    fd.append("csrf_token",     getCSRFToken()); // SEC-01: Inject CSRF token
    
    // Phase 1: Securely append guest data to store in backend
    fd.append("guest_name", guest.firstName + " " + guest.lastName);
    fd.append("guest_email", guest.email);
    fd.append("guest_phone", guest.phone);
    
    // Call our new backend to lock the state and recalculate the secure price 
    const response = await fetch("confirm_payment.php", { method: "POST", body: fd });
    const result   = await response.json();

    if (result.success) {
      const methodLabels = { cash:'Cash on Check-In', gcash:'GCash', bank:'Bank Transfer' };
      const r = result.receipt;

      reservation.guest  = guest;
      reservation.status = 'Confirmed';
      reservation.confirmedAt = new Date().toISOString();
      sessionStorage.setItem('confirmedReservation', JSON.stringify(reservation));
      sessionStorage.removeItem('pendingReservation');

      /* ── Populate receipt with BACKEND confirmed numbers ── */
      setText('rcId',          reservation.id);
      setText('rcGuest',       guest.firstName + ' ' + guest.lastName);
      setText('rcEmail',       guest.email);
      setText('rcPhone',       guest.phone);
      setText('rcMethod',      methodLabels[guest.method] || guest.method);
      setText('rcCheckIn',     formatDate(reservation.checkIn));
      setText('rcCheckOut',    formatDate(reservation.checkOut));
      
      // Use Backend exact values for price components
      setText('rcNights',      r.nights + (r.nights === 1 ? ' night' : ' nights'));
      setText('rcRoomLine',    r.room + ' (' + getGuestLabel(reservation.guests) + ')');
      setText('rcSubtotal',    formatPHP(r.subtotal));
      setText('rcServiceFee',  formatPHP(r.svc));
      setText('rcVat',         formatPHP(r.vat));
      setText('rcTotal',       formatPHP(r.total));

      showStep(3);
      showToast('Reservation confirmed! 🎉', 'success');
      
    } else {
      if (submitBtn) submitBtn.textContent = oldText;
      showToast(result.message || 'Payment processing failed.', 'error');
    }
  } catch (err) {
    if (submitBtn) submitBtn.textContent = oldText;
    console.error(err);
    showToast('Network error, please try again.', 'error');
  }
}


/* Local showToast removed in favor of utils.js version */

/* Modal and password toggles moved to core.js */


/* Navbar scroll and mobile menu listeners moved to core.js */


initConfiguration();
showStep(1);