/**
 * AI-powered semantic search with Vercel AI SDK + pgvector
 * 
 * Features:
 * - Pure vector similarity search
 * - AI-generated conversational advice messages
 * 
 * @see lib/catalog-metadata.ts for dynamic catalog data
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { embed, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { getCatalogSummary, getCategoryName } from '../lib/catalog-metadata';

// Vercel serverless config
export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};

// Constants
const SIMILARITY_THRESHOLD = 0.32;   // Single threshold for all queries
const POPULAR_SALES_THRESHOLD = 50;  // Products with 50+ sales are popular (top 5%)
const SCARCE_STOCK_THRESHOLD = 5;    // Products with stock <= 5 are scarce
const MAX_RESULTS = 50;

/**
 * Generate AI-powered conversational advice for search results
 */
async function generateAdviceMessage(query: string, total: number): Promise<string> {
  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        advice: z.string().describe('Friendly, enthusiastic advice message in Dutch about the search results')
      }),
      prompt: `Create a warm, personal message about these search results:
Query: "${query}"
Results found: ${total}

${getCatalogSummary()}

Guidelines:
- Be conversational and enthusiastic (like a helpful shop assistant!)
- Use 2-4 sentences
- Use a relevant emoji (🎨, ✨, 🎁, 💎, 🌟, 💫)
- Mention what makes these products special
- For 1 result: "perfect match!"
- For 2-10: emphasize quality selection
- For 11-30: mention variety
- For 31+: encourage browsing to find favorite
- NEVER ask for more details if results are found

Examples:
- "✨ Wat fijn dat je zoekt naar een kat beeld! Ik heb 8 prachtige beelden voor je gevonden. Van speels tot elegant, er zit vast iets bij dat perfect past bij jouw smaak!"
- "🎨 Super! Er zijn 23 sportbeelden die aan je wensen voldoen. Van dynamische atleten tot klassieke sporters - neem rustig de tijd om je favoriet uit te kiezen!"
- "💎 Wow, 1 perfect beeld met een voetballer gevonden! Dit is echt een prachtig sportbeeld dat precies past bij wat je zoekt."

Now create an advice message for this search.`,
    });
    
    return object.advice;
  } catch (error: any) {
    console.error('generateAdviceMessage error:', error);
    // Fallback to simple message
    if (total === 1) {
      return '✨ Er is 1 perfect product voor je gevonden!';
    } else if (total <= 10) {
      return `🎨 Ik heb ${total} mooie producten voor je gevonden!`;
    } else {
      return `✨ Ik heb ${total} producten gevonden! Bekijk ze allemaal en vind jouw favoriet.`;
    }
  }
}

/**
 * Generate AI-powered helpful message for queries with no results
 */
async function generateEmptyStateMessage(query: string): Promise<string> {
  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        advice: z.string().describe('Friendly, helpful message in Dutch to guide the user to search better')
      }),
      prompt: `The user searched for: "${query}"
This query returned 0 results.

${getCatalogSummary()}

Create a warm, enthusiastic, positive message that:
- Starts with a cheerful emoji (✨, 🎨, 💫, 🎁, 🌟)
- Be VERY positive and encouraging (no negative words!)
- Briefly acknowledge what they're looking for
- Ask 1-2 clarifying questions about type, theme, or budget
- Give 2-3 concrete search examples using REAL types and themes from our catalog
- Keep it upbeat and helpful (3-4 sentences max)
- End on an encouraging note!

CRITICAL for search examples:
- Use natural Dutch: "kat beeld onder 50 euro" (NOT "kat onderwerp beeld")
- Always include budget in euros: "onder X euro", "max X euro"
- Use simple combinations: [dier/thema] + [type] + [budget]
- GOOD: "bloemen vaas max 80 euro", "sportbeeld onder 150 euro", "Van Gogh mok"
- BAD: "liefde onderwerp vaas", "bloemen thema", "abstract ding"

Examples:
"✨ Wat leuk dat je een cadeau zoekt! We hebben zoveel mooie kunstcadeaus! Zoek je een beeld, schilderij, vaas of mok? En welk thema past erbij - dieren, sport, bloemen of een beroemde kunstenaar? Probeer bijvoorbeeld: 'kat beeld onder 50 euro', 'bloemenvaas max 80 euro' of 'Van Gogh mok onder 30 euro'!"

"🎨 Super! We hebben prachtige kunstcadeaus in alle prijsklassen! Vertel me wat meer: zoek je iets voor een speciale gelegenheid zoals een huwelijk, jubileum of geslaagd? Of heb je een bepaald budget? Probeer bijvoorbeeld: 'huwelijksbeeld onder 100 euro', 'sportbeeld max 150 euro' of 'Klimt onderzetters'!"

Now create a message for: "${query}"`,
    });
    
    return object.advice;
  } catch (error: any) {
    console.error('generateEmptyStateMessage error:', error);
    return '✨ Wat leuk dat je hier bent! Laten we samen het perfecte kunstcadeau vinden. Vertel me wat meer: zoek je een beeld, schilderij, vaas of mok? Probeer bijvoorbeeld: "kat beeld onder 50 euro", "sportbeeld max 100 euro", of "bloemen vaas onder 80 euro".';
  }
}

/**
 * Format database row into clean product object for API response
 */
function formatProduct(row: any) {
  const categoryIds = row.category_ids || [];
  const categories = categoryIds.map((id: number) => ({
    id,
    name: getCategoryName(id)
  }));
  
  const stockSold = row.stock_sold ? parseInt(row.stock_sold) : 0;
  const stock = row.stock ? parseInt(row.stock) : null;
  const isPopular = stockSold >= POPULAR_SALES_THRESHOLD;
  const isScarce = stock !== null && stock > 0 && stock <= SCARCE_STOCK_THRESHOLD;
  
  return {
    id: row.id,
    title: row.title,
    fullTitle: row.full_title,
    description: row.description,
    url: row.url,
    price: parseFloat(row.price),
    oldPrice: row.old_price ? parseFloat(row.old_price) : null,
    onSale: row.old_price && parseFloat(row.old_price) > parseFloat(row.price),
    discount: row.old_price 
      ? Math.round((1 - parseFloat(row.price) / parseFloat(row.old_price)) * 100) 
      : 0,
    image: row.image,
    type: row.type,
    artist: row.artist || null,
    dimensions: row.dimensions || null,
    stock,
    stockSold,
    isPopular,
    isScarce,
    categories,
    similarity: row.similarity ? parseFloat(row.similarity) : null
  };
}

/**
 * Main search handler
 * POST /api/search with body: { query: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Query required' 
      });
    }

    const start = Date.now();

    // Step 1: Generate embedding for the query
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: query
    });

    // Step 2: Pure vector search query
    const queryText = `
      SELECT 
        p.id, p.title, p.full_title, p.description, p.url, p.price, p.old_price, p.image, p.type, p.artist, p.dimensions, p.stock, p.stock_sold,
        1 - (p.embedding <=> $1::vector) as similarity,
        ARRAY_AGG(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL) as category_ids
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      WHERE p.is_visible = true 
        AND p.embedding IS NOT NULL
        AND (1 - (p.embedding <=> $1::vector)) >= ${SIMILARITY_THRESHOLD}
      GROUP BY p.id, p.title, p.full_title, p.description, p.url, p.price, p.old_price, p.image, p.type, p.artist, p.dimensions, p.stock, p.embedding, p.stock_sold
      ORDER BY p.embedding <=> $1::vector, p.stock_sold DESC NULLS LAST
      LIMIT ${MAX_RESULTS}
    `;

    const result = await sql.query(queryText, [JSON.stringify(embedding)]);

    // Step 3: Generate advice message
    const total = result.rows.length;
    const advice = total === 0 
      ? await generateEmptyStateMessage(query)
      : await generateAdviceMessage(query, total);

    // Step 4: Format and return response
    const response = {
      success: true,
      needsMoreInfo: false,
      query: {
        original: query,
        took_ms: Date.now() - start
      },
      results: {
        total: result.rows.length,
        showing: result.rows.length,
        items: result.rows.map(formatProduct),
        advice,
        discountCode: null
      }
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('[Search Error]', error);
    
    return res.status(500).json({
      success: false,
      error: 'Search failed',
      details: error.message
    });
  }
}
