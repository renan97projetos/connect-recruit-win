// Lovable AI Gateway proxy for the Jarvis HR analyst assistant.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Você é o Jarvis, analista de RH sênior da plataforma SinapseRH.
Você conhece os dados da empresa do usuário em tempo real (são fornecidos no contexto).
Fale de forma direta, profissional e proativa, como em uma reunião de briefing.
Nunca use markdown, asteriscos, emojis ou formatação especial. Apenas texto corrido.
Quando sugerir uma ação, seja específico: cite o candidato, a vaga ou a etapa.
Você NÃO executa ações no sistema — apenas sugere e o usuário decide.
Responda em português do Brasil. Seja conciso (máximo 4 parágrafos curtos).`;

interface Body {
  mode: 'report' | 'suggestions' | 'chat' | 'briefing' | 'insights';
  context: Record<string, unknown>;
  messages?: { role: 'user' | 'assistant'; content: string }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    const { mode, context, messages = [] } = body;

    let userPrompt = '';
    if (mode === 'report') {
      userPrompt = `Faça uma análise em 3 parágrafos curtos do estado atual do processo seletivo.
Aponte o que precisa de atenção. Não use listas, só texto corrido.

Contexto da empresa (JSON):
${JSON.stringify(context, null, 2)}`;
    } else if (mode === 'suggestions') {
      userPrompt = `Gere de 3 a 5 sugestões proativas e específicas com base nos dados.
Responda APENAS com JSON neste formato exato, sem nenhum texto antes ou depois:
{"suggestions":[{"title":"...","reason":"...","cta":"Ver vagas|Ver candidatos|Ver requisições|Ver propostas"}]}

Contexto (JSON):
${JSON.stringify(context, null, 2)}`;
    } else if (mode === 'briefing') {
      userPrompt = `Monte o briefing matinal para o gestor.
Responda APENAS com JSON neste formato exato, sem nenhum texto antes ou depois:
{"highlights":["...","...","..."],"agenda":["...","...","..."],"alert":"frase curta de urgência ou null"}
- highlights: 3 a 4 frases curtas sobre o dia anterior / situação atual
- agenda: 3 a 5 prioridades para hoje, específicas
- alert: uma frase de alerta se houver urgência real, senão exatamente null

Contexto (JSON):
${JSON.stringify(context, null, 2)}`;
    } else if (mode === 'insights') {
      userPrompt = `Gere exatamente 3 insights muito curtos (máximo 70 caracteres cada) sobre os dados.
Responda APENAS com JSON neste formato: {"insights":["...","...","..."]}

Contexto (JSON):
${JSON.stringify(context, null, 2)}`;
    } else {
      // chat
      const lastUser = messages[messages.length - 1]?.content ?? '';
      userPrompt = `Pergunta do usuário: ${lastUser}

Use o contexto da empresa abaixo para responder com precisão.
Contexto (JSON):
${JSON.stringify(context, null, 2)}`;
    }

    const chatMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(0, -1),
      { role: 'user', content: userPrompt },
    ];

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: chatMessages,
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Limite de uso temporário atingido. Tente novamente em instantes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Créditos de IA insuficientes. Adicione créditos ao workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error('AI gateway error', aiRes.status, t);
      return new Response(JSON.stringify({ error: 'Falha ao consultar a IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('jarvis-chat error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
