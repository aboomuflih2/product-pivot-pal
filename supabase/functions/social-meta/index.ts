import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SITE_URL = "https://911clothings.com";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('id');

    console.log(`Social meta request for product: ${productId}`);

    if (!productId) {
      console.log('No product ID provided');
      return new Response(generateDefaultHtml(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch product data
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, title, description')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      console.log(`Product not found: ${productId}`, productError);
      return new Response(generateDefaultHtml(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Fetch product images
    const { data: images } = await supabase
      .from('product_images')
      .select('image_url, is_primary')
      .eq('product_id', productId)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true });

    // Fetch variants for price and variant images
    const { data: variants } = await supabase
      .from('product_variants')
      .select('price, image_url')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('price', { ascending: true });

    // Determine the best image to use
    let imageUrl = '';
    
    // Priority: variant image > primary product image > first product image
    if (variants && variants.length > 0 && variants[0].image_url) {
      imageUrl = variants[0].image_url;
    } else if (images && images.length > 0) {
      const primaryImage = images.find(img => img.is_primary);
      imageUrl = primaryImage ? primaryImage.image_url : images[0].image_url;
    }

    // Ensure absolute URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${imageUrl}`;
    }

    // Get price for description
    const price = variants && variants.length > 0 ? variants[0].price : null;
    const priceText = price ? ` - ₹${price}` : '';

    const title = product.title || '911 Clothings';
    const description = product.description 
      ? `${product.description.substring(0, 150)}${priceText}`
      : `Shop ${title} at 911 Clothings${priceText}`;
    const productUrl = `${SITE_URL}/product/${productId}`;

    console.log(`Generating OG tags - Title: ${title}, Image: ${imageUrl}`);

    const html = generateProductHtml({
      title,
      description,
      url: productUrl,
      imageUrl,
    });

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Error in social-meta function:', error);
    return new Response(generateDefaultHtml(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});

interface ProductMeta {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
}

function generateProductHtml({ title, description, url, imageUrl }: ProductMeta): string {
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle} | 911 Clothings</title>
  <meta name="description" content="${escapedDescription}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${escapedTitle}">
  <meta property="og:description" content="${escapedDescription}">
  <meta property="og:site_name" content="911 Clothings">
  ${imageUrl ? `
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapedTitle}">
  ` : ''}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${escapedTitle}">
  <meta name="twitter:description" content="${escapedDescription}">
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  
  <!-- WhatsApp specific -->
  <meta property="og:image:width" content="300">
  <meta property="og:image:height" content="300">
  
  <!-- Redirect to actual page -->
  <meta http-equiv="refresh" content="0;url=${url}">
</head>
<body>
  <p>Redirecting to <a href="${url}">${escapedTitle}</a>...</p>
</body>
</html>`;
}

function generateDefaultHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>911 Clothings - Premium Imported Clothing</title>
  <meta name="description" content="Shop premium imported clothing at 911 Clothings">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://911clothings.com">
  <meta property="og:title" content="911 Clothings">
  <meta property="og:description" content="Shop premium imported clothing at 911 Clothings">
  <meta property="og:site_name" content="911 Clothings">
  
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="911 Clothings">
  <meta name="twitter:description" content="Shop premium imported clothing at 911 Clothings">
  
  <meta http-equiv="refresh" content="0;url=https://911clothings.com">
</head>
<body>
  <p>Redirecting to <a href="https://911clothings.com">911 Clothings</a>...</p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
