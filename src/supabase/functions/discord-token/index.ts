import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, client_id, guild_id } = await req.json();

    let clientSecret = "";
    if (client_id === Deno.env.get("DISCORD_CLIENT_ID")) {
      clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET")!;
    } else if (client_id === Deno.env.get("DISCORD_CLIENT_ID_DEV")) {
      clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET_DEV")!;
    }

    if (!clientSecret) {
      throw new Error("Invalid or missing Client ID configuration");
    }

    // 1. Exchange Code for Discord Token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok)
      throw new Error(tokenData.error_description || "Token exchange failed");

    const launchedGuildId = guild_id || tokenData.guild_id || null;

    // 2. Get Discord User Data
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userResponse.json();

    // 3. Setup Supabase Clients
    // We use service_role to bypass RLS for administrative DB tasks
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // This second client is used exclusively for DB operations to ensure 
    // it keeps the service_role privileges even after auth operations
    const dbClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = `${discordUser.id}@discord.internal`;
    const password = `discord_${discordUser.id}_${Deno.env.get("USER_PASSWORD_SALT")}`;

    // 4. Authenticate / Create User
    let { data: authData, error: authError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (authError) {
      const { error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          discord_id: discordUser.id,
          full_name: discordUser.global_name || discordUser.username,
        },
      });

      if (signUpError) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users?.users?.find((u) => u.email === email);
        if (existing) {
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password,
          });
        } else {
          throw signUpError;
        }
      }

      const login = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });
      if (login.error) throw login.error;
      authData = login.data;
    }

    if (!authData?.user) throw new Error("Could not establish a user session");

    // 5. Update Profile and Guild Info in Parallel
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    const profilePromise = dbClient.from("profiles").upsert({
      id: authData.user.id,
      discord_name: discordUser.global_name || discordUser.username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });

        const guildPromise = (async () => {
      if (!launchedGuildId) return;

      let guildName: string | null = null;
      try {
        // Fetching guild name via Bot Token
        const guildRes = await fetch(
          `https://discord.com/api/v10/guilds/${launchedGuildId}`,
          {
            headers: {
              Authorization: `Bot ${Deno.env.get("DISCORD_BOT_TOKEN")}`,
            },
          }
        );

        if (guildRes.ok) {
          const guild = await guildRes.json();
          guildName = guild.name;
        } else {
          // Fallback if bot isn't in guild or token is invalid
          console.error(`Guild fetch failed: ${guildRes.status}`);
        }
      } catch (e) {
        console.error("Guild fetch error:", e);
      }

      await dbClient.from("guilds").upsert(
        { 
          guild_id: launchedGuildId, 
          name: guildName 
        },
        { onConflict: "guild_id" }
      );

      await dbClient.from("user_guilds").upsert({
        user_id: authData.user.id,
        guild_id: launchedGuildId,
        last_seen_at: new Date().toISOString(),
      });
    })();

    await Promise.all([profilePromise, guildPromise]);

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        supabase_session: authData.session,
        discord_user: discordUser,
        guild_id: launchedGuildId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error("discord-token error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
