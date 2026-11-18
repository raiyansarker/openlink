import { Section, Text } from "@react-email/components";
import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  emailStyles,
  DetailRow,
  colors,
} from "../src/email-ui";

export type SecurityAlertEmailProps = {
  name: string;
  event: string;
  device: string;
  location: string;
  occurredAt: string;
  securityUrl: string;
  baseUrl?: string;
  logoUrl?: string;
};

const defaultProps: SecurityAlertEmailProps = {
  name: "Alex",
  event: "New sign-in from a new device",
  device: "Safari on macOS",
  location: "San Francisco, United States",
  occurredAt: "December 5, 2026 at 10:42 AM PST",
  securityUrl: "https://openlink.example/settings/devices",
  baseUrl: "https://openlink.example",
  logoUrl: "/logo192.png",
};

export default function SecurityAlertEmail(
  props: SecurityAlertEmailProps = defaultProps,
) {
  const {
    name,
    event,
    device,
    location,
    occurredAt,
    securityUrl,
    baseUrl,
    logoUrl,
  } = { ...defaultProps, ...props };

  return (
    <EmailLayout
      baseUrl={baseUrl}
      logoUrl={logoUrl}
      preview={`New security activity on your OpenLink account`}
      footer="If you didn’t do this, secure your account immediately."
    >
      <EmailHeading eyebrow="Account security">
        New sign-in activity
      </EmailHeading>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>
        We noticed new activity on your OpenLink account. Review the details
        below.
      </Text>
      <Section
        style={{
          backgroundColor: colors.warningSoft,
          border: `1px solid #fedf89`,
          borderRadius: "6px",
          margin: "24px 0",
          padding: "16px",
        }}
      >
        <Text
          style={{
            color: colors.warning,
            fontSize: "14px",
            fontWeight: "700",
            margin: "0",
          }}
        >
          {event}
        </Text>
      </Section>
      <Section style={{ margin: "24px 0" }}>
        <DetailRow label="Device" value={device} />
        <DetailRow label="Location" value={location} />
        <DetailRow label="Time" value={occurredAt} />
      </Section>
      <EmailButton href={securityUrl}>Review account security</EmailButton>
      <Text style={emailStyles.mutedText}>
        You can review active sessions and passkeys from your OpenLink account
        settings.
      </Text>
    </EmailLayout>
  );
}
