import { PublicPlaceholder } from '../_shared/PublicPlaceholder';

/* Setup chunk — workspace_setup + onboarding.
   Both render outside the main AppShell (their own layouts per the mockups). */

export function WorkspaceSetup() {
  return (
    <PublicPlaceholder
      title="Tell us about your agency"
      subtitle="Name, country, billing email — about a minute."
      mockup="workspace_setup.html"
    />
  );
}

export function Onboarding() {
  return (
    <PublicPlaceholder
      title="Your first week"
      subtitle="Four small steps to your first real campaign."
      mockup="onboarding.html"
    />
  );
}
