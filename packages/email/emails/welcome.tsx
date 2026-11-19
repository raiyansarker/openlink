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
  baseUrl?: string;
  logoUrl?: string;
};

const defaultProps: WelcomeEmailProps = {
  name: "Alex",
  dashboardUrl: "https://openlink.example/dashboard",
  baseUrl: "https://openlink.example",
  logoUrl: "/logo192.png",
};

export function WelcomeEmail(props: WelcomeEmailProps = defaultProps) {
  const { name, dashboardUrl, baseUrl, logoUrl } = {
    ...defaultProps,
    ...props,
  };

  return (
    <EmailLayout
      baseUrl={baseUrl}
      logoUrl={logoUrl}
      preview="Welcome to OpenLink"
    >
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
