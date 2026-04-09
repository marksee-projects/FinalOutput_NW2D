const ROOM_RATES = {
  'Villa 1':       { label:'Villa 1',               dayRate:2500, nightRate:3000 },
  'Villa A':       { label:'Villa A',               dayRate:2500, nightRate:3000 },
  'Villa D':       { label:'Villa D',               dayRate:4000, nightRate:4500 },
  'Alejandro':    { label:'Alejandro',             dayRate:3500, nightRate:4000 },
};

const SVC_RATE = 0.05;
const VAT_RATE = 0.12;

let currentStep    = 1;
let reservation    = null;  // from sessionStorage
let selectedMethod = 'cash';

/* ---------------------------------------------------------------
   HELPERS
--------------------------------------------------------------- */
const $ = id => document.getElementById(id);
const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };

function php(n) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });
}
function fmtDateShort(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
}
function guestLabel(g) {
  return ({ '1':'1 Guest','2':'2 Guests','3':'3 Guests','4':'4 Guests','5+':'5+ Guests' })[g] || (g + ' Guests');
}
function calcNights(a, b) {
  if (!a || !b) return 0;
  const diff = new Date(b) - new Date(a);
  return isNaN(diff) ? 0 : Math.max(0, Math.round(diff / 86400000));
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
  console.log("Reservation Data:", reservation);

  if (!raw) {
    $('noResNotice').style.display = '';
    $('confLayout').style.display  = 'none';
    return;
  }

  reservation = JSON.parse(raw);

 
  const rate      = ROOM_RATES[reservation.roomKey] || { label: reservation.roomKey, dayRate: 0, nightRate: 0 };
  
  const nights    = Number(reservation.nights) || calcNights(reservation.checkIn, reservation.checkOut) || 0;
  const nightRate = Number(reservation.nightRate) || Number(rate.nightRate) || 0;
  
  const subtotal  = nights * nightRate;
  const svc       = Math.round(subtotal * SVC_RATE);
  const vat       = Math.round(subtotal * VAT_RATE);
  const total     = subtotal + svc + vat;

  /* Cache computed values */
  reservation._nights   = nights;
  reservation._rate     = nightRate;
  reservation._subtotal = subtotal;
  reservation._svc      = svc;
  reservation._vat      = vat;
  reservation._total    = total;
  reservation._room     = reservation.roomLabel || rate.label || reservation.roomKey || '—';
  
  // Re-save to session storage to ensure values persist correctly
  sessionStorage.setItem('pendingReservation', JSON.stringify(reservation));

  setText('confId',           reservation.id);
  setText('confCheckIn',      fmtDate(reservation.checkIn));
  setText('confCheckOut',     fmtDate(reservation.checkOut));
  setText('confNightsSummary', nights + (nights===1?' Night':' Nights') + ', ' + guestLabel(reservation.guests));
  setText('confRoomLine',     reservation._room);
  setText('confGuestLine',    guestLabel(reservation.guests) + '  ·  ' + php(nightRate) + ' / night');
  setText('confSubtotal',     php(subtotal));
  setText('confServiceFee',   php(svc));
  setText('confVat',          php(vat));
  setText('confTotal',        php(total));

  setText('sbRoom',     reservation._room);
  setText('sbGuests',   guestLabel(reservation.guests));
  setText('sbRate',     php(nightRate) + ' / night');
  setText('sbNights',   nights + (nights===1?' night':' nights'));
  setText('sbCheckIn',  fmtDate(reservation.checkIn));
  setText('sbCheckOut', fmtDate(reservation.checkOut));
  setText('sbSubtotal', php(subtotal));
  setText('sbService',  php(svc));
  setText('sbVat',      php(vat));
  setText('sbGrand',    php(total));

  $('noResNotice').style.display = 'none';
  $('confLayout').style.display  = '';
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
  setText('ps-id',      reservation.id);
  setText('ps-room',    reservation._room);
  setText('ps-guests',  guestLabel(reservation.guests));
  setText('ps-in',      fmtDateShort(reservation.checkIn));
  setText('ps-out',     fmtDateShort(reservation.checkOut));
  setText('ps-nights',  reservation._nights + (reservation._nights===1?' night':' nights'));
  setText('ps-sub',     php(reservation._subtotal));
  setText('ps-svc',     php(reservation._svc));
  setText('ps-vat',     php(reservation._vat));
  setText('ps-total',   php(reservation._total));
}

function selectMethod(m) {
  selectedMethod = m;
  ['cash','gcash','bank'].forEach(k => {
    $('meth' + k.charAt(0).toUpperCase() + k.slice(1)).classList.toggle('active', k === m);
    $('panel' + k.charAt(0).toUpperCase() + k.slice(1)).style.display = (k === m) ? '' : 'none';
  });
}

/* Validate + submit payment */
function submitPayment() {
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

  
  const guest = {
    firstName: $('pfirst').value.trim(),
    lastName:  $('plast').value.trim(),
    email:     $('pemail').value.trim(),
    phone:     $('pphone').value.trim(),
    notes:     $('pnotes').value.trim(),
    method:    selectedMethod,
  };

  const methodLabels = { cash:'Cash on Check-In', gcash:'GCash', bank:'Bank Transfer' };

  reservation.guest  = guest;
  reservation.status = 'Confirmed';
  reservation.confirmedAt = new Date().toISOString();
  sessionStorage.setItem('confirmedReservation', JSON.stringify(reservation));
  sessionStorage.removeItem('pendingReservation');

  /* ── Populate receipt ── */
  setText('rcId',          reservation.id);
  setText('rcGuest',       guest.firstName + ' ' + guest.lastName);
  setText('rcEmail',       guest.email);
  setText('rcPhone',       guest.phone);
  setText('rcMethod',      methodLabels[guest.method] || guest.method);
  setText('rcCheckIn',     fmtDate(reservation.checkIn));
  setText('rcCheckOut',    fmtDate(reservation.checkOut));
  setText('rcNights',      reservation._nights + (reservation._nights===1?' night':' nights'));
  setText('rcRoomLine',    reservation._room + ' (' + guestLabel(reservation.guests) + ')');
  setText('rcSubtotal',    php(reservation._subtotal));
  setText('rcServiceFee', php(reservation._svc));
  setText('rcVat',         php(reservation._vat));
  setText('rcTotal',       php(reservation._total));

  showStep(3);
  showToast('Reservation confirmed! 🎉', 'success');
}


function showToast(msg, type='success') {
  const t = $('toast');
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  t.innerHTML = `<i class="fa-solid ${icons[type]||'fa-circle-info'}"></i> ${msg}`;
  t.className = `toast ${type} show`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3800);
}

/* ------- LOGIN MODAL ------- */
function openLoginModal()  { $('loginModal').classList.add('active'); }
function closeLoginModal() { $('loginModal').classList.remove('active'); }
function togglePassword() {
  const inp = $('loginPassword'), icon = $('eyeIcon');
  if (inp.type === 'password') { inp.type='text';     icon.classList.replace('fa-eye','fa-eye-slash'); }
  else                         { inp.type='password'; icon.classList.replace('fa-eye-slash','fa-eye'); }
}


const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 10));
$('hamburger').addEventListener('click', function() {
  this.classList.toggle('open');
  $('mobileMenu').classList.toggle('open');
});
$('loginModal').addEventListener('click', e => { if (e.target === $('loginModal')) closeLoginModal(); });


if ($('year')) $('year').textContent = new Date().getFullYear();


loadConfirmation();
showStep(1);