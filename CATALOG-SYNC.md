# Catalog Sync Workflow

This document describes how to keep the AI search system up-to-date with the latest catalog data.

## 🔄 When to Run Sync

Run the sync scripts when:
- New brands are added to Lightspeed
- Product categories change
- New product types are introduced
- Preparing for deployment to a new webshop

## 📊 Sync Scripts

### 1. Sync Lightspeed Data (`sync-lightspeed.js`)
Syncs all catalog data (brands, categories, products) from Lightspeed API.

```bash
npm run sync
```

**Output**:
- `data/brands.json` - All brand data
- `data/categories.json` - All category data
- `data/products.json` - All product data with embeddings

### 2. Import Products (`import-products.js`)
Imports products to database with embeddings and type detection.

```bash
npm run import
```

**Note**: This is the main import script that handles the complete data pipeline.

## 🚀 Complete Sync Workflow

For a fresh start or after major catalog changes:

```bash
# 1. Sync all catalog data from Lightspeed
npm run sync

# 2. Import products to database with embeddings
npm run import

# 3. Deploy to Vercel
git add data/*.json
git commit -m "chore: update catalog data"
git push origin main
```

## 📁 Data Files

All catalog data is stored in `data/` directory:

| File | Source | Update Frequency |
|------|--------|------------------|
| `brands.json` | Lightspeed API | When brands change |
| `categories.json` | Lightspeed API | When categories change |
| `products.json` | Lightspeed API | Daily/Weekly |
| `categories-products.json` | Lightspeed API | Daily/Weekly |
| `tags.json` & `tags-products.json` | Lightspeed API | Daily/Weekly |
| `product-types.json` | Database | After product import |
| `themes.json` | Curated/Manual | Rarely (search keywords) |

## 🔍 How It Works

### Catalog Metadata (`lib/catalog-metadata.ts`)

This file is the **single source of truth** for all catalog data. It:

1. **Loads dynamic data** from JSON files on startup
2. **Caches data** in memory for performance
3. **Provides helper functions**:
   - `getCatalogMetadata()` - Returns all metadata
   - `getCategoryName(id)` - Category ID → name lookup
   - `normalizeBrand(input)` - Normalize brand search terms
   - `buildPromptInstructions()` - AI prompt with real catalog data
   - `getCatalogSummary()` - Catalog summary for AI advice

### Search API (`api/search.ts`)

Uses the catalog metadata for:
- AI filter parsing (knows all valid brands/types/categories)
- Category name display in results
- Dynamic similarity thresholds
- Advice message generation

### Brand Normalization

The system includes intelligent brand normalization:

```typescript
// User searches for:
"klimt" → "Gustav Klimt"
"van gogh" → "Vincent van Gogh"  
"forchino" → "Guillermo Forchino beelden"
"kokeshi" → "Kokeshi dolls"
```

Add new normalizations in `lib/catalog-metadata.ts` → `BRAND_NORMALIZATIONS`.

## 🌍 Multi-Site Deployment

For deploying to multiple webshops:

1. **Clone repository** for new site
2. **Update `.env`** with site-specific Lightspeed credentials
3. **Run complete sync workflow** (see above)
4. **Deploy to Vercel** with site-specific environment variables

The same codebase works for all sites - only the data files differ!

## ⚠️ Important Notes

- **Always run sync BEFORE importing products** (import needs catalog data)
- **Themes are curated** (`data/themes.json`) - edit manually for best search results
- **Restart Vercel functions** after updating data files (automatic on git push)
- **Cache is per-process** - each serverless function instance caches independently

## 🔧 Troubleshooting

### "Missing catalog data file"
Run `npm run sync` to fetch all catalog data from Lightspeed.

### "Category not found"
Run `npm run sync` to update all category data.

### "Brand mismatch"
1. Check `data/brands.json` has latest Lightspeed data
2. Re-run `npm run sync` and `npm run import`

### "Types out of sync"
Re-run `npm run import` after product changes to extract latest types from database.

