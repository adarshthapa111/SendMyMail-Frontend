/* App root — delegates to the router.
   The previous `app.view` switching (editor vs integrations) has moved to the router:
     - editor:        /clients/:clientId/templates/:templateId/edit
     - integrations:  /integrations
   The `app.view` field in appSlice is now unused (kept for now; cleanup in a later PR). */
import { AppRouter } from './router';

export default function App() {
  return <AppRouter />;
}
