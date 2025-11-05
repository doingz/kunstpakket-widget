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
   * Content Injection - Simple & Custom
   * Gebruik deze functie om HTML, CSS en JavaScript te injecteren
   * 
   * Voorbeeld gebruik:
   * window.KunstpakketAnalytics.injectContent('#x', '<div>Hello</div>', '.my-class { color: red; }', 'console.log("test");');
   */
  
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
   * Extract order total uit pagina
   */
  function extractOrderTotal() {
    // Optie 1: Uit URL parameter 'price' (aanbevolen - komt van Kunstpakket)
    const urlParams = new URLSearchParams(window.location.search);
    const priceParam = urlParams.get('price');
    if (priceParam) {
      const value = parseFloat(priceParam);
      if (!isNaN(value) && value > 0) return value;
    }
    
    // Optie 2: Uit data attribute
    const orderTotalEl = document.querySelector('[data-order-total]');
    if (orderTotalEl) {
      const value = parseFloat(orderTotalEl.getAttribute('data-order-total'));
      if (!isNaN(value) && value > 0) return value;
    }
    
    // Optie 3: Uit text content (zoek naar prijs)
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
    
    // Optie 4: Uit JavaScript variabele
    if (window.orderTotal) {
      const value = parseFloat(window.orderTotal);
      if (!isNaN(value) && value > 0) return value;
    }
    
    if (window.order && window.order.total) {
      const value = parseFloat(window.order.total);
      if (!isNaN(value) && value > 0) return value;
    }
    
    // Optie 5: Uit JSON-LD structured data
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
   * Extract product price uit URL of pagina
   */
  function extractProductPrice() {
    // Optie 1: Uit URL parameter 'price' (aanbevolen)
    const urlParams = new URLSearchParams(window.location.search);
    const priceParam = urlParams.get('price');
    if (priceParam) {
      const value = parseFloat(priceParam);
      if (!isNaN(value) && value > 0) return value;
    }
    
    // Optie 2: Uit data attribute
    const priceEl = document.querySelector('[data-product-price]');
    if (priceEl) {
      const value = parseFloat(priceEl.getAttribute('data-product-price'));
      if (!isNaN(value) && value > 0) return value;
    }
    
    // Optie 3: Uit prijs elementen in DOM
    const priceElements = document.querySelectorAll('[class*="price"]:not([class*="total"])');
    for (const el of priceElements) {
      const text = el.textContent || el.innerText;
      const match = text.match(/€?\s*(\d+[.,]\d{2})/);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value > 0) return value;
      }
    }
    
    return null;
  }

  /**
   * Sla product view info op in localStorage
   */
  function saveProductViewInfo() {
    const productId = extractProductId();
    const productUrl = window.location.href;
    const productTitle = extractProductTitle();
    const productPrice = extractProductPrice(); // Extract price from URL or DOM

    // Sla op in localStorage voor purchase tracking
    try {
      localStorage.setItem('kp_product_id', productId || '');
      localStorage.setItem('kp_product_url', productUrl || '');
      localStorage.setItem('kp_product_title', productTitle || '');
      localStorage.setItem('kp_product_price', productPrice ? productPrice.toString() : '');
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
    const productPrice = extractProductPrice();

    // Track view event
    trackEvent({
      event: 'view',
      product_id: productId,
      product_url: productUrl,
      product_title: productTitle,
      product_price: productPrice
    });

    // Stuur ook naar Google Analytics (alleen URL en source)
    if (typeof gtag !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source') || 'bluestars-ai-site';
      
      gtag('event', 'ai_chatbot_visit', {
        page_location: productUrl,  // URL
        source: utmSource           // Source (utm_source)
      });
      
      console.log('[KP Analytics] ✅ Sent to Google Analytics:', { url: productUrl, source: utmSource });
    }

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
      const productTitle = localStorage.getItem('kp_product_title') || null; // NIEUW!
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

      const productPrice = localStorage.getItem('kp_product_price');
      
      return {
        product_id: productId,
        product_url: productUrl,
        product_title: productTitle,
        product_price: productPrice ? parseFloat(productPrice) : null
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
      localStorage.removeItem('kp_product_price');
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
    
    // Extract order_total (productprijs/orderwaarde) - VERPLICHT
    // Probeer eerst van thank you pagina, anders van stored product_price
    let orderTotal = extractOrderTotal();
    
    // Fallback: gebruik product_price uit localStorage (van product view)
    if (!orderTotal && storedInfo?.product_price) {
      orderTotal = storedInfo.product_price;
      console.log('[KP Analytics] Using product_price from localStorage as order_total:', orderTotal);
    }
    
    // ⚠️ KRITIEK: Stop als order_total ontbreekt
    if (!orderTotal || orderTotal <= 0) {
      console.error('[KP Analytics] ❌ Order total not found or invalid:', orderTotal);
      console.warn('[KP Analytics] Purchase not tracked - order_total is required');
      window.purchaseTracked = false; // Reset zodat we kunnen retry
      return;
    }
    
    // Bereken revenue (voor Bluestars) - VERPLICHT
    const revenue = 10.00;
    
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
      order_total: orderTotal,  // VERPLICHT: Productprijs/orderwaarde
      revenue: revenue          // VERPLICHT: Revenue voor Bluestars
    });
    
    // Verwijder opgeslagen info na purchase
    clearStoredProductInfo();
  }
  
  /**
   * Injecteer AI banner in .container-bar
   * LOS VAN ANALYTICS - Banner wordt altijd getoond
   */
  function injectAIBanner() {
    const aiBannerHTML = `
      <div class="kp-ai-banner">
        <div class="kp-ai-banner-content">
          <span class="kp-ai-text">ai Cadeau tips? <a href="https://kunstpakket.ai" target="_blank" class="kp-ai-link">Klik hier</a></span>
        </div>
      </div>
    `;
    
    const aiBannerCSS = `
      .container-bar {
        padding: 0 !important;
      }
      
      .kp-ai-banner {
        position: relative !important;
        margin: 15px 0 !important;
        padding: 0 !important;
        border-radius: 12px !important;
        background: transparent !important;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 9999 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      .kp-ai-banner::before {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        border-radius: 12px !important;
        padding: 1px !important;
        background: linear-gradient(90deg, 
          #ff0080, #ff8c00, #ffd700, #32cd32, #00ced1, #1e90ff, #8a2be2, #ff0080, #ff8c00, #ffd700, #32cd32, #00ced1, #1e90ff, #8a2be2, #ff0080
        ) !important;
        background-size: 400% 100% !important;
        animation: kp-rainbow-border 3s linear infinite !important;
        -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0) !important;
        -webkit-mask-composite: xor !important;
        mask-composite: exclude !important;
        z-index: 0 !important;
      }
      
      [data-kp-injected="kp-injected--container-bar"] {
        padding: 15px !important;
      }
      
      @keyframes kp-rainbow-border {
        0% { 
          background-position: 0% 0%;
        }
        100% { 
          background-position: 100% 0%;
        }
      }
      
      .kp-ai-banner-content {
        background: white !important;
        border-radius: 11px !important;
        padding: 14px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 12px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      .kp-ai-text {
        font-size: 16px !important;
        font-weight: normal !important;
        color: #333 !important;
        line-height: 1.4 !important;
        text-align: center !important;
      }
      
      .kp-ai-link {
        color: #0066cc !important;
        text-decoration: none !important;
        font-weight: 700 !important;
        transition: all 0.3s ease !important;
        border-bottom: 2px solid transparent !important;
      }
      
      .kp-ai-link:hover {
        color: #0052a3 !important;
        border-bottom-color: #0052a3 !important;
        transform: translateY(-1px) !important;
      }
      
      .kp-ai-link:active {
        transform: translateY(0) !important;
      }
    `;
    
    injectContent('.container-bar', aiBannerHTML, aiBannerCSS);
  }
  
  /**
   * Content Injection - Simple & Custom
   * Injecteert HTML, CSS en JavaScript in een element
   * 
   * @param {string} selector - CSS selector waar content geïnjecteerd wordt (bijv. '#x', '.class')
   * @param {string} html - HTML content (optioneel)
   * @param {string} css - CSS styling (optioneel)
   * @param {string} js - JavaScript code (optioneel)
   * @param {number} retries - Aantal keer proberen als element niet gevonden wordt (default: 10)
   */
  function injectContent(selector, html, css, js, retries = 10) {
    const tryInject = (attempt = 0) => {
      const element = document.querySelector(selector);
      
      if (!element) {
        if (attempt < retries) {
          setTimeout(() => tryInject(attempt + 1), 500);
          return;
        }
        return;
      }
      
      // Check of al geïnjecteerd
      const injectId = `kp-injected-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`;
      if (element.querySelector(`[data-kp-injected="${injectId}"]`)) {
        return;
      }
      
      // Injecteer HTML
      if (html) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-kp-injected', injectId);
        wrapper.innerHTML = html;
        // Injecteer aan het begin van het element (prepend)
        element.insertBefore(wrapper, element.firstChild);
      }
      
      // Injecteer CSS
      if (css) {
        const cssId = `kp-style-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`;
        let style = document.getElementById(cssId);
        if (!style) {
          style = document.createElement('style');
          style.id = cssId;
          document.head.appendChild(style);
        }
        style.textContent = css;
      }
      
      // Injecteer JavaScript
      if (js) {
        try {
          const script = document.createElement('script');
          script.textContent = js;
          document.head.appendChild(script);
        } catch (err) {
          console.error('[KP Analytics] JavaScript injection error:', err);
        }
      }
    };
    
    tryInject();
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
    
    // Inject AI banner in .container-bar (altijd)
    injectAIBanner();
    
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
          
          // Re-inject AI banner bij SPA navigatie
          injectAIBanner();
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
    extractOrderTotal: extractOrderTotal,
    injectContent: injectContent  // Injecteer HTML, CSS, JS in element
  };
  
})();
