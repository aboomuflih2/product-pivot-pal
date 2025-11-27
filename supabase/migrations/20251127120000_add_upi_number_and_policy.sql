-- Add upi_number to payment_settings
ALTER TABLE public.payment_settings
ADD COLUMN IF NOT EXISTS upi_number text;

-- Allow public SELECT access to payment_settings for checkout
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_settings'
      AND policyname = 'Anyone can view payment settings'
  ) THEN
    CREATE POLICY "Anyone can view payment settings"
    ON public.payment_settings
    FOR SELECT
    USING (true);
  END IF;
END$$;

-- Create a public storage bucket for admin-managed payment assets (QR codes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-assets', 'payment-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin to manage payment assets
DO $$
BEGIN
  -- Admins can insert to payment-assets
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'objects'
      AND policyname = 'Admins can insert payment assets'
  ) THEN
    CREATE POLICY "Admins can insert payment assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'payment-assets' AND public.has_role(auth.uid(), 'admin')
    );
  END IF;

  -- Admins can update payment-assets
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'objects'
      AND policyname = 'Admins can update payment assets'
  ) THEN
    CREATE POLICY "Admins can update payment assets"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'payment-assets' AND public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
      bucket_id = 'payment-assets' AND public.has_role(auth.uid(), 'admin')
    );
  END IF;

  -- Admins can delete payment-assets
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete payment assets'
  ) THEN
    CREATE POLICY "Admins can delete payment assets"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'payment-assets' AND public.has_role(auth.uid(), 'admin')
    );
  END IF;

  -- Anyone can view payment-assets (bucket is public)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'objects'
      AND policyname = 'Anyone can view payment assets'
  ) THEN
    CREATE POLICY "Anyone can view payment assets"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'payment-assets'
    );
  END IF;
END$$;

