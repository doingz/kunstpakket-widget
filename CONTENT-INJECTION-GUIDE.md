# Content Injection Handleiding

## Hoe werkt het?

Het content injection systeem kan HTML, CSS en JavaScript injecteren op Kunstpakket pagina's via CSS selectors.

## 3 Manieren om content te injecteren:

### 1. Via API Endpoint (Aanbevolen - Dynamisch)

**Setup:**
1. Maak een API endpoint op: `https://analytics.bluestars.app/api/content`
2. Deze moet een JSON response teruggeven met `rules` array

**API Response Format:**
```json
{
  "rules": [
    {
      "selector": "#x",
      "condition": "hasUTMParams",
      "html": "<div class='banner'>...</div>",
      "css": ".banner { ... }",
      "js": "console.log('injected');"
    }
  ]
}
```

**Voordelen:**
- ✅ Content kan worden aangepast zonder widget update
- ✅ Centraal beheer
- ✅ Kan per client/conditie verschillen

### 2. Via Local Config (In widget.js)

**Setup:**
1. Zet `CONTENT_CONFIG.source = 'local'` in widget.js
2. Voeg rules toe aan `CONTENT_CONFIG.rules` array

**Voorbeeld:**
```javascript
const CONTENT_CONFIG = {
  enabled: true,
  source: 'local',  // ← Wijzig naar 'local'
  rules: [
    {
      selector: '#x',
      condition: 'hasUTMParams',
      html: '<div class="kp-banner"><p>🎨 Vindt via AI chat!</p></div>',
      css: '.kp-banner { background: #f0f0f0; padding: 15px; }',
      js: 'console.log("Banner injected!");'
    }
  ]
};
```

**Voordelen:**
- ✅ Direct in code
- ✅ Geen externe API nodig
- ✅ Sneller (geen API call)

### 3. Via Public API (Handmatig)

**Gebruik vanuit browser console of andere scripts:**

```javascript
// Injecteer content handmatig
window.KunstpakketAnalytics.injectContent(
  '#x',                                    // selector
  '<div>Hello World!</div>',               // html
  '.my-class { color: red; }',            // css
  'console.log("test");'                   // js
);

// Of re-initialiseer content injection
window.KunstpakketAnalytics.initContentInjection();
```

**Voordelen:**
- ✅ Direct testen
- ✅ Dynamisch tijdens runtime
- ✅ Handig voor debugging

## Rule Properties

Elke rule heeft de volgende properties:

### `selector` (VERPLICHT)
CSS selector waar content geïnjecteerd wordt.

**Voorbeelden:**
- `#x` - Element met id="x"
- `.banner` - Element met class="banner"
- `div.product-info` - Div met class="product-info"
- `[data-inject]` - Element met data-inject attribute

### `condition` (OPTIONEEL)
Wanneer moet content geïnjecteerd worden?

**Opties:**
- `'hasUTMParams'` - Alleen als UTM parameters aanwezig zijn
- `'isProductPage'` - Alleen op product pagina's
- `'isThankYouPage'` - Alleen op thank you pagina's
- `'always'` - Altijd injecteren
- `function() { return true; }` - Custom function

**Voorbeeld:**
```javascript
{
  selector: '#x',
  condition: 'hasUTMParams',  // Alleen bij AI chatbot traffic
  html: '...'
}
```

### `html` (OPTIONEEL)
HTML content die geïnjecteerd wordt.

**Voorbeeld:**
```javascript
html: '<div class="banner"><p>Text hier</p><a href="/link">Link</a></div>'
```

### `css` (OPTIONEEL)
CSS styling die toegevoegd wordt aan de pagina.

**Voorbeeld:**
```javascript
css: '.banner { background: #f0f0f0; padding: 15px; border-radius: 5px; }'
```

### `js` (OPTIONEEL)
JavaScript code die uitgevoerd wordt.

**Voorbeeld:**
```javascript
js: 'console.log("Banner injected!"); document.querySelector(".banner").addEventListener("click", function() { ... });'
```

## Praktijkvoorbeelden

### Voorbeeld 1: Banner injecteren

```javascript
{
  selector: '#product-info',
  condition: 'hasUTMParams',
  html: `
    <div class="kp-ai-banner">
      <p>🎨 Vindt via AI chat!</p>
      <a href="https://kunstpakket.ai">Bekijk AI chat</a>
    </div>
  `,
  css: `
    .kp-ai-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
      text-align: center;
    }
    .kp-ai-banner a {
      color: white;
      text-decoration: underline;
      font-weight: bold;
    }
  `,
  js: 'console.log("AI banner injected!");'
}
```

### Voorbeeld 2: Text link toevoegen

```javascript
{
  selector: '.product-description',
  condition: 'hasUTMParams',
  html: '<p><a href="https://kunstpakket.ai">Vind meer producten via AI chat</a></p>',
  css: 'a[href*="kunstpakket.ai"] { color: #0066cc; font-weight: bold; }',
  js: ''
}
```

### Voorbeeld 3: Injectie op meerdere locaties

```javascript
rules: [
  {
    selector: '#header',
    condition: 'hasUTMParams',
    html: '<div class="kp-banner-top">AI Chat</div>',
    css: '.kp-banner-top { background: #f0f0f0; padding: 10px; }'
  },
  {
    selector: '#footer',
    condition: 'hasUTMParams',
    html: '<div class="kp-banner-bottom">Powered by AI</div>',
    css: '.kp-banner-bottom { background: #f0f0f0; padding: 10px; }'
  }
]
```

## Testing

### Test in browser console:

```javascript
// Test content injection
window.KunstpakketAnalytics.injectContent(
  '#x',
  '<div style="background: red; padding: 20px; color: white;">TEST BANNER</div>',
  '',
  'console.log("Test successful!");'
);
```

### Check of content geïnjecteerd is:

```javascript
// Check localStorage voor injected content markers
document.querySelectorAll('[data-kp-injected]')
```

## Debugging

Content injection logt alles naar console:
- `✅ HTML injected into: #x`
- `✅ CSS injected for: #x`
- `✅ JavaScript injected for: #x`
- `⚠️ Content injection failed: #x` (als selector niet gevonden wordt)

## Belangrijke notities

- Content wordt **niet dubbel geïnjecteerd** (check op `data-kp-injected` attribute)
- Widget **wacht tot element bestaat** (retry mechanism, max 10x)
- Content wordt **automatisch re-injecteerd** bij SPA navigatie
- CSS wordt toegevoegd aan `<head>` met unieke ID
- JavaScript wordt uitgevoerd in globale scope

## API Endpoint Setup

Als je een API endpoint maakt, zorg dat deze:
- GET request accepteert
- JSON response teruggeeft met `rules` array
- CORS headers heeft (als je cross-origin requests doet)
- Status 200 teruggeeft bij success

**Voorbeeld API endpoint (Node.js/Express):**
```javascript
app.get('/api/content', (req, res) => {
  res.json({
    rules: [
      {
        selector: '#x',
        condition: 'hasUTMParams',
        html: '<div>Content hier</div>',
        css: '.my-class { ... }',
        js: 'console.log("test");'
      }
    ]
  });
});
```

## Veelgestelde Vragen

**Q: Kan ik meerdere rules toevoegen?**
A: Ja, voeg ze toe aan de `rules` array.

**Q: Wat als de selector niet bestaat?**
A: Widget probeert maximaal 10x met 500ms interval. Als niet gevonden, wordt er een warning gelogd.

**Q: Kan ik content updaten zonder widget update?**
A: Ja, als je API endpoint gebruikt. Wijzig de API response en refresh de pagina.

**Q: Werkt het met SPA's (Single Page Applications)?**
A: Ja, content wordt automatisch re-injecteerd bij URL changes.

**Q: Kan ik JavaScript gebruiken om dynamische content te maken?**
A: Ja, gebruik de `js` property om JavaScript uit te voeren die content kan manipuleren.

