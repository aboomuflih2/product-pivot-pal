-- RPC: place_order
CREATE OR REPLACE FUNCTION public.place_order(
  items jsonb,
  shipping_address_id uuid,
  payment_method text
)
RETURNS TABLE(order_id uuid, order_number text, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  total numeric := 0;
  item RECORD;
  pv RECORD;
  ord RECORD;
BEGIN
  SELECT auth.uid() INTO uid;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF items IS NULL OR jsonb_array_length(items) = 0 THEN
    RAISE EXCEPTION 'No items in order';
  END IF;

  -- Validate and compute total
  FOR item IN
    SELECT
      (elem->>'variantId')::text AS variant_id,
      (elem->>'quantity')::int AS quantity,
      elem->>'color' AS color,
      elem->>'size' AS size
    FROM jsonb_array_elements(items) AS elem
  LOOP
    SELECT pv1.id, pv1.price, pv1.product_id, pv1.stock_quantity
    INTO pv
    FROM public.product_variants pv1
    WHERE pv1.id::text = item.variant_id AND pv1.is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid product variant: %', item.variant_id;
    END IF;

    IF pv.stock_quantity < item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for variant %', item.variant_id;
    END IF;

    total := total + (pv.price * item.quantity);
  END LOOP;

  -- Create order
  SELECT public.generate_order_number() INTO order_number;

  INSERT INTO public.orders (
    user_id, total_amount, shipping_address_id,
    payment_method, payment_status, status, order_number
  ) VALUES (
    uid, total, shipping_address_id,
    payment_method, 'pending', 'pending', order_number
  ) RETURNING * INTO ord;

  order_id := ord.id;
  total_amount := ord.total_amount;

  -- Insert items and update stock
  FOR item IN
    SELECT
      (elem->>'variantId')::text AS variant_id,
      (elem->>'quantity')::int AS quantity,
      elem->>'color' AS color,
      elem->>'size' AS size
    FROM jsonb_array_elements(items) AS elem
  LOOP
    DECLARE pr RECORD; img RECORD; BEGIN
      SELECT pv1.id, pv1.price, pv1.product_id INTO pv FROM public.product_variants pv1 WHERE pv1.id::text = item.variant_id;
      SELECT p.title INTO pr FROM public.products p WHERE p.id = pv.product_id;
      SELECT i.image_url INTO img FROM public.product_images i WHERE i.product_id = pv.product_id AND i.is_primary = true;

      INSERT INTO public.order_items (
        order_id, product_name, quantity, unit_price, total_price,
        product_image, variant_color, variant_size
      ) VALUES (
        order_id, pr.title, item.quantity, pv.price, pv.price * item.quantity,
        COALESCE(img.image_url, NULL), item.color, item.size
      );

      UPDATE public.product_variants
      SET stock_quantity = stock_quantity - item.quantity
      WHERE id::text = item.variant_id;
    END;
  END LOOP;
  -- Return created order details
  RETURN QUERY SELECT ord.id AS order_id, order_number AS order_number, ord.total_amount AS total_amount;
END;
$$;
