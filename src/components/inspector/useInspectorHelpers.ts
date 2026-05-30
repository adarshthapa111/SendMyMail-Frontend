import { useCallback } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setAttr, setContent } from '../../store/slices/editorSlice';
import type { NodePath } from '../../tree/types';

/**
 * Returns a curried setter that, given an attribute key, returns an onCommit
 * handler suitable for the shared control components.
 *
 *   const setAttrFor = useAttrSetter(path);
 *   <ColorPicker onCommit={setAttrFor('color')} ... />
 */
export function useAttrSetter(path: NodePath) {
  const dispatch = useAppDispatch();
  return useCallback(
    (key: string) => (value: string | number | undefined) => {
      dispatch(setAttr({ path, key, value }));
    },
    [dispatch, path]
  );
}

export function useContentSetter(path: NodePath) {
  const dispatch = useAppDispatch();
  return useCallback(
    (value: string) => {
      dispatch(setContent({ path, content: value }));
    },
    [dispatch, path]
  );
}
