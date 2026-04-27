/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração do seu email no {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={h1}>Confirme a alteração do email</Heading>
          <Text style={text}>
            Você solicitou a alteração do seu email no {siteName} de{' '}
            <Link href={`mailto:${email}`} style={link}>
              {email}
            </Link>{' '}
            para{' '}
            <Link href={`mailto:${newEmail}`} style={link}>
              {newEmail}
            </Link>
            .
          </Text>
          <Text style={text}>
            Clique no botão abaixo para confirmar esta alteração:
          </Text>
          <Button style={button} href={confirmationUrl}>
            Confirmar Alteração
          </Button>
          <Text style={footer}>
            Se você não solicitou esta alteração, proteja sua conta
            imediatamente.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '"DM Sans", Arial, sans-serif',
  padding: '40px 20px',
}
const container = { maxWidth: '560px', margin: '0 auto' }
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
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
const link = { color: '#7C3AED', textDecoration: 'underline' }
const button = {
  backgroundColor: '#7C3AED',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  border: 'none',
  borderRadius: '8px',
  padding: '14px 24px',
  textDecoration: 'none',
  boxShadow: 'none',
  display: 'inline-block',
  margin: '8px 0 24px',
}
const footer = { fontSize: '12px', color: '#737373', margin: '24px 0 0' }
