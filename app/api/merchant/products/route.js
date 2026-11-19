import connectDB from "@/config/db";
import { getSellerAccessState } from "@/lib/sellerBilling";
import { getSiteUrl } from "@/lib/siteUrl";
import Product from "@/models/Product";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const escapeXml = (value) => String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toFeedText = (value, maxLength) => String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const activeProductQuery = {
    $or: [
        { productStatus: "active" },
        { productStatus: { $exists: false } },
        { productStatus: "" },
        { productStatus: null },
    ],
};

const getAvailability = (stock) => (
    stock === null || stock === undefined || Number(stock) > 0 ? "in_stock" : "out_of_stock"
);

const toProductEntry = (product, siteUrl) => {
    const productId = String(product._id);
    const image = Array.isArray(product.image)
        ? product.image.find((entry) => typeof entry === "string" && entry.trim())
        : product.image;
    const price = Number(product.offerPrice) || Number(product.price);
    const title = toFeedText(product.name, 150);
    const description = toFeedText(product.description, 5000);

    if (!title || !description || !image || !Number.isFinite(price) || price <= 0) {
        return "";
    }

    const link = `${siteUrl}/product/${encodeURIComponent(productId)}`;
    const additionalImages = (Array.isArray(product.image) ? product.image : [])
        .filter((entry) => typeof entry === "string" && entry.trim() && entry !== image)
        .slice(0, 10)
        .map((entry) => `      <g:additional_image_link>${escapeXml(entry.trim())}</g:additional_image_link>`)
        .join("\n");

    return `    <item>
      <g:id>${escapeXml(productId)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(image.trim())}</g:image_link>
${additionalImages ? `${additionalImages}\n` : ""}      <g:availability>${getAvailability(product.stock)}</g:availability>
      <g:price>${price.toFixed(2)} UGX</g:price>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${escapeXml(toFeedText(product.category, 750))}</g:product_type>
    </item>`;
};

export async function GET() {
    try {
        await connectDB();
        const products = await Product.find(activeProductQuery)
            .select("_id userId name description price offerPrice stock image category")
            .lean();
        const sellerIds = [...new Set(products.map((product) => String(product.userId || "")).filter(Boolean))];
        const sellers = sellerIds.length
            ? await User.find({ _id: { $in: sellerIds } })
                .select("_id sellerSubscriptionStatus sellerAccessUntil")
                .lean()
            : [];
        const sellersById = new Map(sellers.map((seller) => [String(seller._id), seller]));
        const siteUrl = getSiteUrl().replace(/\/$/, "");
        const entries = products
            .filter((product) => {
                const seller = sellersById.get(String(product.userId));
                return !seller || getSellerAccessState(seller).hasAccess;
            })
            .map((product) => toProductEntry(product, siteUrl))
            .filter(Boolean)
            .join("\n");
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Wilwa products</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Approved products available on Wilwa.</description>
${entries}
  </channel>
</rss>`;

        return new Response(body, {
            headers: {
                "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
                "Content-Type": "application/xml; charset=utf-8",
            },
        });
    } catch (error) {
        console.error("Unable to generate Merchant Center product feed:", error);
        return new Response("Unable to generate product feed", { status: 503 });
    }
}
