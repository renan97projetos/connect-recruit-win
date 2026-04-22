/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SinapseRH'
const CONTACT_URL = 'https://sinapserh.com.br/contact'
const COMPANY_LOGIN_URL = 'https://sinapserh.com.br/empresa/acesso'

interface CompanyWelcomeProps {
  name?: string
  companyName?: string
  cnpj?: string
  email?: string
  loginUrl?: string
}

const CompanyWelcomeEmail = ({
  name,
  companyName,
  cnpj,
  email,
  loginUrl,
}: CompanyWelcomeProps) => {
  const greeting = name ? `Olá, ${name}, tudo bem?` : 'Olá, tudo bem?'
  const accessUrl = loginUrl || COMPANY_LOGIN_URL
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Bem-vindo(a) à {SITE_NAME}! Sua conta está pronta.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <Heading style={h1}>Bem-vindo(a) à {SITE_NAME}! 🚀</Heading>

            <Text style={text}>{greeting}</Text>

            <Text style={text}>
              Aqui é o <strong>Lucas</strong>, responsável pela área comercial
              da {SITE_NAME}.
            </Text>

            <Text style={text}>
              Quero te dar as boas-vindas e agradecer pela confiança em escolher
              a nossa plataforma para apoiar o seu processo de recrutamento e
              seleção.
            </Text>

            <Text style={text}>
              A partir de agora, você já pode começar a utilizar o sistema e
              aproveitar todos os recursos do seu plano. Nosso objetivo é te
              ajudar a ganhar <strong>velocidade</strong>,{' '}
              <strong>organização</strong> e <strong>eficiência</strong> nas
              suas contratações.
            </Text>

            {(companyName || cnpj || email) && (
              <Section style={dataBox}>
                <Text style={dataTitle}>📋 Dados do seu cadastro</Text>
                {companyName && (
                  <Text style={dataLine}>
                    <strong>Empresa:</strong> {companyName}
                  </Text>
                )}
                {cnpj && (
                  <Text style={dataLine}>
                    <strong>CNPJ:</strong> {cnpj}
                  </Text>
                )}
                {email && (
                  <Text style={dataLine}>
                    <strong>E-mail de acesso:</strong> {email}
                  </Text>
                )}
              </Section>
            )}

            <Text style={text}>
              Para acessar o sistema, use o link exclusivo abaixo (este é o
              endereço oficial de acesso da sua empresa):
            </Text>

            <Section style={buttonWrap}>
              <Button style={button} href={accessUrl}>
                🔐 Acessar o sistema
              </Button>
            </Section>

            <Text style={urlNote}>
              Ou copie e cole no navegador:
              <br />
              <span style={urlText}>{accessUrl}</span>
            </Text>

            <Hr style={hr} />

            <Text style={text}>
              Se em qualquer momento você precisar de ajuda, tiver dúvidas ou
              quiser entender como extrair o máximo da plataforma, pode contar
              com a gente.
            </Text>

            <Section style={buttonWrap}>
              <Button style={secondaryButton} href={CONTACT_URL}>
                👉 Falar com nosso time
              </Button>
            </Section>

            <Text style={text}>
              Estamos à disposição para te apoiar no que for necessário.
            </Text>

            <Text style={text}>
              <strong>Conte com a gente</strong> 🚀
            </Text>

            <Hr style={hr} />

            <Text style={signature}>
              <strong>Lucas</strong>
              <br />
              CRO – {SITE_NAME}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CompanyWelcomeEmail,
  subject: 'Bem-vindo(a) à SinapseRH! 🚀 Seus dados de acesso',
  displayName: 'Boas-vindas à empresa',
  previewData: {
    name: 'Maria',
    companyName: 'Acme Ltda',
    cnpj: '12.345.678/0001-90',
    email: 'contato@acme.com.br',
    loginUrl: 'https://sinapserh.com.br/empresa/acesso',
  },
} satisfies TemplateEntry

export default CompanyWelcomeEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"DM Sans", Arial, sans-serif',
  padding: '40px 20px',
}
const container = { maxWidth: '580px', margin: '0 auto' }
const card = {
  backgroundColor: '#FFFEF7',
  border: '2px solid #0D0D0D',
  borderRadius: '12px',
  boxShadow: '6px 6px 0 #0D0D0D',
  padding: '36px 32px',
}
const h1 = {
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: '#0D0D0D',
  margin: '0 0 24px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: '#404040',
  lineHeight: '1.65',
  margin: '0 0 16px',
}
const dataBox = {
  backgroundColor: '#FFFFFF',
  border: '2px solid #0D0D0D',
  borderRadius: '8px',
  padding: '18px 20px',
  margin: '20px 0 24px',
  boxShadow: '3px 3px 0 #0D0D0D',
}
const dataTitle = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: '#0D0D0D',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const dataLine = {
  fontSize: '14px',
  color: '#0D0D0D',
  lineHeight: '1.6',
  margin: '0 0 6px',
}
const buttonWrap = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#7C3AED',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  border: '2px solid #0D0D0D',
  borderRadius: '8px',
  padding: '16px 32px',
  textDecoration: 'none',
  boxShadow: '4px 4px 0 #0D0D0D',
  display: 'inline-block',
}
const secondaryButton = {
  backgroundColor: '#FFFEF7',
  color: '#0D0D0D',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  border: '2px solid #0D0D0D',
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  boxShadow: '4px 4px 0 #0D0D0D',
  display: 'inline-block',
}
const urlNote = {
  fontSize: '12px',
  color: '#737373',
  lineHeight: '1.5',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
const urlText = {
  fontSize: '12px',
  color: '#7C3AED',
  fontWeight: 'bold' as const,
  wordBreak: 'break-all' as const,
}
const hr = {
  border: 'none',
  borderTop: '1px solid #E5E5E5',
  margin: '28px 0 20px',
}
const signature = {
  fontSize: '14px',
  color: '#0D0D0D',
  lineHeight: '1.6',
  margin: '0',
}
