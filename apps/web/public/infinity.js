/**
 * AdsMaster Infinity Tracker
 * Lightweight client-side tracking for conversion attribution and pixel firing
 * Port of Traqr cf.js tracker
 *
 * Usage:
 * <script>
 *   window.amConfig = {
 *     apiKey: 'your-api-key',
 *     orgId: 'your-organization-id',
 *     debug: false
 *   };
 * </script>
 * <script src="https://your-domain.com/infinity.js" async></script>
 */

(function() {
  'use strict';

  // ============ CONFIGURATION ============

  var defaultConfig = {
    endpoint: window.location.origin,
    debug: false,
    cookieExpiry: 365,
    autoLoadPixels: true,
    cookiePrefix: '_am_',
    // Session Recording Options
    enableRecording: true,
    recordingBatchSize: 50,
    recordingBatchInterval: 5000,  // Send events every 5 seconds
    recordingSampleRate: 1.0,      // 100% of sessions by default
    recordingMaskInputs: true,
    recordingMaskTextContent: false
  };

  // ============ INFINITY TRACKER CLASS ============

  function InfinityTracker(config) {
    this.config = Object.assign({}, defaultConfig, config);
    this.visitorId = null;
    this.sessionId = null;
    this.queue = [];
    this.initialized = false;
    this.pixelConfig = null;
    this.pixelsLoaded = false;
    this.userData = {};
    this.recentEvents = new Map();
    this.recentLeads = new Map();
    this.capturedForms = new WeakSet();
    this.dedupeWindowMs = 1000;
    this.leadDedupeWindowMs = 30000;

    // Session Recording State
    this.recordingId = null;
    this.rrwebStopFn = null;
    this.recordingEvents = [];
    this.recordingEnabled = false;
    this.recordingStartTime = null;
    this.recordingBatchTimer = null;
    this.pageViews = [];
    this.rageClickCount = 0;
    this.deadClickCount = 0;
    this.errorCount = 0;
    this.lastClickTime = 0;
    this.lastClickTarget = null;
    this.clickCount = 0;
    this.markers = [];

    this.init();
  }

  // ============ LOGGING ============

  InfinityTracker.prototype.log = function() {
    if (this.config.debug || (this.pixelConfig && this.pixelConfig.debugMode)) {
      var args = ['[AdsMaster]'].concat(Array.prototype.slice.call(arguments));
      console.log.apply(console, args);
    }
  };

  // ============ INITIALIZATION ============

  InfinityTracker.prototype.init = function() {
    var self = this;
    this.log('Initializing Infinity Tracker...');

    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.createSessionId();

    // Capture URL parameters
    this.captureUrlParams();

    // Load pixel configuration
    if (this.config.autoLoadPixels) {
      this.loadPixelConfig().then(function() {
        self.completeInit();
      });
    } else {
      this.completeInit();
    }
  };

  InfinityTracker.prototype.completeInit = function() {
    // Auto-track page views
    this.trackPageView();

    // Listen for history changes (SPA support)
    this.setupSPATracking();

    // Enable auto form capture
    this.enableAutoFormCapture();

    // Enable postMessage capture for cross-domain iframes
    this.enablePostMessageCapture();

    // Start session recording if enabled
    if (this.config.enableRecording && this.shouldRecordSession()) {
      this.startSessionRecording();
    }

    // Setup error tracking
    this.setupErrorTracking();

    // Setup click tracking for rage/dead clicks
    this.setupClickTracking();

    // Process queued events
    this.processQueue();

    this.initialized = true;
    this.log('Tracker initialized', { visitorId: this.visitorId, pixels: this.pixelConfig, recording: this.recordingEnabled });
  };

  // ============ PIXEL CONFIGURATION ============

  InfinityTracker.prototype.loadPixelConfig = function() {
    var self = this;

    return fetch(this.config.endpoint + '/api/v1/tracking/pixels/' + this.config.orgId, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(function(response) {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to load pixel config');
    })
    .then(function(data) {
      self.pixelConfig = data.pixels || data;
      self.log('Pixel config loaded:', self.pixelConfig);

      if (self.pixelConfig) {
        return self.loadPixelScripts();
      }
    })
    .catch(function(error) {
      self.log('Failed to load pixel config:', error);
    });
  };

  InfinityTracker.prototype.loadPixelScripts = function() {
    var self = this;
    if (!this.pixelConfig || this.pixelsLoaded) return Promise.resolve();

    var promises = [];

    // Load Meta Pixel
    if (this.pixelConfig.meta && this.pixelConfig.meta.pixelId) {
      promises.push(this.loadMetaPixel(this.pixelConfig.meta.pixelId));
    }

    // Load GA4 / gtag.js
    var gtagId = (this.pixelConfig.ga4 && this.pixelConfig.ga4.measurementId) ||
                 (this.pixelConfig.googleAds && this.pixelConfig.googleAds.conversionId);
    if (gtagId) {
      promises.push(this.loadGtag(gtagId));
    }

    // Load TikTok Pixel
    if (this.pixelConfig.tiktok && this.pixelConfig.tiktok.pixelId) {
      promises.push(this.loadTikTokPixel(this.pixelConfig.tiktok.pixelId));
    }

    // Load LinkedIn Insight Tag
    if (this.pixelConfig.linkedin && this.pixelConfig.linkedin.partnerId) {
      promises.push(this.loadLinkedInPixel(this.pixelConfig.linkedin.partnerId));
    }

    return Promise.all(promises).then(function() {
      self.pixelsLoaded = true;
      self.log('All pixels loaded');
    });
  };

  // ============ PIXEL LOADERS ============

  InfinityTracker.prototype.loadMetaPixel = function(pixelId) {
    var self = this;
    return new Promise(function(resolve) {
      if (window.fbq) {
        self.log('Meta Pixel already loaded');
        resolve();
        return;
      }

      var n = window.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];

      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.onload = function() {
        window.fbq('init', pixelId);
        window.fbq('track', 'PageView');
        self.log('Meta Pixel initialized:', pixelId);
        resolve();
      };
      script.onerror = function() {
        self.log('Failed to load Meta Pixel');
        resolve();
      };
      document.head.appendChild(script);
    });
  };

  InfinityTracker.prototype.loadGtag = function(measurementId) {
    var self = this;
    return new Promise(function(resolve) {
      if (window.gtag) {
        self.log('gtag already loaded');
        resolve();
        return;
      }

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());

      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
      script.onload = function() {
        if (self.pixelConfig.ga4 && self.pixelConfig.ga4.measurementId) {
          window.gtag('config', self.pixelConfig.ga4.measurementId, { send_page_view: true });
          self.log('GA4 configured:', self.pixelConfig.ga4.measurementId);
        }
        if (self.pixelConfig.googleAds && self.pixelConfig.googleAds.conversionId) {
          window.gtag('config', self.pixelConfig.googleAds.conversionId);
          self.log('Google Ads configured:', self.pixelConfig.googleAds.conversionId);
        }
        resolve();
      };
      script.onerror = function() {
        self.log('Failed to load gtag');
        resolve();
      };
      document.head.appendChild(script);
    });
  };

  InfinityTracker.prototype.loadTikTokPixel = function(pixelId) {
    var self = this;
    return new Promise(function(resolve) {
      if (window.ttq) {
        self.log('TikTok Pixel already loaded');
        resolve();
        return;
      }

      var ttq = window.ttq = window.ttq || [];
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function(t, e) {
        t[e] = function() {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.load = function(e, n) {
        var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = i;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var o = document.createElement('script');
        o.type = 'text/javascript';
        o.async = true;
        o.src = i + '?sdkid=' + e + '&lib=ttq';
        var a = document.getElementsByTagName('script')[0];
        a.parentNode.insertBefore(o, a);
      };

      ttq.load(pixelId);
      ttq.page();
      self.log('TikTok Pixel initialized:', pixelId);
      resolve();
    });
  };

  InfinityTracker.prototype.loadLinkedInPixel = function(partnerId) {
    var self = this;
    return new Promise(function(resolve) {
      if (window.lintrk) {
        self.log('LinkedIn Pixel already loaded');
        resolve();
        return;
      }

      window._linkedin_partner_id = partnerId;
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(partnerId);

      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      script.onload = function() {
        self.log('LinkedIn Pixel initialized:', partnerId);
        resolve();
      };
      script.onerror = function() {
        self.log('Failed to load LinkedIn Pixel');
        resolve();
      };
      document.head.appendChild(script);
    });
  };

  // ============ COOKIE MANAGEMENT ============

  InfinityTracker.prototype.setCookie = function(name, value, days) {
    days = days || 365;
    var expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    var cookieStr = this.config.cookiePrefix + name + '=' + encodeURIComponent(value) +
                    ';expires=' + expires.toUTCString() + ';path=/';

    if (this.config.cookieDomain) {
      cookieStr += ';domain=' + this.config.cookieDomain;
    }

    if (window.location.protocol === 'https:') {
      cookieStr += ';Secure;SameSite=Lax';
    }

    document.cookie = cookieStr;

    try {
      localStorage.setItem(this.config.cookiePrefix + name, JSON.stringify({ value: value, expires: expires.getTime() }));
    } catch (e) {}
  };

  InfinityTracker.prototype.getCookie = function(name) {
    var fullName = this.config.cookiePrefix + name;
    var match = document.cookie.match(new RegExp('(^| )' + fullName + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);

    try {
      var stored = localStorage.getItem(fullName);
      if (stored) {
        var data = JSON.parse(stored);
        if (data.expires > Date.now()) {
          return data.value;
        } else {
          localStorage.removeItem(fullName);
        }
      }
    } catch (e) {}

    return null;
  };

  InfinityTracker.prototype.getOrCreateVisitorId = function() {
    var visitorId = this.getCookie('vid');

    if (!visitorId) {
      visitorId = this.generateId();
      this.setCookie('vid', visitorId, this.config.cookieExpiry);
    }

    return visitorId;
  };

  InfinityTracker.prototype.createSessionId = function() {
    var sessionId = sessionStorage.getItem(this.config.cookiePrefix + 'sid');

    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem(this.config.cookiePrefix + 'sid', sessionId);
    }

    return sessionId;
  };

  InfinityTracker.prototype.generateId = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // ============ URL PARAMETER CAPTURE ============

  InfinityTracker.prototype.captureUrlParams = function() {
    var params = new URLSearchParams(window.location.search);
    var self = this;

    // UTM parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function(param) {
      var value = params.get(param);
      if (value) {
        self.setCookie(param, value, 30);
      }
    });

    // Ad platform click IDs
    ['fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid', 'li_fat_id'].forEach(function(param) {
      var value = params.get(param);
      if (value) {
        self.setCookie(param, value, 90);
      }
    });

    // Generate _fbc from fbclid if not present
    var fbclid = params.get('fbclid');
    var fbc = this.getCookie('fbc');
    if (!fbc && fbclid) {
      var newFbc = 'fb.1.' + Date.now() + '.' + fbclid;
      this.setCookie('fbc', newFbc, 90);
    }
  };

  InfinityTracker.prototype.getAttributionData = function() {
    var data = {};
    var self = this;

    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
     'fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid', 'li_fat_id'].forEach(function(param) {
      var value = self.getCookie(param);
      if (value) {
        data[param] = value;
      }
    });

    var fbp = this.getCookie('fbp') || this.getFbpFromCookie();
    if (fbp) data.fbp = fbp;

    var fbc = this.getCookie('fbc');
    if (fbc) data.fbc = fbc;

    return data;
  };

  InfinityTracker.prototype.getFbpFromCookie = function() {
    var match = document.cookie.match(/(^| )_fbp=([^;]+)/);
    return match ? match[2] : null;
  };

  // ============ SPA SUPPORT ============

  InfinityTracker.prototype.setupSPATracking = function() {
    var self = this;
    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function() {
      originalPushState.apply(history, arguments);
      self.trackPageView();
    };

    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      self.trackPageView();
    };

    window.addEventListener('popstate', function() {
      self.trackPageView();
    });
  };

  // ============ EVENT DEDUPLICATION ============

  InfinityTracker.prototype.isDuplicateEvent = function(eventName, data) {
    var eventKey = eventName + '_' + (data && data.value || '') + '_' + (data && data.transaction_id || '') + '_' + window.location.pathname;
    var now = Date.now();
    var lastFired = this.recentEvents.get(eventKey);

    if (lastFired && now - lastFired < this.dedupeWindowMs) {
      this.log('Duplicate event blocked:', eventName);
      return true;
    }

    this.recentEvents.set(eventKey, now);

    // Cleanup old entries
    if (this.recentEvents.size > 100) {
      var cutoff = now - this.dedupeWindowMs * 2;
      this.recentEvents.forEach(function(timestamp, key, map) {
        if (timestamp < cutoff) map.delete(key);
      });
    }

    return false;
  };

  // ============ PIXEL EVENT FIRING ============

  InfinityTracker.prototype.firePixelEvent = function(eventName, data) {
    if (!this.pixelConfig) return;

    // Check for duplicate events
    if (eventName.toLowerCase() !== 'page_view' && this.isDuplicateEvent(eventName, data)) {
      return;
    }

    var normalizedName = eventName.toLowerCase().replace(/[\s-]+/g, '_');
    var mapping = (this.pixelConfig.eventMapping && this.pixelConfig.eventMapping[normalizedName]) || {};
    var eventData = Object.assign({ currency: 'USD' }, data);

    this.log('Firing pixel event:', eventName, mapping, eventData);

    // Fire Meta Pixel
    if (this.pixelConfig.meta && mapping.meta && window.fbq) {
      var metaParams = {};
      if (eventData.value) metaParams.value = eventData.value;
      if (eventData.currency) metaParams.currency = eventData.currency;
      if (eventData.content_name) metaParams.content_name = eventData.content_name;

      // Enhanced matching
      if (this.pixelConfig.enhancedConversions && this.userData) {
        if (this.userData.email) metaParams.em = this.userData.email;
        if (this.userData.phone) metaParams.ph = this.userData.phone;
      }

      window.fbq('track', mapping.meta, metaParams);
      this.log('Meta event fired:', mapping.meta);
    }

    // Fire GA4 event
    if (this.pixelConfig.ga4 && window.gtag) {
      var ga4EventName = mapping.ga4 || this.toSnakeCase(eventName);
      var ga4Params = {};
      if (eventData.value) ga4Params.value = eventData.value;
      if (eventData.currency) ga4Params.currency = eventData.currency;
      if (eventData.transaction_id) ga4Params.transaction_id = eventData.transaction_id;
      if (eventData.items) ga4Params.items = eventData.items;

      window.gtag('event', ga4EventName, ga4Params);
      this.log('GA4 event fired:', ga4EventName);
    }

    // Fire Google Ads conversion
    if (this.pixelConfig.googleAds && mapping.googleAds === true && window.gtag) {
      var conversionLabel = this.pixelConfig.googleAds.conversionLabel;
      var sendTo = conversionLabel ?
        this.pixelConfig.googleAds.conversionId + '/' + conversionLabel :
        this.pixelConfig.googleAds.conversionId;

      var gadsParams = { send_to: sendTo };
      if (eventData.value) gadsParams.value = eventData.value;
      if (eventData.currency) gadsParams.currency = eventData.currency;

      var gclid = this.getCookie('gclid');
      if (gclid) gadsParams.gclid = gclid;

      window.gtag('event', 'conversion', gadsParams);
      this.log('Google Ads conversion fired:', sendTo);
    }

    // Fire TikTok event
    if (this.pixelConfig.tiktok && mapping.tiktok && window.ttq) {
      var ttParams = {};
      if (eventData.value) ttParams.value = eventData.value;
      if (eventData.currency) ttParams.currency = eventData.currency;

      window.ttq.track(mapping.tiktok, ttParams);
      this.log('TikTok event fired:', mapping.tiktok);
    }

    // Fire LinkedIn conversion
    if (this.pixelConfig.linkedin && mapping.linkedin && window.lintrk) {
      window.lintrk('track', { conversion_id: mapping.linkedin });
      this.log('LinkedIn conversion fired:', mapping.linkedin);
    }
  };

  InfinityTracker.prototype.toSnakeCase = function(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase();
  };

  // ============ SERVER-SIDE TRACKING ============

  InfinityTracker.prototype.send = function(event) {
    var self = this;
    var payload = Object.assign({
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }, this.getAttributionData(), event);

    this.log('Sending to server:', payload);

    fetch(this.config.endpoint + '/api/v1/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify(payload),
      keepalive: true
    })
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      self.log('Event sent successfully');
    })
    .catch(function(error) {
      self.log('Failed to send event:', error);
      self.queue.push(payload);
    });
  };

  InfinityTracker.prototype.processQueue = function() {
    while (this.queue.length > 0) {
      var event = this.queue.shift();
      this.send(event);
    }
  };

  // ============ PUBLIC METHODS ============

  InfinityTracker.prototype.trackPageView = function(customData) {
    this.firePixelEvent('page_view', customData);

    // Track page view for recording
    var pageView = {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      timestamp: Date.now()
    };
    this.pageViews.push(pageView);

    // Add page view marker to recording
    if (this.recordingEnabled && this.pageViews.length > 1) {
      this.addMarker('page_view', {
        url: pageView.url,
        title: pageView.title,
        label: 'Navigated to ' + pageView.path
      });
    }

    this.send({
      eventType: 'pageview',
      pageUrl: window.location.href,
      pageTitle: document.title,
      pagePath: window.location.pathname,
      customData: customData
    });
  };

  InfinityTracker.prototype.track = function(eventName, data) {
    this.firePixelEvent(eventName, data);

    this.send({
      eventType: 'custom',
      eventName: eventName,
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      customData: data
    });
  };

  InfinityTracker.prototype.identify = function(userData) {
    this.userData = Object.assign({}, this.userData, userData);

    if (userData.email) {
      this.setCookie('email', userData.email, 365);
    }

    // Update Meta Advanced Matching
    if (window.fbq && this.pixelConfig && this.pixelConfig.enhancedConversions) {
      var fbUserData = {};
      if (userData.email) fbUserData.em = userData.email;
      if (userData.phone) fbUserData.ph = userData.phone;
      if (userData.firstName) fbUserData.fn = userData.firstName;
      if (userData.lastName) fbUserData.ln = userData.lastName;
      window.fbq('init', this.pixelConfig.meta.pixelId, fbUserData);
    }

    // Update GA4 user properties
    if (window.gtag && this.pixelConfig && this.pixelConfig.enhancedConversions) {
      window.gtag('set', 'user_data', {
        email: userData.email,
        phone_number: userData.phone
      });
    }

    this.firePixelEvent('identify', userData);

    this.send({
      eventType: 'identify',
      email: userData.email,
      phone: userData.phone,
      firstName: userData.firstName,
      lastName: userData.lastName,
      pageUrl: window.location.href
    });
  };

  InfinityTracker.prototype.trackConversion = function(type, value, currency, data) {
    var eventData = Object.assign({ value: value, currency: currency || 'USD' }, data);

    this.firePixelEvent(type, eventData);

    // Add conversion marker to recording
    if (this.recordingEnabled) {
      this.addMarker('conversion', {
        type: type,
        value: value,
        currency: currency || 'USD',
        label: type + (value ? ': $' + value : '')
      });
    }

    this.send({
      eventType: 'custom',
      eventName: type,
      value: value,
      currency: currency || 'USD',
      customData: data,
      pageUrl: window.location.href
    });
  };

  InfinityTracker.prototype.trackLead = function(data) {
    // Dedupe by email/phone
    var dedupeKey = ((data && data.email) || '') + '_' + ((data && data.phone) || '');
    dedupeKey = dedupeKey.toLowerCase().trim();

    if (dedupeKey && dedupeKey !== '_') {
      var now = Date.now();
      var lastTracked = this.recentLeads.get(dedupeKey);

      if (lastTracked && now - lastTracked < this.leadDedupeWindowMs) {
        this.log('Skipping duplicate lead:', dedupeKey);
        return;
      }

      this.recentLeads.set(dedupeKey, now);
    }

    if (data && (data.email || data.phone)) {
      this.identify(data);
    }
    this.trackConversion('lead', data && data.value, 'USD', data);
  };

  InfinityTracker.prototype.trackPurchase = function(value, currency, data) {
    this.trackConversion('purchase', value, currency, data);
  };

  InfinityTracker.prototype.trackSignup = function(data) {
    if (data && data.email) {
      this.identify(data);
    }
    this.trackConversion('signup', undefined, undefined, data);
  };

  InfinityTracker.prototype.trackAddToCart = function(value, currency, data) {
    this.trackConversion('add_to_cart', value, currency, data);
  };

  InfinityTracker.prototype.getVisitorId = function() {
    return this.visitorId;
  };

  InfinityTracker.prototype.getClickIds = function() {
    var self = this;
    var clickIds = {};
    ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid', 'li_fat_id'].forEach(function(param) {
      var value = self.getCookie(param);
      if (value) clickIds[param] = value;
    });
    return clickIds;
  };

  InfinityTracker.prototype.getRecordingId = function() {
    return this.recordingId;
  };

  InfinityTracker.prototype.isRecording = function() {
    return this.recordingEnabled;
  };

  InfinityTracker.prototype.mark = function(label, data) {
    // Public API for adding custom markers
    if (!this.recordingEnabled) {
      this.log('Cannot add marker - recording not enabled');
      return;
    }

    this.addMarker('custom', Object.assign({ label: label }, data || {}));
  };

  // ============ AUTO FORM CAPTURE ============

  InfinityTracker.prototype.enableAutoFormCapture = function() {
    var self = this;
    this.log('Enabling auto form capture...');

    // Capture existing forms
    document.querySelectorAll('form').forEach(function(form) {
      self.attachFormListener(form);
    });

    // Watch for new forms
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            if (node.tagName === 'FORM') {
              self.attachFormListener(node);
            }
            var forms = node.querySelectorAll && node.querySelectorAll('form');
            if (forms) {
              forms.forEach(function(form) {
                self.attachFormListener(form);
              });
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    this.log('Auto form capture enabled');
  };

  InfinityTracker.prototype.attachFormListener = function(form) {
    if (this.capturedForms.has(form)) return;
    this.capturedForms.add(form);

    var self = this;
    form.addEventListener('submit', function() {
      self.handleFormSubmit(form);
    });

    this.log('Attached listener to form:', form.id || form.action || 'unnamed');
  };

  InfinityTracker.prototype.handleFormSubmit = function(form) {
    var formData = new FormData(form);
    var data = {};
    var email, phone, firstName, lastName, fullName;

    var emailPatterns = ['email', 'e-mail', 'mail', 'user_email', 'customer_email'];
    var phonePatterns = ['phone', 'telephone', 'tel', 'mobile', 'cell'];
    var firstNamePatterns = ['firstname', 'first_name', 'fname', 'first'];
    var lastNamePatterns = ['lastname', 'last_name', 'lname', 'last'];
    var namePatterns = ['name', 'fullname', 'full_name'];

    var self = this;
    formData.forEach(function(value, key) {
      var lowerKey = key.toLowerCase().replace(/[-_\s]/g, '');
      var strValue = String(value).trim();

      if (!strValue) return;
      data[key] = strValue;

      // Match fields
      if (!email && (emailPatterns.some(function(p) { return lowerKey.includes(p.replace(/[-_]/g, '')); }) || self.isValidEmail(strValue))) {
        email = strValue;
      }
      if (!phone && (phonePatterns.some(function(p) { return lowerKey.includes(p.replace(/[-_]/g, '')); }) || self.isValidPhone(strValue))) {
        phone = strValue;
      }
      if (!firstName && firstNamePatterns.some(function(p) { return lowerKey.includes(p.replace(/[-_]/g, '')); })) {
        firstName = strValue;
      }
      if (!lastName && lastNamePatterns.some(function(p) { return lowerKey.includes(p.replace(/[-_]/g, '')); })) {
        lastName = strValue;
      }
      if (!fullName && namePatterns.some(function(p) { return lowerKey === p.replace(/[-_]/g, ''); })) {
        fullName = strValue;
      }
    });

    // Split full name
    if (fullName && (!firstName || !lastName)) {
      var parts = fullName.split(/\s+/);
      if (!firstName && parts.length > 0) firstName = parts[0];
      if (!lastName && parts.length > 1) lastName = parts.slice(1).join(' ');
    }

    // Only track if we have email or phone
    if (!email && !phone) {
      this.log('Form has no email/phone, skipping');
      return;
    }

    this.log('Auto-captured form:', { email: email, phone: phone, firstName: firstName, lastName: lastName });

    this.trackLead(Object.assign({
      email: email,
      phone: phone,
      firstName: firstName,
      lastName: lastName,
      formId: form.id || undefined,
      formAction: form.action || undefined
    }, data));
  };

  InfinityTracker.prototype.isValidEmail = function(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  };

  InfinityTracker.prototype.isValidPhone = function(str) {
    var digits = str.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  };

  // ============ POSTMESSAGE CAPTURE ============

  InfinityTracker.prototype.enablePostMessageCapture = function() {
    var self = this;
    this.log('Enabling postMessage capture...');

    window.addEventListener('message', function(event) {
      self.handlePostMessage(event);
    });

    this.log('PostMessage capture enabled');
  };

  InfinityTracker.prototype.handlePostMessage = function(event) {
    try {
      var data = event.data;
      if (!data) return;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return;
        }
      }

      if (typeof data !== 'object') return;

      var formData = this.extractFormDataFromPostMessage(data, event.origin);

      if (formData && (formData.email || formData.phone)) {
        this.log('PostMessage form captured:', { origin: event.origin, data: formData });

        this.trackLead(Object.assign({
          source: 'postMessage',
          origin: event.origin
        }, formData));
      }
    } catch (e) {}
  };

  InfinityTracker.prototype.extractFormDataFromPostMessage = function(data, origin) {
    var result = {};
    var flat = this.flattenObject(data);

    var emailPatterns = ['email', 'e-mail', 'mail'];
    var phonePatterns = ['phone', 'telephone', 'tel', 'mobile'];
    var firstNamePatterns = ['firstname', 'first_name', 'fname'];
    var lastNamePatterns = ['lastname', 'last_name', 'lname'];

    var self = this;
    Object.keys(flat).forEach(function(key) {
      var value = flat[key];
      if (typeof value !== 'string' || !value.trim()) return;

      var lowerKey = key.toLowerCase().replace(/[-_.\s]/g, '');
      var strValue = String(value).trim();

      if (!result.email && (emailPatterns.some(function(p) { return lowerKey.includes(p); }) || self.isValidEmail(strValue))) {
        result.email = strValue;
      }
      if (!result.phone && (phonePatterns.some(function(p) { return lowerKey.includes(p); }) || self.isValidPhone(strValue))) {
        result.phone = strValue;
      }
      if (!result.firstName && firstNamePatterns.some(function(p) { return lowerKey.includes(p); })) {
        result.firstName = strValue;
      }
      if (!result.lastName && lastNamePatterns.some(function(p) { return lowerKey.includes(p); })) {
        result.lastName = strValue;
      }
    });

    if (!result.email && !result.phone) {
      return null;
    }

    return result;
  };

  InfinityTracker.prototype.flattenObject = function(obj, prefix) {
    prefix = prefix || '';
    var result = {};

    if (!obj || typeof obj !== 'object') return result;

    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = obj[key];
      var newKey = prefix ? prefix + '.' + key : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  };

  // ============ SESSION RECORDING ============

  InfinityTracker.prototype.shouldRecordSession = function() {
    // Check sample rate
    if (Math.random() > this.config.recordingSampleRate) {
      this.log('Session not sampled for recording');
      return false;
    }

    // Check if recording settings allow it (from pixel config)
    if (this.pixelConfig && this.pixelConfig.recording) {
      if (!this.pixelConfig.recording.enabled) {
        this.log('Recording disabled in pixel config');
        return false;
      }
      // Use server-side sample rate if provided
      if (this.pixelConfig.recording.sampleRate !== undefined) {
        if (Math.random() > this.pixelConfig.recording.sampleRate) {
          this.log('Session not sampled for recording (server config)');
          return false;
        }
      }
    }

    return true;
  };

  InfinityTracker.prototype.startSessionRecording = function() {
    var self = this;
    this.log('Starting session recording...');

    // Generate recording ID
    this.recordingId = this.generateId();
    this.recordingStartTime = Date.now();
    this.recordingEnabled = true;

    // Load rrweb dynamically
    this.loadRRweb().then(function(rrweb) {
      if (!rrweb) {
        self.log('Failed to load rrweb, recording disabled');
        self.recordingEnabled = false;
        return;
      }

      // Start recording
      self.rrwebStopFn = rrweb.record({
        emit: function(event) {
          self.handleRecordingEvent(event);
        },
        maskAllInputs: self.config.recordingMaskInputs,
        maskTextSelector: self.config.recordingMaskTextContent ? '*' : null,
        blockSelector: '.am-no-record, [data-am-no-record]',
        maskInputOptions: {
          password: true,
          email: false,
          text: false
        },
        sampling: {
          scroll: 150,
          media: 800,
          input: 'last'
        },
        recordCanvas: false,
        collectFonts: false
      });

      // Track first page view as marker
      self.addMarker('page_view', { url: window.location.href, title: document.title });

      // Setup batch sending
      self.recordingBatchTimer = setInterval(function() {
        self.flushRecordingEvents();
      }, self.config.recordingBatchInterval);

      // Send events on page unload
      window.addEventListener('beforeunload', function() {
        self.flushRecordingEvents(true);
      });

      // Send events on visibility change (tab switching)
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
          self.flushRecordingEvents();
        }
      });

      self.log('Session recording started', { recordingId: self.recordingId });
    });
  };

  InfinityTracker.prototype.loadRRweb = function() {
    var self = this;

    return new Promise(function(resolve) {
      // Check if already loaded
      if (window.rrweb && window.rrweb.record) {
        self.log('rrweb already loaded');
        resolve(window.rrweb);
        return;
      }

      // Load rrweb from CDN
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.13/dist/rrweb.min.js';
      script.onload = function() {
        if (window.rrweb && window.rrweb.record) {
          self.log('rrweb loaded successfully');
          resolve(window.rrweb);
        } else {
          self.log('rrweb loaded but record function not found');
          resolve(null);
        }
      };
      script.onerror = function() {
        self.log('Failed to load rrweb');
        resolve(null);
      };
      document.head.appendChild(script);
    });
  };

  InfinityTracker.prototype.handleRecordingEvent = function(event) {
    this.recordingEvents.push(event);

    // Flush if batch size reached
    if (this.recordingEvents.length >= this.config.recordingBatchSize) {
      this.flushRecordingEvents();
    }
  };

  InfinityTracker.prototype.flushRecordingEvents = function(isFinal) {
    if (!this.recordingEnabled || this.recordingEvents.length === 0) return;

    var events = this.recordingEvents.splice(0);
    var self = this;

    var payload = {
      recording_id: this.recordingId,
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      events: events,
      chunk_index: this.getChunkIndex(),
      is_final: !!isFinal,
      metadata: {
        page_count: this.pageViews.length,
        event_count: events.length,
        rage_clicks: this.rageClickCount,
        dead_clicks: this.deadClickCount,
        error_count: this.errorCount,
        duration_seconds: Math.round((Date.now() - this.recordingStartTime) / 1000),
        entry_url: this.pageViews[0] ? this.pageViews[0].url : window.location.href,
        entry_path: this.pageViews[0] ? this.pageViews[0].path : window.location.pathname,
        device_type: this.getDeviceType(),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        browser: this.getBrowserName(),
        os: this.getOSName(),
        markers: this.markers
      }
    };

    // Add attribution data
    var attribution = this.getAttributionData();
    if (attribution.utm_source) payload.metadata.utm_source = attribution.utm_source;
    if (attribution.utm_campaign) payload.metadata.utm_campaign = attribution.utm_campaign;
    if (attribution.gclid) payload.metadata.gclid = attribution.gclid;
    if (attribution.fbclid) payload.metadata.fbclid = attribution.fbclid;

    // Add user data if identified
    if (this.userData.email) payload.metadata.visitor_email = this.userData.email;
    if (this.userData.firstName || this.userData.lastName) {
      payload.metadata.visitor_name = [this.userData.firstName, this.userData.lastName].filter(Boolean).join(' ');
    }

    this.log('Flushing recording events', { count: events.length, isFinal: isFinal });

    fetch(this.config.endpoint + '/api/v1/recordings/ingest?org_id=' + this.config.orgId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify(payload),
      keepalive: true
    })
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      self.log('Recording events sent successfully');
    })
    .catch(function(error) {
      self.log('Failed to send recording events:', error);
      // Don't re-queue recording events to avoid memory bloat
    });

    // Clear markers after sending
    this.markers = [];
  };

  InfinityTracker.prototype.getChunkIndex = function() {
    if (!this._chunkIndex) this._chunkIndex = 0;
    return this._chunkIndex++;
  };

  InfinityTracker.prototype.stopSessionRecording = function() {
    if (!this.recordingEnabled) return;

    this.log('Stopping session recording');

    // Flush remaining events
    this.flushRecordingEvents(true);

    // Stop rrweb
    if (this.rrwebStopFn) {
      this.rrwebStopFn();
      this.rrwebStopFn = null;
    }

    // Clear timer
    if (this.recordingBatchTimer) {
      clearInterval(this.recordingBatchTimer);
      this.recordingBatchTimer = null;
    }

    this.recordingEnabled = false;
    this.log('Session recording stopped');
  };

  InfinityTracker.prototype.addMarker = function(type, data) {
    if (!this.recordingEnabled) return;

    var marker = {
      marker_type: type,
      timestamp_ms: Date.now() - this.recordingStartTime,
      label: data.label || type.replace(/_/g, ' '),
      data: data
    };

    this.markers.push(marker);
    this.log('Recording marker added:', marker);
  };

  // ============ CLICK TRACKING (RAGE/DEAD CLICKS) ============

  InfinityTracker.prototype.setupClickTracking = function() {
    var self = this;

    document.addEventListener('click', function(e) {
      self.handleClick(e);
    }, true);

    this.log('Click tracking enabled');
  };

  InfinityTracker.prototype.handleClick = function(e) {
    var now = Date.now();
    var target = e.target;

    // Detect rage clicks (3+ clicks on same element within 500ms each)
    if (this.lastClickTarget === target && now - this.lastClickTime < 500) {
      this.clickCount++;
      if (this.clickCount >= 3) {
        this.rageClickCount++;
        this.addMarker('rage_click', {
          x: e.clientX,
          y: e.clientY,
          target: this.getElementSelector(target),
          label: 'Rage click detected'
        });
        this.log('Rage click detected', { count: this.rageClickCount });
        this.clickCount = 0; // Reset after detection
      }
    } else {
      this.clickCount = 1;
    }

    this.lastClickTarget = target;
    this.lastClickTime = now;

    // Detect dead clicks (click on non-interactive element)
    if (this.isDeadClick(target)) {
      this.deadClickCount++;
      this.addMarker('dead_click', {
        x: e.clientX,
        y: e.clientY,
        target: this.getElementSelector(target),
        label: 'Dead click detected'
      });
      this.log('Dead click detected', { count: this.deadClickCount });
    }
  };

  InfinityTracker.prototype.isDeadClick = function(element) {
    // Check if element or any parent is interactive
    var current = element;
    var maxDepth = 10;
    var depth = 0;

    while (current && depth < maxDepth) {
      var tagName = current.tagName ? current.tagName.toLowerCase() : '';

      // Interactive elements
      if (['a', 'button', 'input', 'select', 'textarea', 'label'].indexOf(tagName) !== -1) {
        return false;
      }

      // Elements with click handlers (common patterns)
      if (current.onclick ||
          current.getAttribute('role') === 'button' ||
          current.getAttribute('tabindex') ||
          current.classList.contains('btn') ||
          current.classList.contains('button') ||
          current.classList.contains('clickable') ||
          window.getComputedStyle(current).cursor === 'pointer') {
        return false;
      }

      current = current.parentElement;
      depth++;
    }

    return true;
  };

  InfinityTracker.prototype.getElementSelector = function(element) {
    if (!element) return '';

    var parts = [];
    var current = element;
    var maxDepth = 5;
    var depth = 0;

    while (current && current !== document.body && depth < maxDepth) {
      var selector = current.tagName ? current.tagName.toLowerCase() : '';

      if (current.id) {
        selector = '#' + current.id;
        parts.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === 'string') {
        var classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (classes) selector += '.' + classes;
      }

      parts.unshift(selector);
      current = current.parentElement;
      depth++;
    }

    return parts.join(' > ').substring(0, 200);
  };

  // ============ ERROR TRACKING ============

  InfinityTracker.prototype.setupErrorTracking = function() {
    var self = this;

    // JavaScript errors
    window.addEventListener('error', function(e) {
      self.handleError(e);
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
      self.handleUnhandledRejection(e);
    });

    this.log('Error tracking enabled');
  };

  InfinityTracker.prototype.handleError = function(e) {
    this.errorCount++;

    this.addMarker('error', {
      message: e.message || 'Unknown error',
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      label: 'JS Error: ' + (e.message || 'Unknown').substring(0, 50)
    });

    this.log('Error captured', { message: e.message, count: this.errorCount });
  };

  InfinityTracker.prototype.handleUnhandledRejection = function(e) {
    this.errorCount++;

    var message = 'Promise rejection';
    if (e.reason) {
      if (typeof e.reason === 'string') {
        message = e.reason;
      } else if (e.reason.message) {
        message = e.reason.message;
      }
    }

    this.addMarker('error', {
      message: message,
      type: 'unhandled_rejection',
      label: 'Promise: ' + message.substring(0, 50)
    });

    this.log('Unhandled rejection captured', { message: message, count: this.errorCount });
  };

  // ============ DEVICE/BROWSER DETECTION ============

  InfinityTracker.prototype.getDeviceType = function() {
    var ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  };

  InfinityTracker.prototype.getBrowserName = function() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('SamsungBrowser') > -1) return 'Samsung';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    if (ua.indexOf('Trident') > -1) return 'IE';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    return 'Unknown';
  };

  InfinityTracker.prototype.getOSName = function() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Unknown';
  };

  // ============ EXPOSE TO WINDOW ============

  window.InfinityTracker = InfinityTracker;
  window.adsmaster = window.adsmaster || {};

  // Auto-init if config exists
  if (window.amConfig) {
    window.adsmaster.tracker = new InfinityTracker(window.amConfig);
  }

  // Convenience alias
  window.am = window.adsmaster;

})();
