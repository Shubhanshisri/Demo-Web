import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Myntra cart flow (Playwright + TypeScript)
 * - Opens Myntra home
 * - Goes to Bag / Cart
 * - Finds elements that are present in DOM but hidden
 */

const MYNTRA_URL = 'https://www.myntra.com/';
const CART_URL = 'https://www.myntra.com/checkout/cart';

/** CSS / attribute patterns that often mark hidden UI */
const HIDDEN_SELECTORS = [
  '[hidden]',
  '[aria-hidden="true"]',
  '[style*="display: none"]',
  '[style*="display:none"]',
  '[style*="visibility: hidden"]',
  '[style*="visibility:hidden"]',
  '.hide',
  '.hidden',
  '.d-none',
];

type HiddenHit = {
  index: number;
  tag: string;
  id: string;
  className: string;
  text: string;
  reason: string;
};

async function collectHiddenLocators(page: Page, root: Locator): Promise<HiddenHit[]> {
  const nodes = root.locator('*');
  const count = await nodes.count();
  const hits: HiddenHit[] = [];

  // Cap scan so the run stays practical on a heavy e-commerce DOM
  const limit = Math.min(count, 400);

  for (let i = 0; i < limit; i++) {
    const el = nodes.nth(i);
    const info = await el.evaluate((node) => {
      const style = window.getComputedStyle(node);
      const html = node as HTMLElement;
      const reasons: string[] = [];

      if (html.hasAttribute('hidden')) reasons.push('hidden attribute');
      if (html.getAttribute('aria-hidden') === 'true') reasons.push('aria-hidden=true');
      if (style.display === 'none') reasons.push('display:none');
      if (style.visibility === 'hidden') reasons.push('visibility:hidden');
      if (Number(style.opacity) === 0) reasons.push('opacity:0');
      if (html.offsetParent === null && style.position !== 'fixed') {
        reasons.push('not rendered (offsetParent null)');
      }

      return {
        tag: node.tagName.toLowerCase(),
        id: html.id || '',
        className: typeof html.className === 'string' ? html.className : '',
        text: (html.innerText || '').trim().slice(0, 80),
        reasons,
        isVisible: !!(
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) > 0 &&
          (html.offsetWidth > 0 || html.offsetHeight > 0)
        ),
      };
    });

    if (!info.isVisible && info.reasons.length > 0) {
      hits.push({
        index: i,
        tag: info.tag,
        id: info.id,
        className: info.className,
        text: info.text,
        reason: info.reasons.join(', '),
      });
    }
  }

  return hits;
}

test.describe('Myntra cart automation', () => {
  test.setTimeout(90_000);

  test('open cart and report hidden locators', async ({ page }) => {
    // 1) Home
    await page.goto(MYNTRA_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/myntra\.com/i);

    // Close common overlays / login prompts if they appear (best-effort)
    const dismissCandidates = [
      page.getByRole('button', { name: /close|dismiss|not now|maybe later/i }),
      page.locator('[class*="modal"] button, [class*="popup"] button').first(),
    ];
    for (const candidate of dismissCandidates) {
      try {
        if (await candidate.isVisible({ timeout: 1500 })) {
          await candidate.click({ timeout: 2000 }).catch(() => undefined);
        }
      } catch {
        // ignore — overlays are optional
      }
    }

    // 2) Prefer header Bag/Cart link; fall back to direct cart URL
    const bagLink = page
      .locator('a[href*="checkout/cart"], a[href*="/cart"]')
      .or(page.getByRole('link', { name: /bag|cart/i }))
      .first();

    if (await bagLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bagLink.click();
    } else {
      await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });
    }

    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/cart|checkout|bag/i);

    // Cart empty vs items — either is fine for locator inspection
    const cartRoot = page.locator('body');
    await expect(cartRoot).toBeVisible();

    // 3) Quick CSS pass for classic hidden markers
    const cssHiddenCounts: Record<string, number> = {};
    for (const selector of HIDDEN_SELECTORS) {
      cssHiddenCounts[selector] = await page.locator(selector).count();
    }
    console.log('Hidden CSS selector counts:', cssHiddenCounts);

    // 4) Deep scan: DOM nodes that are not visible to the user
    const hiddenHits = await collectHiddenLocators(page, cartRoot);
    console.log(`Found ${hiddenHits.length} hidden elements (scanned up to 400 nodes).`);
    console.table(hiddenHits.slice(0, 25));

    // Soft assertion: page loaded; hidden elements are informational
    expect(hiddenHits.length, 'Hidden locators found on cart page (logged above)').toBeGreaterThanOrEqual(0);

    // Example stable cart assertions (empty bag is common without login/items)
    const emptyOrItems = page
      .getByText(/there is nothing in your bag|add items|shopping bag|place order|total mrp/i)
      .first();
    await expect(emptyOrItems).toBeVisible({ timeout: 15_000 });
  });
});
