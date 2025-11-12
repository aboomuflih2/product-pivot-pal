import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const userAgent = request.headers.get("user-agent") || "";
  
  // Detect social media crawlers
  const isSocialCrawler = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Pinterest/i.test(userAgent);
  
  if (!isSocialCrawler) {
    // Regular user - return normal response
    return context.next();
  }
  
  // Social crawler detected - inject meta tags
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const productId = pathParts[pathParts.length - 1];
  
  if (!productId || productId === 'product') {
    return context.next();
  }
  
  try {
    // Fetch product data from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pwkiqyejijezteeurluf.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3a2lxeWVqaWplenRlZXVybHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzI5NDUsImV4cCI6MjA3NTYwODk0NX0.Cvh7nd86igAdTECVfssKtNvfjdJurhIian7HZsBxuSY';
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/products?id=eq.${productId}&select=*,product_images(image_url,is_primary,display_order),product_variants(price,image_url)`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );
    
    const data = await response.json();
    const product = data[0];
    
    if (!product) {
      return context.next();
    }
    
    // Get primary image
    const primaryImage = product.product_images?.find((img: any) => img.is_primary)?.image_url 
      || product.product_images?.[0]?.image_url 
      || 'https://lovable.dev/opengraph-image-p98pqg.png';
    
    const price = product.product_variants?.[0]?.price || 0;
    const description = product.description || product.title || '911 Clothings - Premium Kids Imported Clothing';
    
    // Generate HTML with proper meta tags for WhatsApp
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${product.title} - 911 Clothings</title>
          
          <!-- Essential Open Graph tags for WhatsApp -->
          <meta property="og:type" content="product" />
          <meta property="og:site_name" content="911 Clothings" />
          <meta property="og:title" content="${product.title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:url" content="${request.url}" />
          
          <!-- Image tags - CRITICAL for WhatsApp -->
          <meta property="og:image" content="${primaryImage}" />
          <meta property="og:image:secure_url" content="${primaryImage}" />
          <meta property="og:image:type" content="image/jpeg" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="${product.title}" />
          
          <!-- Product-specific tags -->
          <meta property="og:price:amount" content="${price}" />
          <meta property="og:price:currency" content="INR" />
          <meta property="product:availability" content="in stock" />
          <meta property="product:condition" content="new" />
          
          <!-- Twitter Card tags -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@911clothings" />
          <meta name="twitter:title" content="${product.title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${primaryImage}" />
          <meta name="twitter:image:alt" content="${product.title}" />
          
          <!-- Redirect to actual page after meta tags are read -->
          <meta http-equiv="refresh" content="0;url=${request.url}" />
        </head>
        <body>
          <h1>${product.title}</h1>
          <p>${description}</p>
          <p>Redirecting to product page...</p>
        </body>
      </html>
    `;
    
    return new Response(html, {
      headers: { 
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error('Error in social-meta edge function:', error);
    return context.next();
  }
};

export const config = {
  path: "/product/*"
};
