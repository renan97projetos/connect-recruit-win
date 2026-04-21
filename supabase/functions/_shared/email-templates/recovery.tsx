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
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefina sua senha no {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={h1}>Redefinir senha</Heading>
          <Text style={text}>
            Recebemos uma solicitação para redefinir sua senha no {siteName}.
            Clique no botão abaixo para escolher uma nova senha.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Redefinir Senha
          </Button>
          <Text style={footer}>
            Se você não solicitou a redefinição de senha, pode ignorar este
            email. Sua senha não será alterada.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"DM Sans", Arial, sans-serif',
  padding: '40px 20px',
}
const container = { maxWidth: '560px', margin: '0 auto' }
const card = {
  backgroundColor: '#FFFEF7',
  border: '2px solid #0D0D0D',
  borderRadius: '12px',
  boxShadow: '6px 6px 0 #0D0D0D',
  padding: '32px 28px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0D0D0D',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#404040',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#7C3AED',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  border: '2px solid #0D0D0D',
  borderRadius: '8px',
  padding: '14px 24px',
  textDecoration: 'none',
  boxShadow: '4px 4px 0 #0D0D0D',
  display: 'inline-block',
  margin: '8px 0 24px',
}
const footer = { fontSize: '12px', color: '#737373', margin: '24px 0 0' }
