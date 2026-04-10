/**
 * Peninsula de Bataan Resort Hotel — script.js
 * Handles: navbar scroll, mobile menu, form validation, modal, toast, smooth scroll
 * Ready for backend integration — see TODO comments throughout
 */

'use strict';

/* =================================================================
   CONSTANTS & STATE
   ================================================================= */
/* Navbar, Mobile Menu, and Modals have been moved to core.js */

/* State: Cached configuration from the backend */
let APP_CONFIG = {
  room_rates: {},
  svc_rate: 0,
  vat_rate: 0
};



/* =================================================================
   SMOOTH SCROLLING — anchor links
   ================================================================= */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (!target) return;
    e.preventDefault();
    const navH = navbar.offsetHeight;
    const top  = target.getBoundingClientRect().top + window.scrollY - navH;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});


/**
 * Configuration Initialization
 */
async function initConfiguration() {
  try {
    const res = await fetch('get_config.php');
    const data = await res.json();
    if (data.success) {
      APP_CONFIG.room_rates = data.room_rates;
      APP_CONFIG.svc_rate   = data.svc_rate;
      APP_CONFIG.vat_rate   = data.vat_rate;
      
      // Update room rates if they were already mapped
      if (typeof roomOptionDefaults !== 'undefined') {
         updateRoomDropdown();
      }
    }
  } catch (err) {
    console.error('Failed to load configuration:', err);
  }
}

/**
 * Dynamic Subtotal Estimation (IMP-02)
 */
function updateEstimatedSubtotal() {
  const inVal  = checkIn.value;
  const outVal = checkOut.value;
  const rType  = roomType.value;
  
  if (!inVal || !outVal || !rType || !APP_CONFIG.room_rates[rType]) {
    hideBanner();
    return;
  }
  
  const nights = calculateNights(inVal, outVal);
  if (nights <= 0) return;
  
  const rateObj  = APP_CONFIG.room_rates[rType];
  const subtotal = nights * rateObj.nightRate;
  const svc      = Math.round(subtotal * APP_CONFIG.svc_rate);
  const vat      = Math.round(subtotal * APP_CONFIG.vat_rate);
  const total    = subtotal + svc + vat;
  
  showBanner(`Estimated Total: ${formatPHP(total)} for ${nights} night(s).`, 'info');
}


/* =================================================================
   BOOKING FORM — Smart Button + Availability Check
   ================================================================= */
const bookingForm = document.getElementById("bookingForm");

const checkIn   = document.getElementById("checkIn");
const checkOut  = document.getElementById("checkOut");
const guests    = document.getElementById("guests");
const roomType  = document.getElementById("roomType");

const checkInError  = document.getElementById("checkInError");
const checkOutError = document.getElementById("checkOutError");
const guestsError   = document.getElementById("guestsError");
const roomTypeError = document.getElementById("roomTypeError");

const smartBtn      = document.getElementById("smartBtn");
const smartBtnText  = document.getElementById("smartBtnText");
const smartBtnIcon  = document.getElementById("smartBtnIcon");
const availBanner   = document.getElementById("availBanner");
const availBannerTx = document.getElementById("availBannerText");

// Original room option labels (before we append "Unavailable")
const roomOptionDefaults = [];
Array.from(roomType.options).forEach(opt => {
  roomOptionDefaults.push({ value: opt.value, text: opt.textContent });
});

// ── State machine ──
// 'check'   → User needs to pick dates; button says "Check Availability"
// 'proceed' → Dates are valid + room available; button says "Proceed to Billing"
let formState    = 'check';
let bookedRooms  = [];   // array of room_type keys currently unavailable
let availChecked = false; // have we checked availability for the current dates?

// Set today as min date for check-in
const today = new Date().toISOString().split('T')[0];
checkIn.setAttribute('min', today);

/* ── Update the button appearance based on state ── */
function updateSmartButton() {
  smartBtn.classList.remove('btn-proceed', 'btn-loading');
  smartBtn.disabled = false;

  if (formState === 'check') {
    smartBtnIcon.className = 'fa-solid fa-magnifying-glass';
    smartBtnText.textContent = 'Check Availability';
  } else if (formState === 'proceed') {
    smartBtn.classList.add('btn-proceed');
    smartBtnIcon.className = 'fa-solid fa-arrow-right';
    smartBtnText.textContent = 'Proceed to Billing';
  }
}

/* ── Show/hide the status banner ── */
function showBanner(message, type) {
  // type: 'success' | 'warning' | 'error'
  availBanner.className = 'avail-banner avail-' + type;
  availBanner.style.display = 'flex';
  const iconMap = {
    success: 'fa-solid fa-circle-check',
    warning: 'fa-solid fa-triangle-exclamation',
    error:   'fa-solid fa-circle-xmark',
  };
  availBanner.querySelector('i').className = iconMap[type] || 'fa-solid fa-circle-info';
  availBannerTx.textContent = message;
}

function hideBanner() {
  availBanner.style.display = 'none';
}

/* ── Update room dropdown based on availability ── */
function updateRoomDropdown() {
  roomOptionDefaults.forEach(({ value, text }) => {
    const opt = roomType.querySelector(`option[value="${value}"]`);
    if (!opt) return;
    if (bookedRooms.includes(value)) {
      opt.textContent = text + ' (Unavailable)';
      opt.disabled = true;
      opt.classList.add('room-unavailable');
    } else {
      opt.textContent = text;
      opt.disabled = false;
      opt.classList.remove('room-unavailable');
    }
  });

  // If currently selected room is now unavailable, deselect it
  if (roomType.value && bookedRooms.includes(roomType.value)) {
    roomType.value = '';
    formState = 'check';
    updateSmartButton();
  }
}

/* ── Check availability via backend ── */
async function checkAvailability() {
  if (!checkIn.value || !checkOut.value) return;

  // Validate dates first
  const inDate  = new Date(checkIn.value);
  const outDate = new Date(checkOut.value);
  if (outDate <= inDate) {
    checkOutError.textContent = 'Check-out must be after check-in.';
    return;
  }

  // Set min for checkout
  checkOut.setAttribute('min', checkIn.value);

  // Show loading state
  smartBtn.classList.add('btn-loading');
  smartBtnIcon.className = 'fa-solid fa-spinner fa-spin';
  smartBtnText.textContent = 'Checking...';

  try {
    const url = `check_availability.php?in=${encodeURIComponent(checkIn.value)}&out=${encodeURIComponent(checkOut.value)}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Could not verify availability.');
    }

    bookedRooms = data.booked_rooms || [];
    availChecked = true;
    updateRoomDropdown();

    const totalRooms = roomOptionDefaults.filter(o => o.value).length;
    const availCount = totalRooms - bookedRooms.length;

    if (availCount === 0) {
      showBanner('All rooms are fully booked for these dates. Please try different dates.', 'error');
      formState = 'check';
    } else if (bookedRooms.length > 0) {
      showBanner(`${availCount} of ${totalRooms} rooms available. Unavailable rooms are greyed out.`, 'warning');
      formState = 'check';
    } else {
      showBanner('All rooms are available for your selected dates!', 'success');
      formState = 'check';
    }

  } catch (err) {
    console.error('Availability check failed:', err);
    showBanner(`❌ ${err.message}`, 'error');
    bookedRooms = [];
    availChecked = false;
  } finally {
    updateSmartButton();
  }
}

/* ── When dates change, reset availability and re-check ── */
checkIn.addEventListener('change', () => {
  checkInError.textContent = '';
  // Set min checkout to check-in date
  if (checkIn.value) {
    checkOut.setAttribute('min', checkIn.value);
    // If checkout is before new check-in, clear it
    if (checkOut.value && checkOut.value <= checkIn.value) {
      checkOut.value = '';
    }
  }
  availChecked = false;
  formState = 'check';
  hideBanner();
  updateSmartButton();

  // Auto-check if both dates are set
  if (checkIn.value && checkOut.value) {
    checkAvailability();
    updateEstimatedSubtotal();
  }
});

checkOut.addEventListener('change', () => {
  checkOutError.textContent = '';
  availChecked = false;
  formState = 'check';
  hideBanner();
  updateSmartButton();

  // Auto-check if both dates are set
  if (checkIn.value && checkOut.value) {
    // Validate checkout > checkin
    if (new Date(checkOut.value) <= new Date(checkIn.value)) {
      checkOutError.textContent = 'Check-out must be after check-in.';
      return;
    }
    checkAvailability();
    updateEstimatedSubtotal();
  }
});

/* ── When room changes, update button state ── */
roomType.addEventListener('change', () => {
  roomTypeError.textContent = '';
  if (availChecked && roomType.value && !bookedRooms.includes(roomType.value)) {
    formState = 'proceed';
  } else {
    formState = 'check';
  }
  updateSmartButton();
  updateEstimatedSubtotal();
});

guests.addEventListener('change', () => {
  guestsError.textContent = '';
});

/* ── Form submit handler (smart button) ── */
bookingForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  let valid = true;

  // Clear previous errors
  checkInError.textContent  = "";
  checkOutError.textContent = "";
  guestsError.textContent   = "";
  roomTypeError.textContent = "";

  // Validate check-in
  if (!checkIn.value) {
    checkInError.textContent = "Please select check-in date.";
    valid = false;
  }

  // Validate check-out
  if (!checkOut.value) {
    checkOutError.textContent = "Please select check-out date.";
    valid = false;
  }

  // Check-out must be after check-in
  if (checkIn.value && checkOut.value) {
    if (new Date(checkOut.value) <= new Date(checkIn.value)) {
      checkOutError.textContent = "Check-out must be after check-in.";
      valid = false;
    }
  }

  // Validate guests
  if (!guests.value) {
    guestsError.textContent = "Please select number of guests.";
    valid = false;
  }

  // Validate room
  if (!roomType.value) {
    roomTypeError.textContent = "Please select a room type.";
    valid = false;
  }

  if (!valid) return;

  // ── STATE: CHECK → run availability ──
  if (formState === 'check') {
    await checkAvailability();

    // After checking, if a valid room is already selected, auto-advance
    if (availChecked && roomType.value && !bookedRooms.includes(roomType.value)) {
      formState = 'proceed';
      updateSmartButton();
      showToast('✅ Room is available! Click "Proceed to Billing" to continue.', 'success');
    }
    return;
  }

  // ── STATE: PROCEED → save booking + redirect to billing ──
  if (formState === 'proceed') {
    // Show loading
    smartBtn.classList.add('btn-loading');
    smartBtnIcon.className = 'fa-solid fa-spinner fa-spin';
    smartBtnText.textContent = 'Saving...';

    const formData = new FormData();
    formData.append("check_in",   checkIn.value);
    formData.append("check_out",  checkOut.value);
    formData.append("guests",     guests.value);
    formData.append("room_type",  roomType.value);
    formData.append("csrf_token", getCSRFToken());

    try {
      const response = await fetch("save_booking.php", {
        method: "POST",
        body:   formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const roomKey   = roomType.value;
        const rate      = APP_CONFIG.room_rates[roomKey] || {};
        const nightRate = rate.nightRate || 0;
        const n = Math.max(1, Math.round(
          (new Date(checkOut.value) - new Date(checkIn.value)) / 86400000
        ));

        const reservation = {
          id:        'R' + String(result.id).padStart(3, '0'),
          dbId:      result.id,
          checkIn:   checkIn.value,
          checkOut:  checkOut.value,
          guests:    guests.value,
          roomKey:   roomKey,
          roomLabel: rate.label || roomKey,
          nightRate: nightRate,
          nights:    n,
          status:    'Pending'
        };

        sessionStorage.setItem('pendingReservation', JSON.stringify(reservation));
        showToast("✅ Reservation saved! Redirecting to billing...", "success");

        // Redirect to billing after short delay for toast visibility
        setTimeout(() => {
          window.location.href = 'billing.html';
        }, 800);

      } else if (result.conflict) {
        showBanner('This room is already booked for those dates. Please choose a different room or dates.', 'error');
        showToast("❌ Room is no longer available.", "error");
        formState = 'check';
        updateSmartButton();
        // Re-check availability to refresh dropdown
        await checkAvailability();

      } else {
        showToast("❌ Error: " + result.message, "error");
        formState = 'check';
        updateSmartButton();
      }

    } catch (err) {
      console.error("Fetch error:", err);
      showToast(`❌ ${err.message}`, "error");
      formState = 'check';
      updateSmartButton();
    }
  }
});


/* =================================================================
   CONTACT FORM — validation + submission
   ================================================================= */

  
/* Modal toggles and session check moved to core.js */


// ===== LOGIN SUBMIT =====
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const btn = this.querySelector('button[type="submit"]');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  const payload = {
    email:    document.getElementById('loginEmail').value.trim(),
    password: document.getElementById('loginPassword').value,
  };

  try {
    const res  = await fetch('login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('firstName', data.user.name.split(' ')[0]);
      localStorage.setItem('role', data.user.role); 
      setCSRFToken(data.user.csrf_token);
      showToast(data.message, 'success');
      closeLoginModal();
      setTimeout(() => {
        if (data.user.role === 'receptionist') {
      window.location.href = 'receptionist.html';
    } else {
      window.location.href = 'index.html';
    }
  }, 1000);
    } else {
      showToast(data.message || 'Invalid email or password.', 'error');
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
});

// ===== REGISTER SUBMIT =====
document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const agree = document.getElementById('agreeTerms');
  if (!agree.checked) {
    showToast('You must agree to the Terms & Conditions.');
    return;
  }

  const btn = this.querySelector('button[type="submit"]');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  const payload = {
    first_name:       document.getElementById('regFirstName').value.trim(),
    last_name:        document.getElementById('regLastName').value.trim(),
    email:            document.getElementById('regEmail').value.trim(),
    phone:            document.getElementById('regPhone').value.trim(),
    password:         document.getElementById('regPassword').value,
    confirm_password: document.getElementById('regConfirmPassword').value,
    role:             'user',
    csrf_token:       getCSRFToken(),
  };

  try {
    const res  = await fetch('register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      setCSRFToken(data.user.csrf_token);
      showToast(data.message);
      closeRegisterModal();
      this.reset();
      setTimeout(() => openLoginModal(), 1000);
      
    } else {
      showToast(data.message);
    }
  } catch (err) {
    showToast('Network error. Please try again.');
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
});

/* Session check and handleLogout moved to core.js */

document.addEventListener('DOMContentLoaded', () => {
  initConfiguration();
  // checkSession and modal checks are now handled in core.js
});
/* =================================================================
   SCROLL REVEAL — simple intersection observer for cards
   ================================================================= */
const observerOptions = {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Apply reveal animation to cards
document.querySelectorAll(
  '.room-card, .amenity-card, .event-card, .about-grid, .contact-grid'
).forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(28px)';
  el.style.transition = 'opacity .6s ease, transform .6s ease';
  revealObserver.observe(el);
});

// Stagger children inside grids
document.querySelectorAll('.rooms-grid, .amenities-grid, .events-grid').forEach(grid => {
  Array.from(grid.children).forEach((child, i) => {
    child.style.transitionDelay = `${i * 0.09}s`;
  });
});