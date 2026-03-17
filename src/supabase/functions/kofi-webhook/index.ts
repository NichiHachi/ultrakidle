import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  try {
    const formData = await req.formData();
    const payload = JSON.parse(formData.get("data") as string);

    if (payload.verification_token !== Deno.env.get("KOFI_VERIFICATION_TOKEN")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const isSub = payload.is_subscription_payment === true;
    // Set expiry to 31 days from now if it's a sub, otherwise null
    const expiryDate = isSub
      ? new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase.from("supporters").upsert(
      {
        kofi_transaction_id: payload.kofi_transaction_id,
        kofi_id: payload.email, // Using email as a unique identifier for the member
        name: payload.from_name,
        email: payload.email,
        amount: parseFloat(payload.amount),
        currency: payload.currency,
        is_subscription: isSub,
        subscription_expiry: expiryDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "kofi_id" }, // Updates the record if the email already exists
    );

    if (error) throw error;

    return new Response("Success", { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
});
