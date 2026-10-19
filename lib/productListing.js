const LEAKED_TITLE_TEXT = /\bshare\s+this\s+product\b/gi;

export const MAX_PRODUCT_TITLE_LENGTH = 80;
export const MAX_UNVERIFIED_DISCOUNT_PERCENT = 70;

export function sanitizeProductTitle(value) {
  return String(value || "")
    .replace(LEAKED_TITLE_TEXT, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PRODUCT_TITLE_LENGTH);
}

export function getDisplayDiscountPercent(product = {}) {
  const price = Number(product.price);
  const offerPrice = Number(product.offerPrice);
  if (!Number.isFinite(price) || !Number.isFinite(offerPrice) || price <= offerPrice || offerPrice < 0) return null;

  const percent = Math.round(((price - offerPrice) / price) * 100);
  return percent > 0 && percent <= MAX_UNVERIFIED_DISCOUNT_PERCENT ? percent : null;
}
