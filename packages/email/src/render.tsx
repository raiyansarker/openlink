import { render } from "@react-email/render";
import type { ReactElement } from "react";
import EmailVerificationEmail, {
  type EmailVerificationEmailProps,
} from "../emails/email-verification";
import PasswordResetEmail, {
  type PasswordResetEmailProps,
} from "../emails/password-reset";
import SecurityAlertEmail, {
  type SecurityAlertEmailProps,
} from "../emails/security-alert";
import { WelcomeEmail, type WelcomeEmailProps } from "../emails/welcome";
import WorkspaceInviteEmail, {
  type WorkspaceInviteEmailProps,
} from "../emails/workspace-invite";

/** Every email the backend can send. `props` are exactly the template's props. */
export type EmailMessage =
  | { template: "welcome"; props: WelcomeEmailProps }
  | { template: "workspace-invite"; props: WorkspaceInviteEmailProps }
  | { template: "email-verification"; props: EmailVerificationEmailProps }
  | { template: "password-reset"; props: PasswordResetEmailProps }
  | { template: "security-alert"; props: SecurityAlertEmailProps };

export type EmailTemplateName = EmailMessage["template"];

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function subjectFor(message: EmailMessage): string {
  switch (message.template) {
    case "welcome":
      return "Welcome to OpenLink";
    case "workspace-invite":
      return `${message.props.inviterName} invited you to ${message.props.workspaceName} on OpenLink`;
    case "email-verification":
      return "Verify your email address";
    case "password-reset":
      return "Reset your OpenLink password";
    case "security-alert":
      return `Security alert: ${message.props.event}`;
  }
}

function elementFor(message: EmailMessage): ReactElement {
  switch (message.template) {
    case "welcome":
      return <WelcomeEmail {...message.props} />;
    case "workspace-invite":
      return <WorkspaceInviteEmail {...message.props} />;
    case "email-verification":
      return <EmailVerificationEmail {...message.props} />;
    case "password-reset":
      return <PasswordResetEmail {...message.props} />;
    case "security-alert":
      return <SecurityAlertEmail {...message.props} />;
  }
}

/** Render a message to the subject, HTML and plain-text parts a provider needs. */
export async function renderEmail(message: EmailMessage): Promise<RenderedEmail> {
  const element = elementFor(message);
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { subject: subjectFor(message), html, text };
}
