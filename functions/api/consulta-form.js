// ============================================================
// InDeGrow — POST /api/consulta-form
// Recebe formulário de lead da landing page biofísica,
// envia notificação formatada para o Discord de João.
// ============================================================

// Webhook de fallback para testes — substitua pela URL real
// no env var DISCORD_WEBHOOK_URL do Cloudflare Pages.
const FALLBACK_WEBHOOK = 'https://webhook.site/placeholder-change-me';

/**
 * Formata os dados do formulário em um embed Discord legível.
 */
function buildDiscordPayload(data) {
  const nome = data.get('nome') || '(não informado)';
  const email = data.get('email') || '(não informado)';
  const telefone = data.get('telefone') || '(não informado)';
  const problema = data.get('problema') || '(não informado)';

  const timestamp = new Date().toISOString();

  return {
    username: 'Biofísica — Novo Lead',
    avatar_url: 'https://farmaciaintegrativa.xyz/foto-joao.jpg',
    embeds: [
      {
        title: '🩺 Novo Lead — Consulta Biofísica',
        color: 0xB5591A, // cobre/accent
        fields: [
          {
            name: '👤 Nome',
            value: nome,
            inline: true,
          },
          {
            name: '📧 E-mail',
            value: email,
            inline: true,
          },
          {
            name: '📞 Telefone',
            value: telefone,
            inline: true,
          },
          {
            name: '📋 Problema Principal',
            value: problema.length > 1024
              ? problema.substring(0, 1021) + '...'
              : problema,
            inline: false,
          },
        ],
        footer: {
          text: 'farmaciaintegrativa.xyz · Consulta Biofísica',
        },
        timestamp: timestamp,
      },
    ],
  };
}

/**
 * Valida se os campos obrigatórios estão presentes.
 */
function validateFields(data) {
  const required = ['nome', 'email', 'telefone', 'problema'];
  const missing = required.filter(function (field) {
    const val = data.get(field);
    return !val || val.trim() === '';
  });
  return missing;
}

/**
 * POST /api/consulta-form
 */
export async function onRequestPost({ request, env }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Parse body — aceita tanto x-www-form-urlencoded quanto JSON
  const contentType = request.headers.get('Content-Type') || '';
  let data;

  if (contentType.includes('application/json')) {
    try {
      const json = await request.json();
      data = new Map(Object.entries(json));
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    try {
      const text = await request.text();
      const params = new URLSearchParams(text);
      data = params;
    } catch {
      return new Response(
        JSON.stringify({ error: 'Body inválido' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Valida campos obrigatórios
  const missing = validateFields(data);
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: 'Campos obrigatórios: ' + missing.join(', '), missing: missing }),
      { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  // Constrói payload Discord
  const payload = buildDiscordPayload(data);

  // Obtém webhook URL: env var > fallback
  const webhookUrl = env.DISCORD_WEBHOOK_URL || FALLBACK_WEBHOOK;

  // Envia para o Discord (fire-and-forget com timeout curto)
  let discordOk = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, 5000);

    const discordResp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    discordOk = discordResp.ok;
  } catch (err) {
    // Falha no Discord não quebra a experiência do usuário
    console.error('Discord webhook error:', err.message);
  }

  // Retorna sucesso ao usuário
  return new Response(
    JSON.stringify({
      ok: true,
      discord_notified: discordOk,
      message: 'Recebemos sua solicitação! João entrará em contato em até 48 horas úteis.',
    }),
    {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * OPTIONS /api/consulta-form — CORS preflight
 */
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
