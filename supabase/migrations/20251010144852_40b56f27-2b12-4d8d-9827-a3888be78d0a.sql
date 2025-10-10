-- Create categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
ON public.categories
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create product_images table
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images"
ON public.product_images
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE id = product_images.product_id AND is_active = true
));

CREATE POLICY "Admins can manage product images"
ON public.product_images
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create product_variants table
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sku text NOT NULL UNIQUE,
  size text,
  color text,
  price numeric(10, 2) NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active product variants"
ON public.product_variants
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage product variants"
ON public.product_variants
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for categories updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for products updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for product_variants updated_at
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images' AND 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' AND 
  public.has_role(auth.uid(), 'admin')
);