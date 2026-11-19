import { Text } from "@react-email/components";
import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  emailStyles,
  DetailRow,
  DetailTable,
} from "../src/email-ui";

/** To the person who sent an invite, once it is accepted. */
export type MemberJoinedEmailProps = {
  /** The inviter. */
  recipientName?: string;
  memberName: string;
  workspaceName: string;
  role: string;
  /** Opens the workspace, which then becomes the active one. */
  workspaceUrl: string;
  baseUrl?: string;
  logoUrl?: string;
};

const defaultProps: MemberJoinedEmailProps = {
  recipientName: "Maya",
  memberName: "Alex Rivera",
  workspaceName: "Northstar Studio",
  role: "Member",
  workspaceUrl: "https://openlink.example/w/northstar",
  baseUrl: "https://openlink.example",
  logoUrl: "/logo192.png",
};

export default function MemberJoinedEmail(
  props: MemberJoinedEmailProps = defaultProps,
) {
  const {
    recipientName,
    memberName,
    workspaceName,
    role,
    workspaceUrl,
    baseUrl,
    logoUrl,
  } = Object.keys(props).length === 0 ? defaultProps : props;

  return (
    <EmailLayout
      baseUrl={baseUrl}
      logoUrl={logoUrl}
      preview={`${memberName} joined ${workspaceName}`}
    >
      <EmailHeading eyebrow="Invitation accepted">
        {memberName} joined {workspaceName}
      </EmailHeading>
      <Text style={emailStyles.text}>
        Hi{recipientName ? ` ${recipientName}` : " there"},
      </Text>
      <Text style={emailStyles.text}>
        {memberName} accepted your invitation and can now work in{" "}
        {workspaceName}.
      </Text>
      <DetailTable>
        <DetailRow label="Member" value={memberName} />
        <DetailRow label="Workspace" value={workspaceName} />
        <DetailRow label="Role" value={role} />
      </DetailTable>
      <EmailButton href={workspaceUrl}>Open {workspaceName}</EmailButton>
      <Text style={emailStyles.mutedText}>
        You’re getting this because you sent the invitation.
      </Text>
    </EmailLayout>
  );
}
