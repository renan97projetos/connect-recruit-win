// Edge function: proxy to BrasilAPI for CNPJ lookup (avoids browser CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let cnpj = url.searchParams.get('cnpj') || '';

    if (!cnpj && (req.method === 'POST')) {
      try {
        const body = await req.json();
        cnpj = body?.cnpj || '';
      } catch (_) {}
    }

    const digits = (cnpj || '').replace(/\D/g, '');
    if (digits.length !== 14) {
      return new Response(JSON.stringify({ error: 'CNPJ inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { 'Accept': 'application/json' },
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('lookup-cnpj error', err);
    return new Response(JSON.stringify({ error: 'Erro ao consultar CNPJ' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
