// GET /api/daily — returns today's daily card name
// POST /api/daily — sets today's daily card (requires ADMIN_SECRET)
//
// Requires a KV namespace bound as DAILY_KV
// Requires an environment variable ADMIN_SECRET

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const cardName = await env.DAILY_KV.get(`daily:${today}`);

    if (!cardName) {
      return Response.json(
        { ok: false, error: "No daily card set for today" },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, date: today, cardName });
  } catch (err) {
    return Response.json(
      { ok: false, error: "Failed to fetch daily card" },
      { status: 500 }
    );
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

  // Verify admin secret
  const body = await request.json().catch(() => ({}));
  const { secret, cardName, date } = body;

  if (!secret || secret !== env.ADMIN_SECRET) {
    return Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!cardName || typeof cardName !== "string" || cardName.trim().length === 0) {
    return Response.json(
      { ok: false, error: "cardName is required" },
      { status: 400 }
    );
  }

  try {
    // Use provided date or default to today
    const targetDate = date || new Date().toISOString().split("T")[0];
    await env.DAILY_KV.put(`daily:${targetDate}`, cardName.trim(), {
      // Auto-expire after 7 days so old entries clean themselves up
      expirationTtl: 60 * 60 * 24 * 7,
    });

    return Response.json({ ok: true, date: targetDate, cardName: cardName.trim() });
  } catch (err) {
    return Response.json(
      { ok: false, error: "Failed to save daily card" },
      { status: 500 }
    );
  }
}