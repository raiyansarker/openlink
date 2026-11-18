import WorkspaceInviteEmail from "./workspace-invite";

export default function DemoWorkspaceInviteEmail() {
  return (
    <WorkspaceInviteEmail
      recipientName="Alex"
      workspaceName="Northstar Studio"
      inviterName="Maya Chen"
      role="Member"
      inviteUrl="https://openlink.example/invites/northstar-demo"
      expiresAt="December 12, 2026"
      logoUrl="/logo192.png"
    />
  );
}
