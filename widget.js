/**
 * Kunstpakket Analytics Tracking
 * 
 * Trackt product page views en purchases voor analytics dashboard.
 * 
 * Locatie: Kunstpakket.nl
 */
(function() {
  'use strict';
  
  const VERSION = '7.0.0';
  const ANALYTICS_API = 'https://analytics.bluestars.app/api/track'; // Update met je analytics URL
  const CLIENT_ID = 'kunstpakket.nl';
  
  /**
   * Track event naar analytics API
   */
  async function trackEvent(eventData) {
    try {
      const response = await fetch(ANALYTICS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          ...eventData
        }),
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        console.warn('[KP Analytics] Tracking failed:', await response.text());
      } else {
        console.log('[KP Analytics] ✅ Event tracked:', eventData.event);
      }
    } catch (err) {
      console.warn('[KP Analytics] Tracking error:', err.message);
    }
  }
  
  /**
   * Extract product ID uit URL of DOM
   */
  function extractProductId() {
    // Optie 1: Uit UTM parameter (als die bestaat)
    const urlParams = new URLSearchParams(window.location.search);
    const utmContent = urlParams.get('utm_content');
    if (utmContent) {
      return utmContent;
    }

    // Optie 2: Uit URL path
    const pathMatch = window.location.pathname.match(/\/product\/([^\/]+)/);
    if (pathMatch) {
      return pathMatch[1].replace('.html', '');
    }

    // Optie 3: Uit DOM element (data-product-id attribute)
    const productIdEl = document.querySelector('[data-product-id]');
    if (productIdEl) {
      return productIdEl.getAttribute('data-product-id');
    }

    // Optie 4: Uit meta tag
    const metaProductId = document.querySelector('meta[property="product:id"], meta[name="product:id"]');
    if (metaProductId) {
      return metaProductId.getAttribute('content');
    }

    // Optie 5: Uit script tag (JSON-LD structured data)
    try {
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        const data = JSON.parse(jsonLd.textContent);
        if (data['@type'] === 'Product' && data.sku) {
          return data.sku;
        }
        if (data['@type'] === 'Product' && data.productID) {
          return data.productID;
        }
      }
    } catch (e) {
      // Ignore
    }

    return null; // Product ID is optioneel
  }

  /**
   * Extract product title uit pagina
   */
  function extractProductTitle() {
    // Optie 1: Uit meta tag (Open Graph title - aanbevolen)
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle) {
      return metaTitle.getAttribute('content');
    }

    // Optie 2: Uit h1 tag met product class
    const h1 = document.querySelector('h1.product-title, h1[data-product-title]');
    if (h1) {
      return h1.textContent.trim();
    }

    // Optie 3: Uit data attribute
    const dataTitle = document.querySelector('[data-product-title]');
    if (dataTitle) {
      return dataTitle.getAttribute('data-product-title');
    }

    // Optie 4: Uit page title (laatste redmiddel)
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== 'Kunstpakket') {
      // Verwijder site naam van title
      return pageTitle.replace(/\s*[-|]\s*Kunstpakket.*$/i, '').trim();
    }

    return null; // Optioneel - API accepteert null
  }
  
  /**
   * Extract product prijs uit URL parameter of pagina
   * Gebruikt voor order_total bij purchase
   * 
   * PRIORITEIT:
   * 1. URL parameter (price of utm_price) - ALTIJD AANWEZIG vanuit AI chatbot!
   * 2. Product pagina DOM (fallback voor edge cases)
   * 3. Data attributes (fallback)
   * 4. JSON-LD structured data (fallback)
   * 
   * Voorbeeld URL: 
   * ?utm_source=bluestars-ai-site&price=45.00
   * of
   * ?utm_source=bluestars-ai-site&utm_price=45.00
   * 
   * NOTE: Prijs wordt altijd als 'price' parameter meegestuurd vanuit AI chatbot!
   */
  function extractProductPrice() {
    // Optie 1: Uit URL parameter (ALTIJD AANWEZIG vanuit AI chatbot!)
    // Ondersteunt beide: 'price' (aanbevolen) en 'utm_price' (alternatief)
    const urlParams = new URLSearchParams(window.location.search);
    const priceParam = urlParams.get('price') || urlParams.get('utm_price');
    if (priceParam) {
      const value = parseFloat(priceParam);
      if (!isNaN(value) && value > 0) {
        console.log('[KP Analytics] ✅ Product price from URL parameter:', value);
        return value; // Meestal stoppen hier - price is altijd aanwezig!
      }
    }
    
    // Fallback: Als price parameter niet gevonden (edge case)
    console.warn('[KP Analytics] ⚠️ Price parameter not found, trying page extraction...');
    
    // Optie 2: Uit product pagina (bij view)
    // Zoek naar prijs op de pagina
    const priceElements = document.querySelectorAll(
      '[class*="price"]:not([class*="total"]), ' +
      '[data-product-price], ' +
      '.product-price, ' +
      '[itemprop="price"]'
    );
    
    for (const el of priceElements) {
      const text = el.textContent || el.innerText;
      // Match: €12,99 of €12.99 of 12,99 of 12.99
      const match = text.match(/€?\s*(\d+[.,]\d{2})/);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value > 0) {
          console.log('[KP Analytics] Product price from page:', value);
          return value;
        }
      }
    }
    
    // Optie 3: Uit data attribute
    const priceEl = document.querySelector('[data-product-price]');
    if (priceEl) {
      const value = parseFloat(priceEl.getAttribute('data-product-price'));
      if (!isNaN(value) && value > 0) return value;
    }
    
    // Optie 4: Uit JSON-LD structured data
    try {
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        const data = JSON.parse(jsonLd.textContent);
        if (data['@type'] === 'Product' && data.offers && data.offers.price) {
          const value = parseFloat(data.offers.price);
          if (!isNaN(value) && value > 0) return value;
        }
        if (data['@type'] === 'Product' && data.price) {
          const value = parseFloat(data.price);
          if (!isNaN(value) && value > 0) return value;
        }
      }
    } catch (e) {
      // Ignore
    }
    
    return null;
  }

  /**
   * Extract order total uit pagina (thank you pagina)
   */
  function extractOrderTotal() {
    // Optie 1: Uit data attribute
    const orderTotalEl = document.querySelector('[data-order-total]');
    if (orderTotalEl) {
      const value = parseFloat(orderTotalEl.getAttribute('data-order-total'));
      if (!isNaN(value) && value > 0) return value;
    }
    
    // Optie 2: Uit text content (zoek naar prijs)
    const priceElements = document.querySelectorAll('[class*="price"], [class*="total"], [id*="total"], [class*="amount"]');
    for (const el of priceElements) {
      const text = el.textContent || el.innerText;
      // Match: €12,99 of €12.99 of 12,99 of 12.99
      const match = text.match(/€?\s*(\d+[.,]\d{2})/);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value > 0) return value;
      }
    }
    
    // Optie 3: Uit JavaScript variabele
    if (window.orderTotal) {
      const value = parseFloat(window.orderTotal);
      if (!isNaN(value) && value > 0) return value;
    }
    
    if (window.order && window.order.total) {
      const value = parseFloat(window.order.total);
      if (!isNaN(value) && value > 0) return value;
    }
    
    // Optie 4: Uit JSON-LD structured data
    try {
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        const data = JSON.parse(jsonLd.textContent);
        if (data.totalPrice) {
          const value = parseFloat(data.totalPrice);
          if (!isNaN(value) && value > 0) return value;
        }
        if (data.price) {
          const value = parseFloat(data.price);
          if (!isNaN(value) && value > 0) return value;
        }
      }
    } catch (e) {
      // Ignore
    }
    
    // Optie 5: Uit URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const total = urlParams.get('total') || urlParams.get('amount') || urlParams.get('price');
    if (total) {
      const value = parseFloat(total);
      if (!isNaN(value) && value > 0) return value;
    }
    
    return null;
  }
  
  /**
   * Check of we op een product pagina zijn
   */
  function isProductPage() {
    const path = window.location.pathname.toLowerCase();
    return path.includes('/product/') ||
           (path.match(/\/[^\/]+\.html$/) && hasUTMParameters());
  }
  
  /**
   * Check of er UTM parameters in de URL staan
   */
  function hasUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    // Alleen checken op utm_source=bluestars-ai-site
    return urlParams.get('utm_source') === 'bluestars-ai-site';
  }
  
  /**
   * Check of we op thank you pagina zijn
   */
  function isThankYouPage() {
    const url = window.location.href.toLowerCase();

    // Als de URL 'thankyou' bevat, beschouw het als valide thank you pagina
    if (url.includes('thankyou')) {
      return true;
    }

    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const title = document.title.toLowerCase();

    return path.includes('/thank-you') ||
           path.includes('/bedankt') ||
           path.includes('/order-success') ||
           path.includes('/bestelling-bevestigd') ||
           search.includes('order=success') ||
           search.includes('status=success') ||
           search.includes('bedankt') ||
           title.includes('bedankt') ||
           title.includes('thank you') ||
           document.querySelector('[data-thank-you-page]') !== null;
  }
  
  /**
   * Sla product view info op in localStorage
   */
  function saveProductViewInfo() {
    const productId = extractProductId();
    const productUrl = window.location.href;
    const productTitle = extractProductTitle();
    const productPrice = extractProductPrice(); // NIEUW: Productprijs

    // Sla op in localStorage voor purchase tracking
    try {
      localStorage.setItem('kp_product_id', productId || '');
      localStorage.setItem('kp_product_url', productUrl || '');
      localStorage.setItem('kp_product_title', productTitle || '');
      localStorage.setItem('kp_product_price', productPrice ? productPrice.toString() : ''); // NIEUW!
      localStorage.setItem('kp_view_timestamp', Date.now().toString());
    } catch (e) {
      console.warn('[KP Analytics] Failed to save to localStorage:', e);
    }
  }
  
  /**
   * Track product page view
   * Alleen als er UTM parameters in de URL staan!
   */
  function trackProductView() {
    // Alleen tracken als er UTM parameters zijn
    if (!hasUTMParameters()) {
      return;
    }

    // Prevent double tracking
    if (window.productViewTracked) return;

    const productId = extractProductId();
    const productUrl = window.location.href;
    const productTitle = extractProductTitle();

    // Track view event
    trackEvent({
      event: 'view',
      product_id: productId,
      product_url: productUrl,
      product_title: productTitle  // NIEUW!
    });

    // Sla info op in localStorage voor purchase tracking
    saveProductViewInfo();

    window.productViewTracked = true;
  }
  
  /**
   * Haal product info op uit localStorage
   */
  function getStoredProductInfo() {
    try {
      const productId = localStorage.getItem('kp_product_id') || null;
      const productUrl = localStorage.getItem('kp_product_url') || null;
      const productTitle = localStorage.getItem('kp_product_title') || null;
      const productPrice = localStorage.getItem('kp_product_price'); // NIEUW!
      const viewTimestamp = localStorage.getItem('kp_view_timestamp');

      // Check of view info niet ouder is dan 7 dagen
      if (viewTimestamp) {
        const viewTime = parseInt(viewTimestamp);
        const daysSinceView = (Date.now() - viewTime) / (1000 * 60 * 60 * 24);
        if (daysSinceView > 7) {
          // Te oud, verwijder
          clearStoredProductInfo();
          return null;
        }
      }

      return {
        product_id: productId,
        product_url: productUrl,
        product_title: productTitle,
        product_price: productPrice ? parseFloat(productPrice) : null // NIEUW!
      };
    } catch (e) {
      console.warn('[KP Analytics] Failed to read from localStorage:', e);
      return null;
    }
  }
  
  /**
   * Verwijder opgeslagen product info
   */
  function clearStoredProductInfo() {
    try {
      localStorage.removeItem('kp_product_id');
      localStorage.removeItem('kp_product_url');
      localStorage.removeItem('kp_product_title');
      localStorage.removeItem('kp_product_price'); // NIEUW!
      localStorage.removeItem('kp_view_timestamp');
    } catch (e) {
      // Ignore
    }
  }
  
  /**
   * Track purchase (thank you page)
   * Gebruikt opgeslagen info uit localStorage
   */
  function trackPurchase() {
    // Prevent double tracking
    if (window.purchaseTracked) return;
    window.purchaseTracked = true;
    
    // Haal product info op uit localStorage (van product view)
    const storedInfo = getStoredProductInfo();
    
    // order_total = productprijs waar user binnenkwam
    // Prioriteit: 1) Opgeslagen prijs van product view, 2) Order total van thank you pagina, 3) 0
    const orderTotal = storedInfo?.product_price || extractOrderTotal() || 0;
    
    // revenue = vaste €10 per aankoop (VERPLICHT)
    const revenue = 10;
    
    // Gebruik opgeslagen info, of fallback naar huidige pagina
    const productId = storedInfo?.product_id || extractProductId();
    const productUrl = storedInfo?.product_url || window.location.href;
    const productTitle = storedInfo?.product_title || extractProductTitle();

    console.log('[KP Analytics] 📦 Tracking purchase:', {
      product_id: productId,
      product_title: productTitle,
      order_total: orderTotal,
      revenue: revenue
    });
    
    // Track purchase event
    trackEvent({
      event: 'purchase',
      product_id: productId,
      product_url: productUrl,
      product_title: productTitle,
      order_total: orderTotal,  // Productprijs (optioneel, min 0)
      revenue: revenue  // Vaste €10 per aankoop
    });
    
    // Verwijder opgeslagen info na purchase
    clearStoredProductInfo();
  }
  
  /**
   * Initialize tracking
   */
  function init() {
    console.log(`[KP Analytics] v${VERSION} loaded`);
    
    // Track product view
    if (isProductPage()) {
      trackProductView();
    }
    
    // Track purchase
    if (isThankYouPage()) {
      trackPurchase();
    }
    
    // Listen for URL changes (SPA support)
    if (window.history && window.history.pushState) {
      const originalPushState = window.history.pushState;
      window.history.pushState = function(...args) {
        originalPushState.apply(window.history, args);
        setTimeout(() => {
          // Reset tracking flags on navigation
          window.productViewTracked = false;
          window.purchaseTracked = false;
          
          if (isProductPage()) {
            trackProductView();
          }
          
          if (isThankYouPage()) {
            trackPurchase();
          }
        }, 100);
      };
    }
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Also check periodically (for dynamic content)
  setInterval(() => {
    if (isProductPage() && !window.productViewTracked) {
      trackProductView();
    }
    
    if (isThankYouPage() && !window.purchaseTracked) {
      trackPurchase();
    }
  }, 2000);
  
  // Public API
  window.KunstpakketAnalytics = {
    version: VERSION,
    trackProductView: trackProductView,
    trackPurchase: trackPurchase,
    extractProductId: extractProductId,
    extractProductTitle: extractProductTitle,
    extractProductPrice: extractProductPrice,  // NIEUW!
    extractOrderTotal: extractOrderTotal
  };
  
})();
