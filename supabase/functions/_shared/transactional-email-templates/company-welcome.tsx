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

const SITE_NAME = 'Sinapse RH'
const CONTACT_URL = 'https://sinapserh.com.br/contact'

interface CompanyWelcomeProps {
  name?: string
}

const CompanyWelcomeEmail = ({ name }: CompanyWelcomeProps) => {
  const greeting = name ? `Olá, ${name}, tudo bem?` : 'Olá, tudo bem?'
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

            <Text style={text}>
              Se em qualquer momento você precisar de ajuda, tiver dúvidas ou
              quiser entender como extrair o máximo da plataforma, pode contar
              com a gente.
            </Text>

            <Text style={text}>
              É só clicar no botão abaixo que nosso time entra em contato com
              você:
            </Text>

            <Section style={buttonWrap}>
              <Button style={button} href={CONTACT_URL}>
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
  subject: 'Bem-vindo(a) à Sinapse RH! 🚀',
  displayName: 'Boas-vindas à empresa',
  previewData: { name: 'Maria' },
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
const buttonWrap = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#7C3AED',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  border: '2px solid #0D0D0D',
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  boxShadow: '4px 4px 0 #0D0D0D',
  display: 'inline-block',
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
