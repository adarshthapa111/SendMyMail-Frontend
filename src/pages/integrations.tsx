/* The existing integrations screen is already built — re-use it.
   When the integrations feature gets its own task folder, this thin wrapper goes away
   and the real component lives here. */
import IntegrationsScreen from '../components/integrations/IntegrationsScreen';

export function Integrations() {
  return <IntegrationsScreen />;
}
