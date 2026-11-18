import SecurityAlertEmail from "./security-alert";

export default function DemoSecurityAlertEmail() {
  return (
    <SecurityAlertEmail
      name="Alex"
      event="New sign-in from a new device"
      device="Safari on macOS"
      location="San Francisco, United States"
      occurredAt="December 5, 2026 at 10:42 AM PST"
      securityUrl="https://openlink.example/settings/devices"
      logoUrl="/logo192.png"
    />
  );
}
