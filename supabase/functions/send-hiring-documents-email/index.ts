import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentsEmailRequest {
  applicationId: string;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId, candidateEmail, candidateName, jobTitle }: DocumentsEmailRequest = await req.json();

    console.log('Sending hiring documents email to:', candidateEmail);

    // Generate upload link
    const uploadUrl = `https://www.sinapserh.com.br/upload-documents/${applicationId}`;

    // Configure SMTP client for Gmail
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER!,
          password: GMAIL_APP_PASSWORD!,
        },
      },
    });

    // Send email using Gmail SMTP
    await client.send({
      from: GMAIL_USER!,
      to: candidateEmail,
      subject: `Documentos de Contratação - ${jobTitle}`,
      content: "auto",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, hsl(222.2 47.4% 11.2%) 0%, hsl(222.2 47.4% 20%) 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .button { display: inline-block; background: hsl(222.2 47.4% 11.2%); color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .documents-list { background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .documents-list h3 { margin-top: 0; color: #333; }
              .documents-list ul { margin: 10px 0; padding-left: 20px; }
              .documents-list li { margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🎉 Parabéns, ${candidateName}!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Você foi aprovado para a vaga de ${jobTitle}</p>
              </div>
              <div class="content">
                <p>Olá <strong>${candidateName}</strong>,</p>
                
                <p>É com grande satisfação que informamos que você foi aprovado para a vaga de <strong>${jobTitle}</strong>!</p>
                
                <p>Para dar continuidade ao processo de contratação, precisamos que você envie os seguintes documentos:</p>
                
                <div class="documents-list">
                  <h3>📋 Documentos Necessários:</h3>
                  <ul>
                    <li>RG (frente e verso)</li>
                    <li>CPF</li>
                    <li>Comprovante de Residência</li>
                    <li>Carteira de Trabalho (páginas principais)</li>
                    <li>Título de Eleitor</li>
                    <li>Certificado de Reservista (se aplicável)</li>
                    <li>Comprovante de Escolaridade</li>
                    <li>Certidão de Nascimento ou Casamento</li>
                    <li>Foto 3x4</li>
                  </ul>
                </div>
                
                <p style="text-align: center;">
                  <a href="${uploadUrl}" class="button">📤 Enviar Documentos</a>
                </p>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  <strong>Importante:</strong> Os documentos devem ser enviados em formato PDF, JPG ou PNG, com tamanho máximo de 10MB cada.
                </p>
                
                <p>Caso tenha alguma dúvida, entre em contato conosco.</p>
                
                <p style="margin-top: 30px;">
                  Atenciosamente,<br>
                  <strong>Equipe SinapseRH</strong>
                </p>
              </div>
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>© ${new Date().getFullYear()} SinapseRH. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    await client.close();

    console.log("Email sent successfully via Gmail SMTP");

    return new Response(
      JSON.stringify({ success: true, message: 'Email enviado com sucesso' }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-hiring-documents-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar email' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
