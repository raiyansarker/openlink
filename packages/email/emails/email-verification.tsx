import { Text } from "@react-email/components";
import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  emailStyles,
} from "../src/email-ui";

export type EmailVerificationEmailProps = {
  name: string;
  verifyUrl: string;
  expiresIn: string;
  baseUrl?: string;
  logoUrl?: string;
};

const defaultProps: EmailVerificationEmailProps = {
  name: "Alex",
  verifyUrl: "https://openlink.example/verify/example-token",
  expiresIn: "24 hours",
  baseUrl: "https://openlink.example",
  logoUrl: "/logo192.png",
};

export default function EmailVerificationEmail(
  props: EmailVerificationEmailProps = defaultProps,
) {
  const { name, verifyUrl, expiresIn, baseUrl, logoUrl } = {
    ...defaultProps,
    ...props,
  };

  return (
    <EmailLayout
      baseUrl={baseUrl}
      logoUrl={logoUrl}
      preview="Verify your OpenLink email address"
    >
      <EmailHeading eyebrow="Account setup">Verify your email</EmailHeading>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>
        Confirm this email address to finish setting up your OpenLink account
        and keep your workspace secure.
      </Text>
      <EmailButton href={verifyUrl}>Verify email address</EmailButton>
      <Text style={emailStyles.mutedText}>
        This link expires in {expiresIn}. If you didn’t create an OpenLink
        account, you can safely ignore this message.
      </Text>
    </EmailLayout>
  );
}
