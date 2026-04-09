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

const ROOM_RATES = {
    'Villa 1':   { nightRate: 3000 },
    'Villa A':   { nightRate: 3000 },
    'Villa D':   { nightRate: 4500 },
    'Alejandro': { nightRate: 4000 }
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
   BOOKING FORM — validation + submission
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

bookingForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  let valid = true;

  // clear previous errors
  checkInError.textContent  = "";
  checkOutError.textContent = "";
  guestsError.textContent   = "";
  roomTypeError.textContent = "";

  // check-in
  if(checkIn.value === "") {
    checkInError.textContent = "Please select check-in date.";
    valid = false;
  }

  // check-out
  if(checkOut.value === "") {
    checkOutError.textContent = "Please select check-out date.";
    valid = false;
  }

  // check-out must be after check-in
  if(checkIn.value && checkOut.value) {
    const inDate  = new Date(checkIn.value);
    const outDate = new Date(checkOut.value);
    if(outDate <= inDate) {
      checkOutError.textContent = "Check-out must be after check-in.";
      valid = false;
    }
  }

  // guests
  if(guests.value === "") {
    guestsError.textContent = "Please select number of guests.";
    valid = false;
  }

  // room type
  if(roomType.value === "") {
    roomTypeError.textContent = "Please select room type.";
    valid = false;
  }

  if(!valid) return;

  // ── Send to PHP ──────────────────────────────
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

    if(result.success) {

      const selectedRoom = roomType.options[roomType.selectedIndex].text;
      const nightRate = ROOM_RATES[selectedRoom]?.nightRate || 0;
      const n = Math.max(1, Math.round(
        (new Date(checkOut.value) - new Date(checkIn.value)) / 86400000
      ));

      const reservation = {
        id:        'R' + String(result.id).padStart(3, '0'),
        dbId:      result.id,
        checkIn:   checkIn.value,
        checkOut:  checkOut.value,
        guests:    guests.value,
        roomLabel: selectedRoom,
        nightRate: nightRate,
        nights:    n,
        status:    'Pending'
      };

      console.log("Saving reservation:", reservation);
      sessionStorage.setItem('pendingReservation', JSON.stringify(reservation));

      showToast("✅ Reservation submitted! (ID #" + result.id + ")", "success");
      bookingForm.reset();

      // show billing button
      document.getElementById("proceedToBilling").style.display = "block";

    } else if(result.conflict) {
      roomTypeError.textContent = "Already booked with someone else. Please choose a different date and room.";
      showToast("❌ This room is already booked for those dates.");
      document.getElementById("proceedToBilling").style.display = "none";

    } else {
      showToast("❌ Error: " + result.message);
      document.getElementById("proceedToBilling").style.display = "none";
    }

  } catch(err) {
    console.error("Fetch error:", err);
    showToast("❌ Could not connect to the server. Make sure XAMPP is running.");
    document.getElementById("proceedToBilling").style.display = "none";
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
function checkSession() {
  const firstName = localStorage.getItem('firstName');

  if (firstName) {
    ['loginBtn', 'loginBtnMobile'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.textContent = firstName;
        btn.setAttribute('onclick', '');
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          if (confirm('Are you sure you want to log out?')) {
            localStorage.clear();
            window.location.href = 'logout.php';
          }
        });
      }
    });
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