import { PublicPlaceholder } from '../_shared/PublicPlaceholder';

/* Auth chunk — all 6 pre-auth screens.
   See doc/architecture/auth-flow-and-schema.md for the flows these implement. */

export function Login() {
  return <PublicPlaceholder title="Welcome back" subtitle="Sign in to your agency workspace." mockup="login.html" />;
}

export function Signup() {
  return <PublicPlaceholder title="Start your agency, free" subtitle="14-day trial · no credit card." mockup="signup.html" />;
}

export function Verify() {
  return <PublicPlaceholder title="Check your inbox" subtitle="Enter the 6-digit code we just sent." mockup="verify.html" />;
}

export function Forgot() {
  return <PublicPlaceholder title="Reset your password" mockup="forgot.html" />;
}

export function Reset() {
  return <PublicPlaceholder title="Set a new password" mockup="reset.html" />;
}

export function Invite() {
  return <PublicPlaceholder title="Accept your invitation" subtitle="You've been invited to join an agency." mockup="invite.html" />;
}
