import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  zone_id: string;
  zone_name: string;
  amount_kz: number;
  phone_number: string;
  method: 'multicaixa_express' | 'referencia' | 'cartao';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { zone_id, zone_name, amount_kz, phone_number, method } = body;

    // Validate request
    if (!zone_id || !amount_kz || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: zone_id, amount_kz, phone_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number to +244 format
    let normalizedPhone = phone_number.replace(/\s+/g, '').replace(/-/g, '');
    if (!normalizedPhone.startsWith('+244')) {
      if (normalizedPhone.startsWith('244')) {
        normalizedPhone = '+' + normalizedPhone;
      } else if (normalizedPhone.startsWith('9')) {
        normalizedPhone = '+244' + normalizedPhone;
      }
    }

    // Generate payment reference (simulated Multicaixa Express)
    const paymentRef = `MCX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    console.log(`[Multicaixa Express] Processing payment for zone ${zone_id}`);
    console.log(`[Multicaixa Express] Amount: ${amount_kz} KZ, Phone: ${normalizedPhone}`);
    console.log(`[Multicaixa Express] Payment Reference: ${paymentRef}`);

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        zone_id,
        amount_kz,
        method,
        status: 'processing',
        payment_ref: paymentRef,
        phone_number: normalizedPhone,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('[Multicaixa Express] Transaction error:', transactionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction', details: transactionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PLACEHOLDER: Multicaixa Express API Integration
    // In production, this would call the real Multicaixa Express API
    // POST https://api.multicaixaexpress.co.ao/v1/payments
    // {
    //   "merchant_id": "YOUR_MERCHANT_ID",
    //   "amount": amount_kz,
    //   "currency": "AOA",
    //   "phone": normalizedPhone,
    //   "reference": paymentRef,
    //   "description": `Subscrição Zona ${zone_name}`
    // }
    
    // Simulate payment processing (in production, wait for webhook callback)
    const paymentSuccess = true; // Simulated success

    if (paymentSuccess) {
      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      // Calculate expiry date (90 days = trimestral)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);

      // Create subscription
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          zone_id,
          amount_kz,
          expiry_date: expiryDate.toISOString(),
          payment_ref: paymentRef,
          transaction_id: transaction.id,
          status: 'active',
        })
        .select()
        .single();

      if (subscriptionError) {
        console.error('[Multicaixa Express] Subscription error:', subscriptionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create subscription', details: subscriptionError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Multicaixa Express] Payment successful! Subscription created until ${expiryDate.toISOString()}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pagamento processado com sucesso!',
          data: {
            transaction_id: transaction.id,
            subscription_id: subscription.id,
            payment_ref: paymentRef,
            expiry_date: expiryDate.toISOString(),
            amount_kz,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update transaction as failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Pagamento falhou. Por favor, tente novamente.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Multicaixa Express] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
