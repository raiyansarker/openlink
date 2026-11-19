import { Section, Text } from "@react-email/components";
import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  emailStyles,
  DetailRow,
} from "../src/email-ui";

export type WorkspaceInviteEmailProps = {
  recipientName?: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
  baseUrl?: string;
  logoUrl?: string;
};

const defaultProps: WorkspaceInviteEmailProps = {
  recipientName: "Alex",
  workspaceName: "Northstar Studio",
  inviterName: "Maya Chen",
  role: "Member",
  inviteUrl: "https://openlink.example/invites/example-token",
  expiresAt: "December 12, 2026",
  baseUrl: "https://openlink.example",
  logoUrl: "/logo192.png",
};

export default function WorkspaceInviteEmail(
  props: WorkspaceInviteEmailProps = defaultProps,
) {
  const {
    recipientName,
    workspaceName,
    inviterName,
    role,
    inviteUrl,
    expiresAt,
    baseUrl,
    logoUrl,
  } = Object.keys(props).length === 0 ? defaultProps : props;

  return (
    <EmailLayout
      baseUrl={baseUrl}
      logoUrl={logoUrl}
      preview={`${inviterName} invited you to ${workspaceName}`}
    >
      <EmailHeading eyebrow="Workspace invitation">
        Join {workspaceName}
      </EmailHeading>
      <Text style={emailStyles.text}>
        Hi{recipientName ? ` ${recipientName}` : " there"},
      </Text>
      <Text style={emailStyles.text}>
        {inviterName} invited you to collaborate in OpenLink. You’ll be able to
        create and manage short links with the rest of the workspace.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <DetailRow label="Workspace" value={workspaceName} />
        <DetailRow label="Invited by" value={inviterName} />
        <DetailRow label="Your role" value={role} />
        <DetailRow label="Expires" value={expiresAt} />
      </Section>
      <EmailButton href={inviteUrl}>Accept invitation</EmailButton>
      <Text style={emailStyles.mutedText}>
        If the button doesn’t work, copy this link into your browser:{" "}
        {inviteUrl}
      </Text>
    </EmailLayout>
  );
}
