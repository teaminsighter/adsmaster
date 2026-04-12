/**
 * AdsMaster Tracker - Lightweight visitor tracking script
 *
 * Usage:
 * <script>
 *   window.admasterConfig = {
 *     orgId: 'YOUR_ORG_ID',
 *     apiUrl: 'https://api.adsmaster.io'  // optional, defaults to same origin
 *   };
 * </script>
 * <script src="https://your-domain.com/tracker.js" async></script>
 *
 * Or with tracking subdomain:
 * <script src="https://track.yourdomain.com/tracker.js?id=YOUR_ORG_ID" async></script>
 */
(function() {
  'use strict';

  // Prevent double initialization
  if (window.admaster && window.admaster._initialized) {
    return;
  }

  // Configuration
  var config = window.admasterConfig || {};
  var ORG_ID = config.orgId || getOrgIdFromScript();
  var API_URL = config.apiUrl || getApiUrl();
  var DEBUG = config.debug || false;
  var TRACK_PAGEVIEWS = config.trackPageviews !== false;
  var TRACK_FORMS = config.trackForms !== false;
  var COOKIE_DOMAIN = config.cookieDomain || '';
  var COOKIE_EXPIRES = config.cookieExpires || 365; // days

  // Storage keys
  var VISITOR_ID_KEY = 'am_vid';
  var SESSION_ID_KEY = 'am_sid';
  var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // ============================================================================
  // Utilities
  // ============================================================================

  function log() {
    if (DEBUG && console && console.log) {
      console.log.apply(console, ['[AdsMaster]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  function getOrgIdFromScript() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('tracker.js') !== -1) {
        var match = src.match(/[?&]id=([^&]+)/);
        if (match) return match[1];
      }
    }
    return null;
  }

  function getApiUrl() {
    // Default to same origin for first-party tracking
    return window.location.origin;
  }

  function generateId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    for (var i = 0; i < 16; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    var domain = COOKIE_DOMAIN ? '; domain=' + COOKIE_DOMAIN : '';
    document.cookie = name + '=' + encodeURIComponent(value) + expires + domain + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }
    return null;
  }

  function getStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return getCookie(key);
    }
  }

  function setStorage(key, value, days) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      setCookie(key, value, days);
    }
  }

  // ============================================================================
  // Visitor & Session Management
  // ============================================================================

  function getVisitorId() {
    var vid = getStorage(VISITOR_ID_KEY);
    if (!vid) {
      vid = 'v_' + generateId();
      setStorage(VISITOR_ID_KEY, vid, COOKIE_EXPIRES);
      log('Created new visitor:', vid);
    }
    return vid;
  }

  function getSessionId() {
    var now = Date.now();
    var session = getStorage(SESSION_ID_KEY);
    var sessionData;

    try {
      sessionData = session ? JSON.parse(session) : null;
    } catch (e) {
      sessionData = null;
    }

    if (sessionData && (now - sessionData.lastActivity) < SESSION_TIMEOUT) {
      sessionData.lastActivity = now;
      setStorage(SESSION_ID_KEY, JSON.stringify(sessionData));
      return sessionData.id;
    }

    // New session
    var newSession = {
      id: 's_' + generateId(),
      startTime: now,
      lastActivity: now
    };
    setStorage(SESSION_ID_KEY, JSON.stringify(newSession));
    log('Created new session:', newSession.id);
    return newSession.id;
  }

  // ============================================================================
  // Data Collection
  // ============================================================================

  function getUrlParams() {
    var params = {};
    var search = window.location.search.substring(1);
    if (!search) return params;

    var pairs = search.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      var key = decodeURIComponent(pair[0]);
      var value = pair.length > 1 ? decodeURIComponent(pair[1]) : '';
      params[key] = value;
    }
    return params;
  }

  function getClickIds() {
    var params = getUrlParams();
    return {
      gclid: params.gclid || null,
      fbclid: params.fbclid || null,
      gbraid: params.gbraid || null,
      wbraid: params.wbraid || null,
      msclkid: params.msclkid || null,
      ttclkid: params.ttclkid || null,
      li_fat_id: params.li_fat_id || null
    };
  }

  function getUtmParams() {
    var params = getUrlParams();
    return {
      utm_source: params.utm_source || null,
      utm_medium: params.utm_medium || null,
      utm_campaign: params.utm_campaign || null,
      utm_content: params.utm_content || null,
      utm_term: params.utm_term || null
    };
  }

  function getFbCookies() {
    return {
      fbp: getCookie('_fbp') || null,
      fbc: getCookie('_fbc') || null
    };
  }

  function getPageData() {
    return {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer || null
    };
  }

  function getScreenData() {
    return {
      screen_width: window.screen ? window.screen.width : null,
      screen_height: window.screen ? window.screen.height : null
    };
  }

  // ============================================================================
  // API Communication
  // ============================================================================

  function sendBeacon(endpoint, data) {
    var url = API_URL + endpoint;
    var payload = JSON.stringify(data);

    log('Sending to', endpoint, data);

    // Try sendBeacon first (works even when page is unloading)
    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) {
          return;
        }
      } catch (e) {
        log('sendBeacon failed:', e);
      }
    }

    // Fallback to fetch
    if (window.fetch) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(function(e) {
        log('fetch failed:', e);
      });
      return;
    }

    // Fallback to XHR
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
    } catch (e) {
      log('XHR failed:', e);
    }
  }

  // ============================================================================
  // Tracking Functions
  // ============================================================================

  function track(eventType, eventName, eventData) {
    if (!ORG_ID) {
      log('Error: No org_id configured');
      return;
    }

    var payload = {
      org_id: ORG_ID,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event: eventType || 'custom',
      event_name: eventName || null
    };

    // Add page data
    var pageData = getPageData();
    for (var key in pageData) {
      payload[key] = pageData[key];
    }

    // Add click IDs (first pageview only stores these)
    var clickIds = getClickIds();
    for (var key in clickIds) {
      if (clickIds[key]) payload[key] = clickIds[key];
    }

    // Add UTM params
    var utmParams = getUtmParams();
    for (var key in utmParams) {
      if (utmParams[key]) payload[key] = utmParams[key];
    }

    // Add FB cookies
    var fbCookies = getFbCookies();
    for (var key in fbCookies) {
      if (fbCookies[key]) payload[key] = fbCookies[key];
    }

    // Add screen data
    var screenData = getScreenData();
    for (var key in screenData) {
      if (screenData[key]) payload[key] = screenData[key];
    }

    // Add custom event data
    if (eventData && typeof eventData === 'object') {
      for (var key in eventData) {
        if (eventData.hasOwnProperty(key)) {
          payload[key] = eventData[key];
        }
      }
    }

    sendBeacon('/api/v1/track', payload);
  }

  function identify(userData) {
    if (!ORG_ID) {
      log('Error: No org_id configured');
      return;
    }

    var payload = {
      org_id: ORG_ID,
      visitor_id: getVisitorId()
    };

    // Add user data
    if (userData.email) payload.email = userData.email;
    if (userData.phone) payload.phone = userData.phone;
    if (userData.firstName || userData.first_name) {
      payload.firstName = userData.firstName || userData.first_name;
    }
    if (userData.lastName || userData.last_name) {
      payload.lastName = userData.lastName || userData.last_name;
    }

    // Add any custom fields
    for (var key in userData) {
      if (!payload[key] && userData.hasOwnProperty(key)) {
        payload[key] = userData[key];
      }
    }

    sendBeacon('/api/v1/track/identify', payload);
    log('Identified user:', userData.email || userData.phone);
  }

  function trackConversion(conversionType, value, currency, extraData) {
    if (!ORG_ID) {
      log('Error: No org_id configured');
      return;
    }

    var payload = {
      org_id: ORG_ID,
      visitor_id: getVisitorId(),
      conversion_type: conversionType || 'lead',
      value: value || 0,
      currency: currency || 'USD'
    };

    // Add extra data
    if (extraData && typeof extraData === 'object') {
      for (var key in extraData) {
        if (extraData.hasOwnProperty(key)) {
          payload[key] = extraData[key];
        }
      }
    }

    sendBeacon('/api/v1/track/conversion', payload);
    log('Tracked conversion:', conversionType, value);
  }

  function trackForm(formData) {
    // Identify the user
    identify(formData);

    // Track as form submission event
    track('form_submit', formData.formName || 'form', formData);
  }

  // ============================================================================
  // Automatic Tracking
  // ============================================================================

  function trackPageview() {
    if (TRACK_PAGEVIEWS) {
      track('pageview');
    }
  }

  function setupFormTracking() {
    if (!TRACK_FORMS) return;

    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;

      var formData = {};
      var inputs = form.querySelectorAll('input, select, textarea');

      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        var name = input.name || input.id || '';
        var value = input.value || '';
        var type = (input.type || '').toLowerCase();

        // Skip password and hidden fields
        if (type === 'password' || type === 'hidden') continue;
        if (!name || !value) continue;

        // Map common field names
        var lowerName = name.toLowerCase();
        if (lowerName.indexOf('email') !== -1) {
          formData.email = value;
        } else if (lowerName.indexOf('phone') !== -1 || lowerName.indexOf('tel') !== -1) {
          formData.phone = value;
        } else if (lowerName.indexOf('first') !== -1 && lowerName.indexOf('name') !== -1) {
          formData.firstName = value;
        } else if (lowerName.indexOf('last') !== -1 && lowerName.indexOf('name') !== -1) {
          formData.lastName = value;
        } else if (lowerName === 'name' && !formData.firstName) {
          // Single name field - split it
          var parts = value.trim().split(' ');
          formData.firstName = parts[0];
          if (parts.length > 1) {
            formData.lastName = parts.slice(1).join(' ');
          }
        }
      }

      // Only track if we got meaningful data
      if (formData.email || formData.phone) {
        formData.formName = form.name || form.id || 'form';
        trackForm(formData);
      }
    }, true);

    log('Form tracking enabled');
  }

  function setupSpaTracking() {
    // Track SPA navigation via History API
    if (window.history && window.history.pushState) {
      var originalPushState = window.history.pushState;
      window.history.pushState = function() {
        originalPushState.apply(this, arguments);
        setTimeout(trackPageview, 0);
      };

      var originalReplaceState = window.history.replaceState;
      window.history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        setTimeout(trackPageview, 0);
      };

      window.addEventListener('popstate', function() {
        setTimeout(trackPageview, 0);
      });

      log('SPA tracking enabled');
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  window.admaster = {
    _initialized: true,
    track: track,
    identify: identify,
    trackConversion: trackConversion,
    trackForm: trackForm,
    getVisitorId: getVisitorId,
    getSessionId: getSessionId
  };

  // ============================================================================
  // Initialize
  // ============================================================================

  function init() {
    if (!ORG_ID) {
      log('Warning: No org_id configured. Set window.admasterConfig.orgId or add ?id= to script URL');
      return;
    }

    log('Initialized with org:', ORG_ID, 'api:', API_URL);

    // Track initial pageview
    trackPageview();

    // Setup automatic tracking
    setupFormTracking();
    setupSpaTracking();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
