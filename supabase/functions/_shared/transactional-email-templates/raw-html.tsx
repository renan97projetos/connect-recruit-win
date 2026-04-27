/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'

interface RawHtmlEmailProps {
  html?: string
}

// Template "raw-html": permite enviar e-mails com HTML pronto.
// Usado pelas edge functions internas (notificações de candidatura, status, etc).
// O HTML é injetado via dangerouslySetInnerHTML — só deve ser chamado server-side
// com HTML construído internamente (nunca a partir de input do usuário).
const RawHtmlEmail = ({ html = '' }: RawHtmlEmailProps) => (
  React.createElement('div', {
    dangerouslySetInnerHTML: { __html: html },
  })
)

export const template = {
  component: RawHtmlEmail,
  subject: (data: Record<string, any>) => data.subject || 'Notificação SinapseRH',
  displayName: 'HTML personalizado (interno)',
  previewData: {
    subject: 'Assunto do email',
    html: '<h1>Olá!</h1><p>Este é um email de exemplo.</p>',
  },
} satisfies TemplateEntry
