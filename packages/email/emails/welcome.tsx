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
};

const defaultProps: WelcomeEmailProps = {
  name: "Alex",
  dashboardUrl: "https://openlink.example/dashboard",
};

export function WelcomeEmail({
  name,
  dashboardUrl,
}: WelcomeEmailProps = defaultProps) {
  return (
    <EmailLayout preview="Welcome to OpenLink">
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
