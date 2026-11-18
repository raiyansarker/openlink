import { Text } from "@react-email/components";
import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  emailStyles,
} from "../src/email-ui";

export type WelcomeEmailProps = {
  name: string;
  dashboardUrl: string;
  logoUrl?: string;
};

const defaultProps: WelcomeEmailProps = {
  name: "Alex",
  dashboardUrl: "https://openlink.example/dashboard",
  logoUrl: "/logo192.png",
};

export function WelcomeEmail({
  name,
  dashboardUrl,
  logoUrl,
}: WelcomeEmailProps = defaultProps) {
  return (
    <EmailLayout logoUrl={logoUrl} preview="Welcome to OpenLink">
      <EmailHeading eyebrow="Welcome to OpenLink">
        Your workspace is ready
      </EmailHeading>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>
        Create, manage, and share short links from one focused workspace. Your
        dashboard is ready when you are.
      </Text>
      <EmailButton href={dashboardUrl}>Open your dashboard</EmailButton>
    </EmailLayout>
  );
}

export default WelcomeEmail;
