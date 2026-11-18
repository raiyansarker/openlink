import { Text } from "@react-email/components";
import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  emailStyles,
} from "../src/email-ui";

export type PasswordResetEmailProps = {
  name: string;
  resetUrl: string;
  expiresIn: string;
  logoUrl?: string;
};

const defaultProps: PasswordResetEmailProps = {
  name: "Alex",
  resetUrl: "https://openlink.example/reset/example-token",
  expiresIn: "1 hour",
  logoUrl: "/logo192.png",
};

export default function PasswordResetEmail({
  name,
  resetUrl,
  expiresIn,
  logoUrl,
}: PasswordResetEmailProps = defaultProps) {
  return (
    <EmailLayout logoUrl={logoUrl} preview="Reset your OpenLink password">
      <EmailHeading eyebrow="Account security">
        Reset your password
      </EmailHeading>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>
        We received a request to reset the password for your OpenLink account.
      </Text>
      <EmailButton href={resetUrl}>Choose a new password</EmailButton>
      <Text style={emailStyles.mutedText}>
        This link expires in {expiresIn}. If you didn’t request a password
        reset, no changes were made to your account.
      </Text>
    </EmailLayout>
  );
}
