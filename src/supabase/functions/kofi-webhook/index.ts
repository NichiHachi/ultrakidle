import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  try {
    const formData = await req.formData();
    const payload = JSON.parse(formData.get("data") as string);

    if (payload.verification_token !== Deno.env.get("KOFI_VERIFICATION_TOKEN")) {
      return new Response("Unauthorized", { status: 401 });
    }

    let displayName = payload.from_name;
    if (!displayName || displayName === "Ko-fi Supporter") {
      displayName = "Anonymous Supporter";
    }

    const hashedEmail = await hashEmail(payload.email);

    const boardExpiry = new Date();
    boardExpiry.setDate(boardExpiry.getDate() + 7);

    const { error } = await supabase.from("supporters").upsert(
      {
        kofi_transaction_id: payload.kofi_transaction_id,
        name: displayName,
        email_hash: hashedEmail,
        amount: parseFloat(payload.amount),
        currency: payload.currency,
        board_expiry: boardExpiry.toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: "kofi_transaction_id" },
    );

    if (error) throw error;

    return new Response("Success", { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
});
