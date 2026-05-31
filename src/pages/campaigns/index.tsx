import { Placeholder } from '../_shared/Placeholder';

export function CampaignsList() {
  return <Placeholder title="Campaigns" subtitle="Sent + scheduled + drafts." mockup="campaigns_list.html" />;
}

export function CampaignNew() {
  return <Placeholder title="New campaign" subtitle="Step 1: name &amp; type." mockup="campaign_new.html" />;
}

export function CampaignAudience() {
  return <Placeholder title="Step 2 · audience" subtitle="Pick lists, segments, exclusions." mockup="campaign_step2.html" />;
}

export function CampaignContent() {
  return <Placeholder title="Step 3 · content" subtitle="Pick or build the email." mockup="campaign_step3.html" />;
}

export function CampaignSchedule() {
  return <Placeholder title="Step 4 · schedule" subtitle="Send now or pick a time." mockup="campaign_step4.html" />;
}

export function CampaignReview() {
  return <Placeholder title="Step 5 · review" subtitle="Final pre-flight checks." mockup="campaign_step5.html" />;
}

export function CampaignDone() {
  return <Placeholder title="Sent ✓" subtitle="Your campaign is on the way." mockup="campaign_step6.html" />;
}

export function CampaignReport() {
  return <Placeholder title="Campaign report" subtitle="Delivery, opens, clicks, revenue." mockup="campaign_report.html" />;
}
