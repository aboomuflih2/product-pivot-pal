import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data, error } = await supabaseClient
      .from('payment_settings')
      .select('upi_id, upi_qr_code_url, upi_number')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching payment settings:', error);
      // Fall through to return a safe empty payload
    }

    const payload = data ?? { upi_id: null, upi_qr_code_url: null, upi_number: null };

    return new Response(
      JSON.stringify(payload),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-payment-settings function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch payment settings';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
