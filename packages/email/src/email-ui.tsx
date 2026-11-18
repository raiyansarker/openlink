import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export const colors = {
  background: "#f6f7f9",
  ink: "#111827",
  muted: "#667085",
  copy: "#344054",
  border: "#e4e7ec",
  accent: "#111827",
  accentSoft: "#f2f4f7",
  warning: "#b54708",
  warningSoft: "#fffaeb",
} as const;

const fontFamily = "Arial, Helvetica, sans-serif";

export function EmailLayout({
  preview,
  children,
  footer = "You received this message from OpenLink.",
}: {
  preview: string;
  children: ReactNode;
  footer?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Img
              src="https://openlink.example/logo192.png"
              alt=""
              width="28"
              height="28"
              style={styles.logo}
            />
            <Text style={styles.wordmark}>OpenLink</Text>
          </Section>
          {children}
          <Hr style={styles.rule} />
          <Text style={styles.footer}>{footer}</Text>
          <Text style={styles.footerLinks}>
            <Link href="https://openlink.example" style={styles.footerLink}>
              OpenLink
            </Link>
            {"  ·  "}
            <Link
              href="https://openlink.example/settings"
              style={styles.footerLink}
            >
              Account settings
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <Section>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Heading style={styles.heading}>{children}</Heading>
    </Section>
  );
}

export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} style={styles.button}>
      {children}
    </Link>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Section style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </Section>
  );
}

const styles = {
  body: {
    backgroundColor: colors.background,
    fontFamily,
    margin: "0",
    padding: "0",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "40px auto",
    maxWidth: "560px",
    padding: "0 40px 32px",
  },
  header: {
    borderBottom: `1px solid ${colors.border}`,
    padding: "24px 0 20px",
  },
  logo: {
    display: "inline-block",
    marginRight: "8px",
    verticalAlign: "middle",
  },
  wordmark: {
    color: colors.ink,
    display: "inline-block",
    fontSize: "17px",
    fontWeight: "700",
    letterSpacing: "-0.04em",
    margin: "0",
    verticalAlign: "middle",
  },
  eyebrow: {
    color: colors.muted,
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    margin: "32px 0 10px",
    textTransform: "uppercase" as const,
  },
  heading: {
    color: colors.ink,
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.035em",
    lineHeight: "1.2",
    margin: "0 0 24px",
  },
  text: {
    color: colors.copy,
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "16px 0",
  },
  mutedText: {
    color: colors.muted,
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "16px 0",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: "20px",
    margin: "8px 0 16px",
    padding: "12px 18px",
    textDecoration: "none",
  },
  detailRow: {
    backgroundColor: colors.accentSoft,
    borderBottom: `1px solid ${colors.border}`,
    padding: "12px 16px",
  },
  detailLabel: {
    color: colors.muted,
    display: "inline-block",
    fontSize: "13px",
    margin: "0",
    width: "34%",
  },
  detailValue: {
    color: colors.ink,
    display: "inline-block",
    fontSize: "13px",
    fontWeight: "700",
    margin: "0",
    width: "66%",
  },
  rule: {
    borderColor: colors.border,
    margin: "32px 0 16px",
  },
  footer: {
    color: colors.muted,
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0 0 8px",
  },
  footerLinks: {
    color: colors.muted,
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0",
  },
  footerLink: {
    color: colors.muted,
    textDecoration: "underline",
  },
} as const;

export const emailStyles = styles;
