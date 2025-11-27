import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/product/ImageGallery";
import VariantSelector from "@/components/product/VariantSelector";
import StockStatus from "@/components/product/StockStatus";
import QuantitySelector from "@/components/product/QuantitySelector";
import SocialShare from "@/components/product/SocialShare";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Heart, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";

interface Product {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
}

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductVariant {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  image_url?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const ProductDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Fetch product data
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });

  // Fetch product images
  const { data: images = [], isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("display_order");

      if (error) throw error;
      return data as ProductImage[];
    },
    enabled: !!id,
  });

  // Fetch product variants
  const { data: variants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ["product-variants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", id)
        .eq("is_active", true);

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!id,
  });

  // Fetch category
  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", product?.category_id],
    queryFn: async () => {
      if (!product?.category_id) return null;
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", product.category_id)
        .single();

      if (error) throw error;
      return data as Category;
    },
    enabled: !!product?.category_id,
  });

  // Extract unique colors and sizes from variants
  const colors = Array.from(
    new Set(variants.map((v) => v.color).filter(Boolean))
  ).map((color) => ({
    id: color!,
    name: color!,
    hex: "#3B82F6", // Default color, could be enhanced with color mapping
  }));

  const sizes = Array.from(
    new Set(variants.map((v) => v.size).filter(Boolean))
  ).map((size) => ({
    id: size!,
    name: size!,
  }));

  // Initialize selected color and size
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      setSelectedColor(colors[0].id);
    }
    if (sizes.length > 0 && !selectedSize) {
      setSelectedSize(sizes[0].id);
    }
  }, [colors, sizes, selectedColor, selectedSize]);

  // Find current variant based on selected color and size
  const currentVariant = variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize
  );

  const currentPrice = currentVariant?.price || 0;
  const currentStock = currentVariant?.stock_quantity || 0;
  
  // Get image URLs - prioritize variant image if selected, then product images
  const imageUrls = currentVariant?.image_url 
    ? [currentVariant.image_url, ...images.map(img => img.image_url)]
    : images.map(img => img.image_url);

  // Reset quantity when variant changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedColor, selectedSize]);

  const handleColorChange = (colorId: string) => {
    setSelectedColor(colorId);
  };

  const handleSizeChange = (sizeId: string) => {
    setSelectedSize(sizeId);
  };

  const handleAddToCart = () => {
    if (currentStock === 0) return;
    if (!product || !currentVariant) {
      toast({
        title: "Unable to add",
        description: "Please select available options",
        variant: "destructive",
      });
      return;
    }

    addItem({
      id: currentVariant.id,
      name: product.title,
      price: currentPrice,
      image: primaryImage,
      maxQuantity: currentStock,
      variant: { color: selectedColor, size: selectedSize },
      quantity,
    });
  };

  if (productLoading || categoryLoading || variantsLoading || imagesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading product...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Product not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  const currentUrl = window.location.href;
  // Ensure image URL is absolute for social media sharing
  const primaryImage = imageUrls[0] 
    ? (imageUrls[0].startsWith('http') ? imageUrls[0] : `${window.location.origin}${imageUrls[0]}`)
    : `${window.location.origin}/placeholder.svg`;
  const productDescription = product.description || `${product.title} - Premium quality product from 911 Clothings`;

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{product.title} - 911 Clothings</title>
        <meta name="description" content={productDescription} />
        
        {/* Open Graph tags for Facebook, WhatsApp, LinkedIn */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={productDescription} />
        <meta property="og:url" content={currentUrl} />
        
        {/* Image tags - CRITICAL for WhatsApp */}
        <meta property="og:image" content={primaryImage} />
        <meta property="og:image:secure_url" content={primaryImage} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={product.title} />
        
        {/* Product-specific tags */}
        <meta property="og:price:amount" content={currentPrice.toString()} />
        <meta property="og:price:currency" content="INR" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.title} />
        <meta name="twitter:description" content={productDescription} />
        <meta name="twitter:image" content={primaryImage} />
        <meta name="twitter:image:alt" content={product.title} />
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-primary">
                Home
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Link to="/shop" className="text-muted-foreground hover:text-primary">
                Shop
              </Link>
              {category && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Link
                    to={`/category/${category.slug}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {category.name}
                  </Link>
                </>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{product.title}</span>
            </nav>
          </div>
        </div>

        {/* Product Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div>
              {imageUrls.length > 0 ? (
                <ImageGallery images={imageUrls} productName={product.title} />
              ) : (
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No image available</p>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Title & Category */}
              <div>
                {category && (
                  <Badge variant="secondary" className="mb-3">
                    {category.name}
                  </Badge>
                )}
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.title}</h1>
              </div>

              {/* Price & Stock */}
              <div className="flex items-center gap-4">
                <p className="text-3xl font-bold text-primary">₹{currentPrice.toLocaleString()}</p>
                <StockStatus stock={currentStock} />
              </div>

              <Separator />

              {/* Description */}
              {productDescription && (
                <>
                  <div>
                    <p className="text-muted-foreground leading-relaxed">
                      {productDescription}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Variant Selector */}
              {(colors.length > 0 || sizes.length > 0) && (
                <>
                  <VariantSelector
                    colors={colors}
                    sizes={sizes}
                    selectedColor={selectedColor}
                    selectedSize={selectedSize}
                    onColorChange={handleColorChange}
                    onSizeChange={handleSizeChange}
                  />
                  <Separator />
                </>
              )}

              {/* Quantity Selector */}
              <QuantitySelector
                quantity={quantity}
                maxQuantity={currentStock}
                onQuantityChange={setQuantity}
                disabled={currentStock === 0}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={currentStock === 0}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {currentStock === 0 ? "Out of Stock" : "Add to Cart"}
                </Button>
                <Button size="lg" variant="outline">
                  <Heart className="h-5 w-5" />
                </Button>
                <SocialShare
                  url={currentUrl}
                  title={product.title}
                  description={productDescription}
                  imageUrl={primaryImage}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
