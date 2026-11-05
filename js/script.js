/**
 * ENCRE NOCTURNE — script.js
 *
 * Handles:
 *  1. Interactive tattoo hand reveal (CSS mask + pointer tracking)
 *  2. Smooth scroll for Explore button / nav links
 *  3. Hamburger nav toggle (mobile)
 *  4. Booking modal — open / close / form validation
 *  5. Success modal — shown after valid form submission
 */

'use strict';

/* ============================================================
   1. HAND REVEAL — CSS mask driven by pointer position
   ============================================================ */

(function initHandReveal() {
  const container = document.getElementById('handsContainer');
  const tattooHand = document.querySelector('.hero__hand--tattoo');

  if (!container || !tattooHand) return;

  const isTouchOnly = !window.matchMedia('(hover: hover)').matches;
  if (isTouchOnly) return;

  let rafId = null;
  let pendingX = null;
  let pendingY = null;
  let isInside = false;

  function applyPosition() {
    rafId = null;
    if (!isInside) {
      container.style.setProperty('--mouse-x', '-9999px');
      container.style.setProperty('--mouse-y', '-9999px');
      return;
    }
    container.style.setProperty('--mouse-x', pendingX + 'px');
    container.style.setProperty('--mouse-y', pendingY + 'px');
  }

  function scheduleUpdate() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(applyPosition);
  }

  function handlePointerMove(e) {
    const rect = container.getBoundingClientRect();
    pendingX = e.clientX - rect.left;
    pendingY = e.clientY - rect.top;
    scheduleUpdate();
  }

  function handlePointerEnter() { isInside = true; }

  function handlePointerLeave() {
    isInside = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    container.style.setProperty('--mouse-x', '-9999px');
    container.style.setProperty('--mouse-y', '-9999px');
  }

  container.addEventListener('pointerenter', handlePointerEnter, { passive: true });
  container.addEventListener('pointermove',  handlePointerMove,  { passive: true });
  container.addEventListener('pointerleave', handlePointerLeave, { passive: true });

  document.addEventListener('pointerleave', function(e) {
    if (e.target === document.documentElement) handlePointerLeave();
  }, { passive: true });

}());


/* ============================================================
   2. SMOOTH SCROLL
   ============================================================ */

(function initSmoothScroll() {
  function scrollToTarget(targetEl) {
    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const targetTop = targetEl.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  }

  document.addEventListener('click', function(e) {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const hash = anchor.getAttribute('href');
    // Skip modal-trigger links (href="#") and js-open-booking anchors
    if (!hash || hash === '#') return;

    const targetEl = document.querySelector(hash);
    if (!targetEl) return;

    e.preventDefault();
    scrollToTarget(targetEl);

    // Close mobile nav if open
    const menu = document.getElementById('navbar-menu');
    const toggle = document.querySelector('.navbar__toggle');
    if (menu && menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  });

}());


/* ============================================================
   3. HAMBURGER NAV TOGGLE (mobile)
   ============================================================ */

(function initNavToggle() {
  const toggle = document.querySelector('.navbar__toggle');
  const menu   = document.getElementById('navbar-menu');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', function() {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 767 && menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }, { passive: true });

}());


/* ============================================================
   4 & 5. BOOKING MODAL + SUCCESS MODAL
   ============================================================
   Strategy:
   - Any element with .js-open-booking opens #bookingModal.
   - Any element with .js-close-booking (backdrop or × button)
     closes #bookingModal.
   - Form submission validates required fields; on success closes
     booking modal and opens success modal.
   - Any element with .js-close-success closes #successModal.
   - Escape key closes whichever modal is currently open.
   - Focus is trapped inside the active modal.
   - body.modal-open prevents background scroll.
   ============================================================ */

(function initModals() {

  /* ── Element references ──────────────────────────────────── */
  const bookingModal  = document.getElementById('bookingModal');
  const successModal  = document.getElementById('successModal');
  const bookingForm   = document.getElementById('bookingForm');
  const fileInput     = document.getElementById('refImage');
  const fileText      = document.getElementById('fileText');

  if (!bookingModal || !successModal || !bookingForm) return;

  /* ── Focus trap helpers ──────────────────────────────────── */
  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  function getFocusable(panel) {
    return Array.from(panel.querySelectorAll(FOCUSABLE)).filter(function(el) {
      return !el.closest('.modal__file-input') && el.offsetParent !== null;
    });
  }

  function trapFocus(panel, e) {
    const focusable = getFocusable(panel);
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ── Open / close helpers ────────────────────────────────── */
  var previouslyFocused = null;

  function openModal(modal) {
    previouslyFocused = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');

    // Focus first focusable element inside panel after transition starts
    var panel = modal.querySelector('.modal__panel');
    requestAnimationFrame(function() {
      var focusable = getFocusable(panel);
      if (focusable.length) focusable[0].focus();
    });
  }

  function closeModal(modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    // Restore focus to whatever triggered the modal
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  }

  /* ── Open booking modal ──────────────────────────────────── */
  document.addEventListener('click', function(e) {
    // Covers navbar BOOK link and BOOK NOW button
    if (e.target.closest('.js-open-booking')) {
      e.preventDefault();

      // Close mobile nav if open
      var menu   = document.getElementById('navbar-menu');
      var toggle = document.querySelector('.navbar__toggle');
      if (menu && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }

      openModal(bookingModal);
    }
  });

  /* ── Close booking modal ─────────────────────────────────── */
  document.addEventListener('click', function(e) {
    if (e.target.closest('.js-close-booking')) {
      closeModal(bookingModal);
    }
  });

  /* ── Close success modal ─────────────────────────────────── */
  document.addEventListener('click', function(e) {
    if (e.target.closest('.js-close-success')) {
      closeModal(successModal);
    }
  });

  /* ── Escape key ──────────────────────────────────────────── */
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (successModal.classList.contains('is-open')) {
      closeModal(successModal);
    } else if (bookingModal.classList.contains('is-open')) {
      closeModal(bookingModal);
    }
  });

  /* ── Focus trap (Tab key) ────────────────────────────────── */
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    if (successModal.classList.contains('is-open')) {
      trapFocus(successModal.querySelector('.modal__panel'), e);
    } else if (bookingModal.classList.contains('is-open')) {
      trapFocus(bookingModal.querySelector('.modal__panel'), e);
    }
  });

  /* ── File input label update ─────────────────────────────── */
  if (fileInput && fileText) {
    fileInput.addEventListener('change', function() {
      if (fileInput.files && fileInput.files.length > 0) {
        fileText.textContent = fileInput.files[0].name;
      } else {
        fileText.textContent = 'Choose file or drag & drop';
      }
    });
  }

  /* ── Form validation & submission ────────────────────────── */

  /**
   * Mark a field as invalid or clear invalid state.
   * Works for inputs, textareas, selects, and the confirmation checkbox.
   */
  function setValidity(el, isValid) {
    if (isValid) {
      el.classList.remove('is-invalid');
    } else {
      el.classList.add('is-invalid');
    }
  }

  /**
   * Validate all required fields in the booking form.
   * Returns true if the form is valid, false otherwise.
   * Focuses the first invalid field.
   */
  function validateForm() {
    var valid = true;
    var firstInvalid = null;

    /* Text / tel / date / time inputs */
    var requiredInputs = bookingForm.querySelectorAll(
      'input[required]:not([type="radio"]):not([type="checkbox"]), ' +
      'textarea[required], ' +
      'select[required]'
    );

    requiredInputs.forEach(function(field) {
      var ok = field.value.trim() !== '';
      setValidity(field, ok);
      if (!ok && !firstInvalid) firstInvalid = field;
      if (!ok) valid = false;
    });

    /* Radio groups — tattooSize */
    var sizeChecked = bookingForm.querySelector('input[name="tattooSize"]:checked');
    var sizeInputs  = bookingForm.querySelectorAll('input[name="tattooSize"]');
    sizeInputs.forEach(function(r) { setValidity(r.closest('.modal__size-option'), !!sizeChecked); });
    if (!sizeChecked) {
      valid = false;
      if (!firstInvalid) firstInvalid = sizeInputs[0];
    }

    /* Radio groups — apptType */
    var apptChecked = bookingForm.querySelector('input[name="apptType"]:checked');
    var apptInputs  = bookingForm.querySelectorAll('input[name="apptType"]');
    apptInputs.forEach(function(r) { setValidity(r.closest('.modal__size-option'), !!apptChecked); });
    if (!apptChecked) {
      valid = false;
      if (!firstInvalid) firstInvalid = apptInputs[0];
    }

    /* Confirmation checkbox */
    var confirmCheck = document.getElementById('confirmCheck');
    if (confirmCheck) {
      var ok = confirmCheck.checked;
      setValidity(confirmCheck, ok);
      if (!ok) {
        valid = false;
        if (!firstInvalid) firstInvalid = confirmCheck;
      }
    }

    /* Scroll panel to first invalid field */
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      requestAnimationFrame(function() { firstInvalid.focus(); });
    }

    return valid;
  }

  /* Clear invalid state on interaction */
  bookingForm.addEventListener('input', function(e) {
    if (e.target.classList.contains('is-invalid')) {
      e.target.classList.remove('is-invalid');
    }
  });

  bookingForm.addEventListener('change', function(e) {
    if (e.target.classList.contains('is-invalid') || e.target.type === 'radio') {
      e.target.classList.remove('is-invalid');
      /* Also clear sibling pills in the same group */
      if (e.target.type === 'radio') {
        var siblings = bookingForm.querySelectorAll('input[name="' + e.target.name + '"]');
        siblings.forEach(function(r) {
          r.closest('.modal__size-option').classList.remove('is-invalid');
        });
      }
    }
  });

  bookingForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!validateForm()) return;

    /* Valid — close booking modal, reset form, open success modal */
    closeModal(bookingModal);

    /* Small delay so booking modal finishes its exit transition */
    setTimeout(function() {
      bookingForm.reset();
      /* Reset file label */
      if (fileText) fileText.textContent = 'Choose file or drag & drop';
      /* Clear any lingering invalid states */
      bookingForm.querySelectorAll('.is-invalid').forEach(function(el) {
        el.classList.remove('is-invalid');
      });

      openModal(successModal);
    }, 380);
  });

}());


/* ============================================================
   6. ABOUT SECTION — CTA INTERACTIONS
   ============================================================
   CONTACT ME      → smooth-scrolls to #about (the section itself,
                     which is where the studio contact info lives),
                     and shows a brief toast message.
   SEND AN INQUIRY → handled by the existing .js-open-booking
                     delegation already in initModals() above.
   LEAVE A REVIEW  → placeholder toast pointing to a future
                     review flow.
   ============================================================ */

(function initAboutCTA() {

  /* ── Toast helper ──────────────────────────────────────────
     Creates a single shared toast element (or reuses it).
     Accepts a message string, shows the toast for `duration` ms.
  ────────────────────────────────────────────────────────── */
  var toastEl = null;
  var toastTimer = null;

  function showToast(message, duration) {
    duration = duration || 3000;

    // Create toast element once
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'about__toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }

    // Update message and show
    toastEl.textContent = message;

    // Force reflow so transition fires even when re-triggering
    toastEl.classList.remove('is-visible');
    void toastEl.offsetWidth;
    toastEl.classList.add('is-visible');

    // Clear any existing dismiss timer
    if (toastTimer) clearTimeout(toastTimer);

    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
      toastTimer = null;
    }, duration);
  }

  /* ── CONTACT ME ────────────────────────────────────────────
     Scrolls to the about section (contact info is there),
     then surfaces a brief "how to reach us" toast.
  ────────────────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.js-about-contact')) return;

    var aboutSection = document.getElementById('about');
    if (aboutSection) {
      var navbar = document.querySelector('.navbar');
      var navH = navbar ? navbar.offsetHeight : 0;
      var top = aboutSection.getBoundingClientRect().top + window.pageYOffset - navH;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }

    showToast('Reach us via WhatsApp or send an inquiry below.');
  });

  /* ── LEAVE A REVIEW ────────────────────────────────────────
     Placeholder — shows a toast while the review flow is TBD.
  ────────────────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.js-about-review')) return;

    showToast('Review feature coming soon. Thank you!');
  });

}());
