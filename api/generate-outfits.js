// api/generate-outfits.js
export default async function handler(req, res) {
  // Enable CORS so your Shopify storefront can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { festivalId, userPrompt } = req.body;

  // 1. Fetch festival DNA from Shopify
  const shopifyQuery = `
    query GetFestival($id: ID!) {
      metaobject(id: $id) {
        name: field(key: "name") { value }
        description: field(key: "description") { value }
        imageIds: field(key: "image_ids") { value }
      }
    }
  `;

  const shopifyRes = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({ query: shopifyQuery, variables: { id: festivalId } }),
    }
  );

  const { data } = await shopifyRes.json();
  const festival = data?.metaobject;

  // 2. Build enriched AI prompt
  const enrichedPrompt = `
    Festival: ${festival.name.value}
    Vibe: ${festival.description.value}
    Customer request: ${userPrompt}
    
    Generate a print-ready graphic design for a festival outfit item.
    Style: ${festival.name.value} rave culture aesthetic.
    Output: flat graphic, transparent background, high contrast, print-ready.
  `;

  // 3. Call OpenAI DALL-E 3 (generate 4 images)
  const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: enrichedPrompt,
      n: 4,
      size: '1024x1024',
    }),
  });

  const { data: images } = await openaiRes.json();

  // 4. Send each design to Printful Mockup Generator
  // (Simplified — you'd loop through images and call Printful API here)
  const mockups = images.map((img, i) => ({
    productId: `product-${i}`,
    mockupUrl: img.url, // In reality, this would be Printful's mockup URL
    price: 29.99,
    title: `Custom Outfit ${i + 1}`,
  }));

  // 5. Return mockups
  res.status(200).json({ mockups });
}
