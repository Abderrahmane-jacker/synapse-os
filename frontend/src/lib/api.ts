import { Conversation, KnowledgeNote, SearchResult, SystemStatus, DashboardData } from '@/types';

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

export interface ApiError {
  name: string;
  message: string;
  status: number;
}

function makeApiError(status: number, message: string): ApiError {
  return {
    name: 'ApiError',
    message,
    status,
  };
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let vaultPath = '';
  let authToken = '';
  if (typeof window !== 'undefined') {
    try {
      authToken = localStorage.getItem('nexus_auth_token') || '';
      if (authToken) {
        const settingsStr = localStorage.getItem('nexus_settings');
        if (settingsStr) {
          vaultPath = JSON.parse(settingsStr).vaultPath || '';
        }
      }
    } catch (e) {}
  }

  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(vaultPath ? { 'X-Vault-Path': vaultPath } : {}),
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = `API Error: ${response.statusText}`;
    try {
      const data = await response.json();
      if (data && data.detail) {
        errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch (e) {}
    throw makeApiError(response.status, errorDetail);
  }

  return response.json();
}

export const api = {
  chat: {
    send: async (message: string, conversation_id?: string, image?: string) => {
      const body: any = { message, conversation_id };
      if (image) {
        // Strip the data URL prefix if present so backend gets pure base64
        body.image = image.replace(/^data:image\/[a-z]+;base64,/, "");
      }
      
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('nexus_user') : null;
      let currentOp = "Operator";
      let currentAst = "Synapse";
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.user_name) currentOp = u.user_name;
          if (u.assistant_name) currentAst = u.assistant_name;
        } catch (e) {}
      }
      body.operator_name = currentOp;
      body.assistant_name = currentAst;

      const settingsStr = typeof window !== 'undefined' ? localStorage.getItem('nexus_settings') : null;
      if (settingsStr) {
        try {
          const settings = JSON.parse(settingsStr);
          if (settings.selectedModel && settings.selectedModel !== 'deepseek-r1:8b') {
            body.model = settings.selectedModel.toLowerCase() === 'auto' ? 'auto/best-coding' : settings.selectedModel;
          } else if (settings.agentModel && settings.agentModel !== 'deepseek-r1:8b') {
            body.model = settings.agentModel;
          } else if (settings.llmProvider === 'omniroute') {
            body.model = 'auto/best-coding';
          }

          if (settings.agentSystemPrompt) {
            body.system_prompt = settings.agentSystemPrompt
              .replace(/\bAbdo\b/gi, currentOp)
              .replace(/\b(synapse|3awa)\b/gi, currentAst);
          }

          if (settings.llmProvider) body.provider = settings.llmProvider;
          if (settings.llmProvider === 'gemini') body.api_key = settings.geminiApiKey;
          else if (settings.llmProvider === 'anthropic') body.api_key = settings.anthropicApiKey;
          else if (settings.llmProvider === 'openai') body.api_key = settings.openaiApiKey;
          else if (settings.llmProvider === 'openrouter') body.api_key = settings.openrouterApiKey;
          else if (settings.llmProvider === 'omniroute') {
            body.api_key = settings.omnirouteApiKey;
            body.omniroute_host = settings.omnirouteHostUrl || 'http://localhost:20128';
          }

          if (settings.ollamaHostUrl) body.ollama_host = settings.ollamaHostUrl;
          if (settings.omnirouteHostUrl) body.omniroute_host = settings.omnirouteHostUrl;
        } catch (e) {}
      }
      const data = await fetchApi<any>('/api/chat', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return {
        conversation_id: data.conversation_id as string,
        response: (data.message?.content || data.response || "") as string,
        sources: (data.message?.sources || data.sources || []) as SearchResult[]
      };
    },
    getConversations: async () => {
      const data = await fetchApi<{conversations: Conversation[]}>('/api/chat/conversations');
      return data.conversations || [];
    },
    createConversation: async () => {
      const data = await fetchApi<{id: string}>('/api/chat/conversations', { method: 'POST' });
      return { id: data.id, title: 'New Conversation', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Conversation;
    },
    getHistory: (conversation_id: string) =>
      fetchApi<any[]>(`/api/chat/history?conversation_id=${conversation_id}`),
    deleteConversation: (id: string) =>
      fetchApi<{ status: string }>(`/api/chat/conversations/${id}`, { method: 'DELETE' }),
    updateConversation: (id: string, updates: { title?: string; is_pinned?: boolean }) => {
      const params = new URLSearchParams();
      if (updates.title !== undefined) params.append('title', updates.title);
      if (updates.is_pinned !== undefined) params.append('is_pinned', String(updates.is_pinned));
      return fetchApi<{ status: string }>(`/api/chat/conversations/${id}?${params.toString()}`, { method: 'PUT' });
    },
  },
  knowledge: {
    search: async (q: string) => {
      const data = await fetchApi<{ results: SearchResult[] }>(`/api/knowledge/search?q=${encodeURIComponent(q)}`);
      return data.results || [];
    },
    getNotes: async () => {
      const data = await fetchApi<{ total: number; notes: KnowledgeNote[] }>('/api/knowledge/notes');
      return data.notes || [];
    },
    getStats: () => fetchApi<{ total_notes: number; last_indexed: number; vault_path: string }>('/api/knowledge/stats'),
    index: () => fetchApi<{ status: string; count: number }>('/api/knowledge/index', { method: 'POST' }),
    indexVault: () => fetchApi<{ status: string; count: number }>('/api/knowledge/index', { method: 'POST' }),
    detectVaults: () => fetchApi<{ vaults: Array<{ path: string; name: string; note_count: number }> }>('/api/knowledge/detect-vaults'),
    browseFolders: (path?: string) =>
      fetchApi<{
        current_path: string;
        parent_path: string | null;
        name: string;
        note_count: number;
        is_vault: boolean;
        shortcuts: Array<{ name: string; path: string; exists: boolean }>;
        directories: Array<{ name: string; path: string; note_count: number; is_vault: boolean }>;
      }>(`/api/knowledge/browse-folders${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    validatePath: (path: string) => fetchApi<{ valid: boolean; resolved_path: string; note_count: number; name?: string; message: string }>('/api/knowledge/validate-path', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
    createNote: async (note: { title: string; content: string; tags: string[]; folder?: string }) => {
      return fetchApi<{ status: string; path: string; title: string }>('/api/knowledge/notes', {
        method: 'POST',
        body: JSON.stringify(note),
      });
    },
    getPredictions: async (limit: number = 8) => {
      const data = await fetchApi<{ predictions: any[] }>(`/api/knowledge/predictions?limit=${limit}`);
      return data.predictions || [];
    },
    connectNotes: async (source_path: string, target_title: string) => {
      return fetchApi<{ status: string; success: boolean }>('/api/knowledge/connect', {
        method: 'POST',
        body: JSON.stringify({ source_path, target_title }),
      });
    },
    getBacklinks: async (title: string) => {
      return fetchApi<{
        title: string;
        backlinks: Array<{ title: string; path: string; tags: string[]; snippet: string }>;
        backlink_count: number;
        forward_links: Array<{ title: string; alias: string }>;
        forward_count: number;
      }>(`/api/knowledge/backlinks?title=${encodeURIComponent(title)}`);
    },
    getGraph: () => fetchApi<{
      total_notes: number;
      total_connections: number;
      nodes: any[];
      links: any[];
      constellation_links: any[];
      top_hubs: any[];
      category_counts: Record<string, number>;
      tag_counts: Record<string, number>;
    }>('/api/knowledge/graph'),
  },
  system: {
    getHealth: () => fetchApi<{ status: string }>('/api/system/health'),
    getModels: () => fetchApi<{ models: Array<string | { name: string; provider?: string }> }>('/api/system/models'),
    getStatus: () => fetchApi<SystemStatus>('/api/system/status'),
    getDashboard: () => fetchApi<DashboardData>('/api/system/dashboard'),
    pullModel: (model: string, host?: string) =>
      fetchApi<{ status: string; result?: any; message?: string }>('/api/system/models/pull', {
        method: 'POST',
        body: JSON.stringify({ model, host }),
      }),
    setActiveModel: (model: string, provider: string = 'ollama') =>
      fetchApi<{ status: string; active_model: string; provider?: string }>('/api/system/model/active', {
        method: 'POST',
        body: JSON.stringify({ model, provider }),
      }),
    setup: (payload: {
      vault_path?: string;
      model?: string;
      provider?: string;
      operator_name?: string;
      agent_name?: string;
      omniroute_token?: string;
      omniroute_host?: string;
    }) =>
      fetchApi<{ status: string; vault_path: string; note_count: number; message: string }>('/api/system/setup', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getSetupStatus: () =>
      fetchApi<{ configured: boolean; vault_path: string; note_count: number; default_model: string; provider: string; operator_name: string; agent_name: string }>('/api/system/setup-status'),
  },
  commands: {
    getCommands: () => fetchApi<{
      total: number;
      categories: string[];
      tags: Record<string, number>;
      commands: Array<{
        id: string;
        title: string;
        category: string;
        description: string;
        template: string;
        language: string;
        parameters: Array<{ name: string; placeholder: string; default: string }>;
        tags: string[];
        filepath: string;
        filename: string;
      }>;
    }>('/api/commands'),
    list: () => fetchApi<{
      total: number;
      categories: string[];
      tags: Record<string, number>;
      commands: Array<{
        id: string;
        title: string;
        category: string;
        description: string;
        template: string;
        language: string;
        parameters: Array<{ name: string; placeholder: string; default: string }>;
        tags: string[];
        filepath: string;
        filename: string;
      }>;
    }>('/api/commands'),
    addCommand: (cmd: { category: string; title: string; command: string; description?: string; tags?: string[] }) =>
      fetchApi<{ status: string; message: string; category: string; title: string; file: string }>('/api/commands/add', {
        method: 'POST',
        body: JSON.stringify(cmd),
      }),
  },
  auth: {
    register: (data: { email: string; password: string; user_name?: string; assistant_name?: string }) =>
      fetchApi<{ access_token: string; token_type: string; user: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      fetchApi<{ access_token: string; token_type: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMe: () => fetchApi<{ user: any }>('/api/auth/me'),
    deleteAccount: (data: { password: string }) =>
      fetchApi<{ status: string; message: string }>('/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  vault: {
    syncGithub: (data: { repo_url: string; token?: string; vault_path?: string }) =>
      fetchApi<{ status: string; message: string; output?: string }>('/api/vault/github-sync', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    uploadZip: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetchApi<{ status: string; vault_path: string; note_count: number; message: string }>('/api/vault/upload-zip', {
        method: 'POST',
        body: formData,
      });
    },
  },
};
