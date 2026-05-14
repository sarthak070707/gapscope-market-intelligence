import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webSearch, readPage, generateStructuredResponse } from '@/lib/zai';
import type { ScannedProduct } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, period = 'monthly' } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Create a scan job to track progress
    const scanJob = await db.scanJob.create({
      data: {
        status: 'running',
        category,
      },
    });

    try {
      // Step 1: Search for Product Hunt launches in the category
      const searchQuery1 = `site:producthunt.com ${category} launched 2025`;
      const searchQuery2 = `product hunt ${category} tools 2025`;

      const [searchResult1, searchResult2] = await Promise.all([
        webSearch(searchQuery1, 10).catch(() => []),
        webSearch(searchQuery2, 10).catch(() => []),
      ]);

      // webSearch returns an array directly
      const allResults = [
        ...(Array.isArray(searchResult1) ? searchResult1 : []),
        ...(Array.isArray(searchResult2) ? searchResult2 : []),
      ];

      // Deduplicate by URL
      const seenUrls = new Set<string>();
      const uniqueResults = allResults.filter((r: Record<string, unknown>) => {
        const url = (r.url as string) || (r.link as string) || '';
        if (!url || seenUrls.has(url)) return false;
        seenUrls.add(url);
        return true;
      });

      // Filter for Product Hunt URLs
      const phUrls = uniqueResults
        .map((r: Record<string, unknown>) => (r.url as string) || (r.link as string) || '')
        .filter((url: string) => url.includes('producthunt.com'))
        .slice(0, 5); // Limit to top 5 pages to avoid rate limiting

      // Step 2: Read top Product Hunt pages
      const pageContents: { url: string; content: string }[] = [];
      for (const url of phUrls) {
        try {
          const pageData = await readPage(url);
          // readPage returns { data: { title, html, ... } }
          const html = pageData?.data?.html || '';
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (text) {
            pageContents.push({ url, content: text.slice(0, 5000) });
          }
        } catch {
          // Skip pages that fail to read
        }
      }

      // If no PH pages found, use search snippets
      const rawContent =
        pageContents.length > 0
          ? pageContents
              .map((p) => `URL: ${p.url}\nContent: ${p.content}`)
              .join('\n\n---\n\n')
          : uniqueResults
              .map(
                (r: Record<string, unknown>) =>
                  `Title: ${r.name || r.title || ''}\nURL: ${r.url || ''}\nSnippet: ${r.snippet || ''}`
              )
              .join('\n\n');

      if (!rawContent.trim()) {
        await db.scanJob.update({
          where: { id: scanJob.id },
          data: {
            status: 'completed',
            resultCount: 0,
            errors: JSON.stringify(['No search results found']),
          },
        });
        return NextResponse.json([]);
      }

      // Step 3: Use LLM to parse raw content into structured product data
      const products = await generateStructuredResponse<ScannedProduct[]>(
        `You are a Product Hunt product data extractor. Extract all products mentioned in the given content. 
For each product, provide:
- name: Product name
- tagline: Short tagline/slogan (max 100 chars)
- description: Brief description of what the product does (max 300 chars)
- url: Product website URL if available, otherwise the Product Hunt URL
- category: "${category}"
- upvotes: Number of upvotes if mentioned, otherwise estimate based on context (0-500)
- launchDate: Launch date if mentioned, otherwise "2025"
- features: Array of key feature strings (3-5 features)
- pricing: Pricing model (Free, Freemium, Paid, Unknown)
- comments: Array of comment/review summary strings (max 5)
- reviewScore: Review score 0-10 if available, otherwise estimate
- sourceUrl: The Product Hunt URL where this product was found

Only include real products that are clearly described. Do not fabricate products.
If you cannot find any products, return an empty array.`,
        `Extract Product Hunt products from this content:\n\n${rawContent}`,
        `Return a JSON array of objects with fields: name, tagline, description, url, category, upvotes (number), launchDate, features (string[]), pricing, comments (string[]), reviewScore (number), sourceUrl`
      );

      const safeProducts = Array.isArray(products) ? products : [];

      // Step 4: Save scanned products to the database
      const savedProducts: ScannedProduct[] = [];
      for (const product of safeProducts) {
        try {
          // Check if product already exists (by name + category)
          const existing = await db.product.findFirst({
            where: {
              name: product.name,
              category: product.category || category,
            },
          });

          if (existing) {
            const updated = await db.product.update({
              where: { id: existing.id },
              data: {
                tagline: product.tagline || existing.tagline,
                description: product.description || existing.description,
                url: product.url || existing.url,
                upvotes: product.upvotes || existing.upvotes,
                launchDate: product.launchDate || existing.launchDate,
                features: JSON.stringify(product.features || []),
                pricing: product.pricing || existing.pricing,
                comments: JSON.stringify(product.comments || []),
                reviewScore: product.reviewScore || existing.reviewScore,
                sourceUrl: product.sourceUrl || existing.sourceUrl,
              },
            });
            savedProducts.push({
              ...product,
              id: updated.id,
            });
          } else {
            const created = await db.product.create({
              data: {
                name: product.name,
                tagline: product.tagline || '',
                description: product.description || '',
                url: product.url || '',
                category: product.category || category,
                upvotes: product.upvotes || 0,
                launchDate: product.launchDate || '2025',
                features: JSON.stringify(product.features || []),
                pricing: product.pricing || 'Unknown',
                comments: JSON.stringify(product.comments || []),
                reviewScore: product.reviewScore || 0,
                sourceUrl: product.sourceUrl || '',
              },
            });
            savedProducts.push({
              ...product,
              id: created.id,
            });
          }
        } catch (err) {
          console.error(`Failed to save product ${product.name}:`, err);
        }
      }

      // Update scan job as completed
      await db.scanJob.update({
        where: { id: scanJob.id },
        data: {
          status: 'completed',
          resultCount: savedProducts.length,
        },
      });

      return NextResponse.json(savedProducts);
    } catch (innerError) {
      // Update scan job as failed
      await db.scanJob.update({
        where: { id: scanJob.id },
        data: {
          status: 'failed',
          errors: JSON.stringify([
            innerError instanceof Error ? innerError.message : 'Unknown error',
          ]),
        },
      });
      throw innerError;
    }
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      {
        error: 'Failed to scan products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
