# Kunstpakket Analytics Integratie Handleiding

## 📋 Overzicht

Deze handleiding legt uit hoe je de analytics tracking kunt integreren in de Kunstpakket widget. Er zijn twee soorten events die je moet tracken:

1. **Product View** - Wanneer iemand een product pagina bezoekt (met `utm_source=bluestars-ai-site`)
2. **Purchase** - Wanneer iemand een aankoop doet (thank you pagina)

## 🔗 API Endpoint

```
https://analytics.bluestars.app/api/track
```

Alle calls zijn `POST` requests met JSON data.

---

## 1️⃣ Product View Tracking

### Wanneer tracken?

**BELANGRIJK:** Alleen tracken als er UTM parameters in de URL staan met `utm_source=bluestars-ai-site`.

Wanneer iemand op een product pagina komt met UTM parameters (bijv. `https://www.kunstpakket.nl/product-slug.html?utm_source=bluestars-ai-site&utm_medium=chat&utm_content=123456789`).

### Wat sturen?

```javascript
{
  "event": "view",
  "client_id": "kunstpakket.nl",
  "product_id": "123456789",           // Optioneel: product ID
  "product_url": "https://www.kunstpakket.nl/product-slug.html",
  "product_title": "Product Naam"      // Optioneel maar aanbevolen
}
```

### Belangrijke Features:

- ✅ **UTM Check:** Alleen tracken als `utm_source=bluestars-ai-site` in URL
- ✅ **localStorage:** Product info wordt opgeslagen voor purchase tracking
- ✅ **Auto-detectie:** Detecteert automatisch `.html` pagina's met UTM params

---

## 2️⃣ Purchase Tracking

### Wanneer tracken?

Wanneer iemand op de thank you / bedankt pagina komt na een aankoop. De URL moet "thankyou" bevatten.

### Wat sturen?

```javascript
{
  "event": "purchase",
  "client_id": "kunstpakket.nl",
  "product_id": "123456789",           // Optioneel
  "product_url": "https://...",        // Optioneel
  "product_title": "Product Naam",     // Optioneel maar aanbevolen
  "order_total": 99.99,                // Productprijs (optioneel, default 0)
  "revenue": 10                         // VERPLICHT! Vaste €10 per aankoop
}
```

### ⚠️ BELANGRIJK: Revenue is VERPLICHT!

- `revenue` = **Altijd €10** per aankoop (vaste waarde)
- `order_total` = Productprijs (optioneel, fallback naar 0 als niet gevonden)

### Belangrijke Features:

- ✅ **localStorage:** Gebruikt opgeslagen product info van product view
- ✅ **Revenue:** Altijd €10 per purchase (vanuit widget)
- ✅ **Order Total:** Productprijs (optioneel, kan 0 zijn)
- ✅ **Auto-detectie:** Detecteert automatisch thank you pagina's (URL bevat "thankyou")

---

## 3️⃣ Huidige Implementatie (widget.js)

De huidige widget implementatie:

### Product View Flow:
1. Check of `utm_source=bluestars-ai-site` in URL
2. Als aanwezig → Track view event
3. Sla product info op in localStorage (voor purchase)

### Purchase Flow:
1. Check of URL "thankyou" bevat
2. Haal product info op uit localStorage (van product view)
3. Extract order_total (productprijs) - optioneel, fallback naar 0
4. Stuur purchase event met:
   - `order_total` = productprijs (of 0)
   - `revenue` = 10 (vaste waarde)

### Code Snippets:

```javascript
// Product View - alleen met UTM params
function trackProductView() {
  if (!hasUTMParameters()) return; // Check utm_source=bluestars-ai-site
  
  const productId = extractProductId();
  const productUrl = window.location.href;
  const productTitle = extractProductTitle();
  
  // Track + save to localStorage
  trackEvent({
    event: 'view',
    client_id: 'kunstpakket.nl',
    product_id: productId,
    product_url: productUrl,
    product_title: productTitle
  });
  
  saveProductViewInfo(); // Slaat op voor purchase
}

// Purchase - gebruikt localStorage
function trackPurchase() {
  const orderTotal = extractOrderTotal() || 0; // Fallback naar 0
  const revenue = 10; // Vaste €10
  
  const storedInfo = getStoredProductInfo(); // Van localStorage
  
  trackEvent({
    event: 'purchase',
    client_id: 'kunstpakket.nl',
    product_id: storedInfo?.product_id || extractProductId(),
    product_url: storedInfo?.product_url || window.location.href,
    product_title: storedInfo?.product_title || extractProductTitle(),
    order_total: orderTotal,  // Productprijs (optioneel, min 0)
    revenue: revenue  // Vaste €10 per aankoop
  });
}
```

---

## 4️⃣ Verschillen met Oude Handleiding

| Aspect | Oude Handleiding | Huidige Implementatie |
|--------|------------------|----------------------|
| `order_total` | **VERPLICHT** | **Optioneel** (fallback naar 0) |
| `revenue` | Niet vermeld | **VERPLICHT** (altijd 10) |
| UTM Check | Niet vermeld | **VERPLICHT** (`utm_source=bluestars-ai-site`) |
| localStorage | Niet vermeld | **Wordt gebruikt** voor product info |
| Thank You Detectie | Alleen specifieke paden | **Elke URL met "thankyou"** |

---

## 5️⃣ Testen

### Test Product View:

1. Open product pagina met UTM params: `?utm_source=bluestars-ai-site&utm_medium=chat&utm_content=123456789`
2. Check browser console voor: `[KP Analytics] ✅ Event tracked: view`
3. Check localStorage: `localStorage.getItem('kp_product_id')` zou product ID moeten bevatten
4. Check dashboard: `https://analytics.bluestars.app`

### Test Purchase:

1. Ga naar thank you pagina (URL bevat "thankyou")
2. Check browser console voor:
   - `[KP Analytics] ✅ Event tracked: purchase`
   - Of errors als iets mis gaat
3. Check dashboard voor nieuwe purchase met:
   - Revenue: €10.00
   - Order Total: productprijs (of 0 als niet gevonden)

### Debug Helper:

```javascript
// Test functie - voeg toe aan console
function testAnalytics() {
  console.log('Has UTM params:', hasUTMParameters());
  console.log('Product ID:', extractProductId());
  console.log('Product Title:', extractProductTitle());
  console.log('Order Total:', extractOrderTotal());
  console.log('Is Thank You Page:', isThankYouPage());
  console.log('Stored Product Info:', getStoredProductInfo());
}
```

---

## 6️⃣ Veelgestelde Vragen

### Q: Moet ik order_total altijd meesturen?

**A:** Nee, `order_total` is optioneel. Als het niet gevonden wordt, wordt het 0. Maar `revenue` is verplicht en moet altijd 10 zijn.

### Q: Wat als ik geen product_id heb?

**A:** Geen probleem, `product_id` is optioneel. De purchase wordt dan opgeslagen zonder product_id.

### Q: Wat als extractOrderTotal() niets vindt?

**A:** Geen probleem, `order_total` wordt dan 0. De purchase wordt gewoon getracked met revenue = 10.

### Q: Waarom wordt product view niet getracked?

**A:** Check of `utm_source=bluestars-ai-site` in de URL staat. Zonder deze UTM parameter wordt er niets getracked.

### Q: Waarom wordt purchase niet getracked?

**A:** Check of de URL "thankyou" bevat. Ook check of er product info in localStorage staat (van een eerdere product view).

---

## 7️⃣ Support

Voor vragen of problemen:

- Check browser console voor errors
- Test met de test functies hierboven
- Check dashboard voor opgeslagen data
- Check localStorage voor opgeslagen product info

---

## ✅ Checklist

- [x] Analytics code toegevoegd aan widget
- [x] `extractOrderTotal()` werkt op thank you pagina (optioneel, fallback 0)
- [x] Product view tracking werkt alleen met UTM params
- [x] Purchase tracking werkt op thank you pagina (URL bevat "thankyou")
- [x] `revenue` wordt altijd meegegeven (10)
- [x] `order_total` wordt meegegeven (productprijs of 0)
- [x] localStorage wordt gebruikt voor product info
- [x] Test gedaan en data verschijnt in dashboard

---

**Huidige Status: ✅ Volledig geïmplementeerd en werkend!**

De widget is klaar voor productie met:
- ✅ UTM parameter check voor product views
- ✅ localStorage voor product info tussen view en purchase
- ✅ Revenue = €10 per purchase (vaste waarde)
- ✅ Order Total = productprijs (optioneel, fallback 0)
- ✅ Auto-detectie van thank you pagina's (URL bevat "thankyou")

