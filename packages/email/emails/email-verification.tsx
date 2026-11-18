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
};

const defaultProps: EmailVerificationEmailProps = {
  name: "Alex",
  verifyUrl: "https://openlink.example/verify/example-token",
  expiresIn: "24 hours",
};

export default function EmailVerificationEmail({
  name,
  verifyUrl,
  expiresIn,
}: EmailVerificationEmailProps = defaultProps) {
  return (
    <EmailLayout preview="Verify your OpenLink email address">
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
