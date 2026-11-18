import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type WelcomeEmailProps = {
  name: string;
  dashboardUrl: string;
};

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to OpenLink</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section>
            <Heading style={styles.heading}>Welcome to OpenLink</Heading>
            <Text style={styles.text}>Hi {name},</Text>
            <Text style={styles.text}>
              Your OpenLink workspace is ready. Create, manage, and share your
              links from one place.
            </Text>
            <Button href={dashboardUrl} style={styles.button}>
              Open your dashboard
            </Button>
          </Section>
          <Hr style={styles.rule} />
          <Text style={styles.footer}>
            You received this email because an OpenLink workspace was created
            for you.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f7f9",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "40px auto",
    padding: "40px",
    maxWidth: "560px",
  },
  heading: {
    color: "#111827",
    fontSize: "28px",
    fontWeight: "700",
    lineHeight: "1.2",
  },
  text: {
    color: "#374151",
    fontSize: "16px",
    lineHeight: "1.6",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "700",
    padding: "12px 20px",
    textDecoration: "none",
  },
  rule: {
    borderColor: "#e5e7eb",
    margin: "32px 0 16px",
  },
  footer: {
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: "1.5",
  },
} as const;

export default WelcomeEmail;
