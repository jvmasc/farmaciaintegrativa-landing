// ============================================================
// InDeGrow — POST /api/consulta-form
// Recebe formulário de lead e notifica Discord
// ============================================================

export async function onRequestPost({ request, env }) {
  // Parse form data
  let nome = '', email = '', telefone = '', problema = '';
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    nome = params.get('nome') || '';
    email = params.get('email') || '';
    telefone = params.get('telefone') || '';
    problema = params.get('problema') || '';
  } catch (e) {
    return new Response(JSON.stringify({ error: 'body invalido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Validate
  if (!nome || !email || !telefone || !problema) {
    return new Response(JSON.stringify({ error: 'campos obrigatorios' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Try Discord webhook
  const webhookUrl = env.DISCORD_WEBHOOK_URL || '';
  let discordSent = false;

  if (webhookUrl) {
    try {
      const payload = {
        content: `🩺 **Novo Lead — Consulta Biofísica**\n👤 Nome: ${nome}\n📧 Email: ${email}\n📞 Telefone: ${telefone}\n📋 Problema: ${problema.substring(0, 500)}`
      };
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      discordSent = resp.ok;
    } catch (e) {
      console.error('Discord error:', e.message);
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    discord_notified: discordSent,
    message: 'Recebemos sua solicitação! João entrará em contato em até 48 horas úteis.'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
