import { useAppSelector } from './store/hooks';
import EditorShell from './components/EditorShell';
import IntegrationsScreen from './components/integrations/IntegrationsScreen';

export default function App() {
  const view = useAppSelector((s) => s.app.view);
  return view === 'integrations' ? <IntegrationsScreen /> : <EditorShell />;
}
