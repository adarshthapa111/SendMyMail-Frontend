import axios from 'axios';
import type { IMjmlNode } from '../tree/types';
import { stripEditorFields } from '../tree/strip';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

api.interceptors.request.use((config) => {
  const jwt = localStorage.getItem('sendmymail_jwt');
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

export interface RenderArgs {
  tree: IMjmlNode;
  format: 'html' | 'mjml';
  operationType: 'preview' | 'copy';
  thirdPartyClientName?: string;
  customProperties?: Record<string, unknown>;
  isHTMLMinificationEnabled?: boolean;
  signal?: AbortSignal;
}

export async function renderTemplate(args: RenderArgs): Promise<string> {
  const endpoint = args.format === 'mjml' ? '/getMjml' : '/getHtml';
  const response = await api.post(
    endpoint,
    {
      content: stripEditorFields(args.tree),
      operationType: args.operationType,
      thirdPartyClientName: args.thirdPartyClientName,
      customProperties: args.customProperties ?? {},
      isHTMLMinificationEnabled: args.isHTMLMinificationEnabled ?? false,
    },
    {
      responseType: 'text',
      signal: args.signal,
    }
  );
  return response.data;
}

export type { IMjmlNode } from '../tree/types';
