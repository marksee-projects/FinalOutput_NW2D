/**
 * Peninsula de Bataan Resort Hotel — utils.js
 * Common utility functions shared across the application.
 */

'use strict';

/**
 * DOM Helpers
 */
const $ = id => document.getElementById(id);

const setText = (id, val) => { 
  const el = $(id); 
  if (el) el.textContent = val; 
};

/**
 * Formatting Helpers
 */
const formatPHP = (n) => {
  return '₱' + Number(n).toLocaleString('en-PH', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

const formatDate = (str) => {
  if (!str) return '—';
  // Use T00:00:00 to prevent timezone shifting
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatDateShort = (str) => {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const getGuestLabel = (g) => {
  const labels = { 
    '1': '1 Guest', 
    '2': '2 Guests', 
    '3': '3 Guests', 
    '4': '4 Guests', 
    '5+': '5+ Guests' 
  };
  return labels[g] || (g + ' Guests');
};

const calculateNights = (inDate, outDate) => {
  if (!inDate || !outDate) return 0;
  const diff = new Date(outDate) - new Date(inDate);
  return isNaN(diff) ? 0 : Math.max(0, Math.round(diff / 86400000));
};

/**
 * Toast Notification Helper
 */
let toastTimer = null;
const showToast = (message, type = 'info') => {
  const toast = $('toast');
  if (!toast) return;

  const icons = { 
    success: 'fa-solid fa-circle-check', 
    error: 'fa-solid fa-circle-xmark', 
    info: 'fa-solid fa-circle-info',
    warning: 'fa-solid fa-triangle-exclamation'
  };

  toast.innerHTML = `<i class="${icons[type] || icons.info}"></i> ${message}`;
  toast.className = `toast ${type} show`;
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3800);
};

/**
 * Form Validation Helpers
 */
const setError = (input, errorEl, message) => {
  if (!input) return;
  input.classList.add('invalid');
  if (errorEl) errorEl.textContent = message;
};

const clearError = (input, errorEl) => {
  if (!input) return;
  input.classList.remove('invalid');
  if (errorEl) errorEl.textContent = '';
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Security: CSRF Management
 */
const getCSRFToken = () => {
  return sessionStorage.getItem('csrf_token') || '';
};

const setCSRFToken = (token) => {
  if (token) sessionStorage.setItem('csrf_token', token);
};
