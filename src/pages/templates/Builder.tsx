/* The MJML drag-and-drop editor is the existing EditorShell — fold it into the route here.
   This component lives in its own lazy chunk because the editor + canvas + inspector
   are the heaviest part of the app. */
import EditorShell from '../../components/EditorShell';

export function Builder() {
  return <EditorShell />;
}
