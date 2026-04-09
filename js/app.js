/**
 * Peninsula de Bataan Resort Hotel — script.js
 * Handles: navbar scroll, mobile menu, form validation, modal, toast, smooth scroll
 * Ready for backend integration — see TODO comments throughout
 */

'use strict';

/* =================================================================
   CONSTANTS & STATE
   ================================================================= */
const navbar      = document.getElementById('navbar');
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobileMenu');
const loginModal  = document.getElementById('loginModal');
const toast       = document.getElementById('toast');
const yearSpan    = document.getElementById('year');

/* Room rates keyed by DB value → display label + pricing */
const ROOM_RATES = {
  'villa1':    { label: 'Villa 1',   dayRate: 2500, nightRate: 3000 },
  'villaA':    { label: 'Villa A',   dayRate: 2500, nightRate: 3000 },
  'villaD':    { label: 'Villa D',   dayRate: 4000, nightRate: 4500 },
  'alejandro': { label: 'Alejandro', dayRate: 3500, nightRate: 4000 },
};

// Set current year in footer
if (yearSpan) yearSpan.textContent = new Date().getFullYear();


/* =================================================================
   NAVBAR — scroll effect
   ================================================================= */
function handleNavbarScroll() {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', handleNavbarScroll, { passive: true });
handleNavbarScroll(); // run on load


/* =================================================================
   MOBILE MENU — hamburger toggle
   ================================================================= */
hamburger.addEventListener('click', function () {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  // Prevent body scroll when menu is open
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

// Close mobile menu when a link is clicked
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', false);
    document.body.style.overflow = '';
  });
});


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


/* =================================================================
   TOAST NOTIFICATION HELPER
   ================================================================= */
let toastTimer = null;

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3800);
}


/* =================================================================
   FORM VALIDATION HELPERS
   ================================================================= */

/**
 * Sets an error on an input field.
 * @param {HTMLElement} input
 * @param {HTMLElement} errorEl
 * @param {string} message
 */
function setError(input, errorEl, message) {
  input.classList.add('invalid');
  if (errorEl) errorEl.textContent = message;
}

/**
 * Clears error state on an input field.
 */
function clearError(input, errorEl) {
  input.classList.remove('invalid');
  if (errorEl) errorEl.textContent = '';
}

/**
 * Validates an email format.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    const res  = await fetch(url);
    const data = await res.json();

    bookedRooms = data.booked_rooms || [];
    availChecked = true;
    updateRoomDropdown();

    const totalRooms = roomOptionDefaults.filter(o => o.value).length;  // exclude placeholder
    const availCount = totalRooms - bookedRooms.length;

    if (availCount === 0) {
      showBanner('All rooms are fully booked for these dates. Please try different dates.', 'error');
      formState = 'check';
    } else if (bookedRooms.length > 0) {
      showBanner(`${availCount} of ${totalRooms} rooms available. Unavailable rooms are greyed out.`, 'warning');
      formState = 'check'; // still need to pick a room
    } else {
      showBanner('All rooms are available for your selected dates!', 'success');
      formState = 'check'; // still need to pick a room
    }

  } catch (err) {
    console.error('Availability check failed:', err);
    showBanner('Could not check availability. Make sure XAMPP is running.', 'error');
    bookedRooms = [];
    availChecked = false;
  }

  updateSmartButton();
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
    formData.append("check_in",  checkIn.value);
    formData.append("check_out", checkOut.value);
    formData.append("guests",    guests.value);
    formData.append("room_type", roomType.value);

    try {
      const response = await fetch("save_booking.php", {
        method: "POST",
        body:   formData,
      });

      const result = await response.json();

      if (result.success) {
        const roomKey   = roomType.value;
        const rate      = ROOM_RATES[roomKey] || {};
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
      showToast("❌ Could not connect to the server. Make sure XAMPP is running.", "error");
      formState = 'check';
      updateSmartButton();
    }
  }
});


/* =================================================================
   CONTACT FORM — validation + submission
   ================================================================= */

  
/* =================================================================
   LOGIN MODAL 
   ================================================================= */
  // Modal controls
function openLoginModal() {
  document.getElementById('loginModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('active');
  document.body.style.overflow = '';
}
// Close when clicking the dark overlay
document.getElementById('loginModal').addEventListener('click', function(e) {
  if (e.target === this) closeLoginModal();
});
// Close on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLoginModal();
});
// Toggle password visibility
function togglePassword() {
  const pw = document.getElementById('loginPassword');
  const icon = document.getElementById('eyeIcon');
  if (pw.type === 'password') {
    pw.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    pw.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

/* =================================================================
   REGISTER MODAL 
   ================================================================= */

   // Register modal controls
function openRegisterModal() {
  document.getElementById('registerModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeRegisterModal() {
  document.getElementById('registerModal').classList.remove('active');
  document.body.style.overflow = '';
}

// Switch between modals
function switchToRegister() {
  closeLoginModal();
  setTimeout(() => openRegisterModal(), 150);
}
function switchToLogin() {
  closeRegisterModal();
  setTimeout(() => openLoginModal(), 150);
}

// Close register modal on backdrop click
document.getElementById('registerModal').addEventListener('click', function(e) {
  if (e.target === this) closeRegisterModal();
});

// Toggle password visibility for register
function toggleRegPassword() {
  const pw = document.getElementById('regPassword');
  const icon = document.getElementById('regEyeIcon');
  if (pw.type === 'password') {
    pw.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    pw.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}
function toggleRegConfirmPassword() {
  const pw = document.getElementById('regConfirmPassword');
  const icon = document.getElementById('regConfirmEyeIcon');
  if (pw.type === 'password') {
    pw.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    pw.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}


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
  };

  try {
    const res  = await fetch('register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
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

/* =================================================================
   SESSION CHECK — replace Login button with first name
   ================================================================= */
async function checkSession() {
  try {
    const res = await fetch('session.php');
    if (!res.ok) return;
    const data = await res.json();

    if (data.loggedIn) {
      // Update DESKTOP nav
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.textContent = data.firstName;
        loginBtn.setAttribute('onclick', '');
        loginBtn.addEventListener('click', handleLogout);
      }
      
      // Update MOBILE nav
      const loginBtnMobile = document.getElementById('loginBtnMobile');
      if (loginBtnMobile) {
        loginBtnMobile.textContent = data.firstName;
        loginBtnMobile.setAttribute('onclick', '');
        loginBtnMobile.addEventListener('click', handleLogout);
      }

      // Inject Receptionist button natively into the main navigation flow
      if (data.role === 'receptionist') {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && !document.getElementById('dashBtnDesktop')) {
          const dash = document.createElement('a');
          dash.href = 'receptionist.html';
          dash.id = 'dashBtnDesktop';
          dash.textContent = 'Receptionist';
          navLinks.appendChild(dash);
        }

        const mobileNav = document.querySelector('.mobile-menu nav');
        if (mobileNav && !document.getElementById('dashBtnMobile')) {
          const dashMob = document.createElement('a');
          dashMob.href = 'receptionist.html';
          dashMob.className = 'mobile-link';
          dashMob.id = 'dashBtnMobile';
          dashMob.textContent = 'Receptionist';
          // Insert it dynamically before the mobile-cta block
          const mobileCta = mobileNav.querySelector('.mobile-cta');
          if (mobileCta) {
            mobileNav.insertBefore(dashMob, mobileCta);
          } else {
            mobileNav.appendChild(dashMob);
          }
        }
      }
    } else {
      localStorage.clear();
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
}

function handleLogout(e) {
  e.preventDefault();
  if (confirm('Are you sure you want to log out?')) {
    localStorage.clear();
    window.location.href = 'logout.php';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkSession();

  if (!localStorage.getItem('firstName')) {
    openLoginModal();
  }
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