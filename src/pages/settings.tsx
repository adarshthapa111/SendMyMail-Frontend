import { useParams } from 'react-router-dom';
import { Placeholder } from './_shared/Placeholder';

/* Settings is a single page with tabs (Profile · Notifications · Security · Agency · Sending domain).
   The active tab comes from /settings/:tab — see doc/architecture/routes.md.
   For the shell PR, just a placeholder that surfaces which tab the URL is asking for. */
export function Settings() {
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = tab ?? 'profile';
  return (
    <Placeholder
      title="Settings"
      subtitle={`Active tab: ${activeTab}`}
      mockup="settings.html"
    />
  );
}
