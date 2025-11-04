/**
 * Kunstpakket Analytics Tracking Only
 * 
 * Dit script trackt alleen clicks en purchases van de externe AI site.
 * Geen search functionaliteit meer - die gebeurt op de externe AI site.
 * 
 * Locatie: Kunstpakket.nl
 */
(function() {
  'use strict';
  
  const VERSION = '6.0.0';
  const ANALYTICS_API = 'https://analytics.bluestars.app/api/track';
  const TRACKING_EXPIRY_DAYS = 7;
  
  /**
   * LocalStorage helpers with expiry
   */
  function setWithExpiry(key, value, days = TRACKING_EXPIRY_DAYS) {
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + (days * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
  }
  
  function getWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    try {
      const item = JSON.parse(itemStr);
      const now = new Date();
      
      if (now.getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (e) {
      return null;
    }
  }
  
  function removeTracking() {
    localStorage.removeItem('kp_search_id');
    localStorage.removeItem('kp_last_product_id');
    localStorage.removeItem('kp_last_product_url');
    localStorage.removeItem('kp_last_query');
  }
  
  /**
   * Track purchase op thank you pagina
   */
  function trackPurchase() {
    try {
      const searchId = getWithExpiry('kp_search_id');
      if (!searchId) return;
      
      const productId = getWithExpiry('kp_last_product_id');
      const productUrl = getWithExpiry('kp_last_product_url');
      
      fetch(ANALYTICS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'purchase',
          client_id: 'kunstpakket.nl',
          search_id: searchId,
          product_id: productId || null,
          product_url: productUrl || null
        })
      }).catch(err => console.warn('[Analytics] Purchase tracking failed:', err));
      
      // Clear tracking data after purchase
      removeTracking();
    } catch (err) {
      console.warn('[Analytics] Error:', err);
    }
  }
  
  /**
   * Check voor purchase pagina
   */
  function checkPurchasePage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    
    if (url.includes('/thankyou') || 
        url.includes('?thankyou') ||
        url.includes('/bedankt') ||
        url.includes('?bedankt') ||
        url.includes('/thank-you') ||
        url.includes('/success') ||
        url.includes('?order=success') ||
        title.includes('bedankt') ||
        title.includes('thank you')) {
      trackPurchase();
    }
  }
  
  /**
   * Check voor click tracking parameter (iOS Safari proof!)
   * URL format: ?bsclick=1&bssid=search_id&bspid=product_id&bspname=product_name
   * All params prefixed with 'bs' to prevent Lightspeed filtering
   */
  function checkClickTracking() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.get('bsclick') === '1') {
        const searchId = urlParams.get('bssid');
        const productId = urlParams.get('bspid');
        const productName = urlParams.get('bspname');
        
        if (searchId && productId) {
          console.log('[KP Analytics] Click tracking detected:', { searchId, productId, productName });
          
          // Sla search_id op voor purchase tracking
          setWithExpiry('kp_search_id', searchId);
          setWithExpiry('kp_last_product_id', productId);
          setWithExpiry('kp_last_product_url', window.location.pathname.replace('.html', '').replace('/', ''));
          
          const data = JSON.stringify({
            event: 'click',
            client_id: 'kunstpakket.nl',
            search_id: searchId,
            product_id: productId,
            product_name: productName || null,
            product_url: window.location.pathname.replace('.html', '').replace('/', '')
          });
          
          // Use fetch with keepalive (more reliable than sendBeacon for CORS)
          fetch(ANALYTICS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            keepalive: true,
            mode: 'cors',
            credentials: 'omit'
          })
          .then(() => console.log('[KP Analytics] Click tracked ✅'))
          .catch(err => console.warn('[KP Analytics] Click tracking failed:', err.message));
          
          // Clean up URL (remove tracking params)
          urlParams.delete('bsclick');
          urlParams.delete('bssid');
          urlParams.delete('bspid');
          urlParams.delete('bspname');
          
          const newSearch = urlParams.toString();
          const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
          window.history.replaceState({}, '', newUrl);
        }
      }
    } catch (err) {
      console.warn('[KP Analytics] Click tracking error:', err);
    }
  }
  
  /**
   * Initialize tracking
   */
  function init() {
    console.log(`[KP Analytics] v${VERSION} loaded - Tracking only mode`);
    
    // Always check for click tracking (from external AI site)
    checkClickTracking();
    
    // Always check for purchase page
    checkPurchasePage();
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Public API (for backwards compatibility)
  window.KunstpakketAnalytics = {
    version: VERSION,
    trackClick: checkClickTracking,
    trackPurchase: checkPurchasePage
  };
  
})();
