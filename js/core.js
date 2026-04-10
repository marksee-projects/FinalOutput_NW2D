/**
 * Peninsula de Bataan Resort Hotel — core.js
 * Centralized logic for Navbar, Session Management, and Global Modals.
 * Shared across Home, Billing, and Receptionist pages.
 */

'use strict';

/**
 * Global UI Elements
 */
const navbar       = document.getElementById('navbar');
const hamburger    = document.getElementById('hamburger');
const mobileMenu   = document.getElementById('mobileMenu');
const loginModal   = document.getElementById('loginModal');
const loginForm    = document.querySelector('.modal-form');
const logoutBtns   = document.querySelectorAll('[onclick="handleLogout()"]');

/**
 * Navbar Scroll Effect
 */
function handleNavbarScroll() {
  if (!navbar) return;
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

/**
 * Session Synchronization
 */
async function checkSession() {
  try {
    const res = await fetch('session.php');
    if (!res.ok) return;
    const data = await res.json();

    if (data.loggedIn) {
      setCSRFToken(data.csrf_token);
      updateNavToLoggedIn(data.firstName, data.role);
    } else {
      updateNavToLoggedOut();
      // Only clear localStorage (UI state) if needed, but KEEP sessionStorage (Guest Reservation data)
      if (localStorage.getItem('firstName')) {
        localStorage.clear();
      }
    }
  } catch (err) {
    console.error('Core: Session check failed:', err);
  }
}

/**
 * Update UI to Logged In state
 */
function updateNavToLoggedIn(name, role) {
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnMobile = document.getElementById('loginBtnMobile');

  [loginBtn, loginBtnMobile].forEach(btn => {
    if (btn) {
      btn.textContent = name;
      btn.setAttribute('onclick', '');
      // Remove any existing listeners and add the logout one
      btn.onclick = (e) => handleLogout(e);
    }
  });

  // Inject Receptionist Dash Link
  if (role === 'receptionist') {
    injectReceptionistLink();
  }
}

/**
 * Update UI to Logged Out state
 */
function updateNavToLoggedOut() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.textContent = 'Login';
    loginBtn.onclick = openLoginModal;
  }
}

/**
 * Inject Receptionist Buttons
 */
function injectReceptionistLink() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks && !document.getElementById('dashBtnDesktop')) {
    const dash = document.createElement('a');
    dash.href = 'receptionist.html';
    dash.id = 'dashBtnDesktop';
    dash.textContent = 'Receptionist';
    // Append as the last item in the main nav flow
    navLinks.appendChild(dash);
  }

  const mobileNav = document.querySelector('.mobile-menu nav');
  if (mobileNav && !document.getElementById('dashBtnMobile')) {
    const dashMob = document.createElement('a');
    dashMob.href = 'receptionist.html';
    dashMob.className = 'mobile-link';
    dashMob.id = 'dashBtnMobile';
    dashMob.textContent = 'Receptionist';
    const mobileCta = mobileNav.querySelector('.mobile-cta');
    if (mobileCta) mobileNav.insertBefore(dashMob, mobileCta);
    else mobileNav.appendChild(dashMob);
  }
}

/**
 * Global Logout
 */
function handleLogout(e) {
  if (e) e.preventDefault();
  if (confirm('Are you sure you want to log out?')) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'logout.php';
  }
}

/**
 * Global Modal Toggles
 */
function openLoginModal()  { if(loginModal) loginModal.classList.add('active'); }
function closeLoginModal() { if(loginModal) loginModal.classList.remove('active'); }

function togglePassword(inputId, iconId) {
  const inp = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!inp || !icon) return;
  
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    inp.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

/**
 * Global Event Listeners
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Checks
  checkSession();
  handleNavbarScroll();

  // 2. Scroll Listeners
  window.addEventListener('scroll', handleNavbarScroll, { passive: true });

  // 3. Hamburger Toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  // 4. Modal Overlay Click
  if (loginModal) {
    loginModal.addEventListener('click', e => {
      if (e.target === loginModal) closeLoginModal();
    });
  }

  // 5. Year Update
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});

// Map global functions to window for onclick handlers compatibility
window.handleLogout = handleLogout;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.togglePassword = togglePassword;
