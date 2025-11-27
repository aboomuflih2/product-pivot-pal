## Overview
- Implement an Admin page to manage UPI payment settings (UPI ID, UPI number, QR code upload) and expose them in Checkout when UPI is selected.
- Fix the edge function error and ensure Checkout loads payment details reliably.
- Keep COD flow working: orders created and user is redirected with success.

## Root Cause
- The edge function `get-payment-settings` returns non-2xx when the `payment_settings` table has no row or when service role is not available, causing `FunctionsHttpError` at `src/pages/Checkout.tsx:85-95`.
- RLS migration removed public SELECT access on `payment_settings` (`supabase/migrations/20251010165712_...sql`), so only admins can access it, forcing the edge function to use the service role. If the service role secret isn’t set, the function fails.
- `payment_settings` schema doesn’t include `upi_number` yet (types show `upi_id` and `upi_qr_code_url`).

## Database Changes
1. Add `upi_number` to `payment_settings`:
   - Migration: `ALTER TABLE public.payment_settings ADD COLUMN upi_number text;`
   - Update TypeScript types in `src/integrations/supabase/types.ts` to include `upi_number`.
2. RLS policy adjustments (choose one):
   - Option A (recommended): Allow SELECT to all (or authenticated users) so Checkout can read without service role:
     - `CREATE POLICY "Anyone can view payment settings" ON public.payment_settings FOR SELECT USING (true);`
   - Option B: Keep admin-only RLS and set service role secret for the edge function:
     - Configure `SUPABASE_SERVICE_ROLE_KEY` secret for edge functions via Supabase (
       CLI: `supabase functions secrets set SUPABASE_SERVICE_ROLE_KEY="..."`).

## Edge Function Changes
- File: `supabase/functions/get-payment-settings/index.ts`
- Changes:
  - Return `upi_id`, `upi_qr_code_url`, and `upi_number`.
  - Stop requiring user authentication for read (if Option A is chosen). Use anon client (or simply server role but don’t gate on auth).
  - Gracefully handle empty table: return `{ upi_id: null, upi_qr_code_url: null, upi_number: null }` with 200 instead of 400.
  - Keep CORS headers.

## Admin UI Implementation
- New page: `src/pages/admin/PaymentSettings.tsx` wrapped in `AdminRoute`.
- Features:
  - Form fields: `UPI ID` (text), `UPI Number` (text), `QR Code` uploader.
  - Fetch existing settings: `supabase.from('payment_settings').select('*').limit(1).maybeSingle()`.
  - Upload QR to a public storage bucket (create `payment-assets` bucket, public=true) and set `upi_qr_code_url`.
  - Upsert settings: insert if none, update if exists.
  - Show success/error toasts.
- Add route: `/admin/payment-settings` in `src/App.tsx`.
- Add nav link in `src/components/admin/AdminNav.tsx` (e.g., "Payment Settings").

## Checkout Integration
- File: `src/pages/Checkout.tsx`
- Changes:
  - `loadUPIDetails`: expects `{ upi_id, upi_qr_code_url, upi_number }`. Handle non-2xx by setting a user-friendly fallback (e.g., “UPI details not configured”).
  - Step 3 display:
    - Show QR if `upi_qr_code_url` exists.
    - Otherwise fallback to showing both `upi_id` and `upi_number` prominently.
  - Keep COD behavior: when `paymentMethod === 'cod'`, order placed, cart cleared, toast shown, redirect to orders.

## Navigation & Routes
- Route registration in `src/App.tsx` for `/admin/payment-settings`.
- AdminNav entry pointing to the new page.

## Security & RLS
- Admin edits are protected by `AdminRoute` and existing `user_roles` policies.
- If allowing public SELECT for checkout, this only exposes `upi_id`, `upi_number`, `upi_qr_code_url` — acceptable business exposure.
- If not exposing publicly, ensure edge function uses service role and no user gate.

## Verification
1. Admin:
   - Open `/admin/payment-settings`, save UPI ID/number, upload QR.
   - Confirm row exists in `payment_settings` and QR URL resolves publicly.
2. Checkout:
   - With a logged-in user, select UPI payment and proceed to Step 3.
   - QR or UPI text appears; upload payment proof succeeds.
   - Select COD; order placed and redirected; order visible in account.
3. Console:
   - No `FunctionsHttpError` from `get-payment-settings`.

## Contingencies
- If Supabase custom domain (`VITE_SUPABASE_URL`) causes function routing issues, switch to the project’s `*.supabase.co` URL or configure reverse proxy to forward `/functions/v1/*` correctly.
- If service role access is required and unavailable, temporarily re-add a SELECT policy for `payment_settings` until secrets are set.
