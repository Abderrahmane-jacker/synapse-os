export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SearchResult[];
  image?: string;
  timestamp?: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  is_pinned?: boolean;
}

export interface KnowledgeNote {
  title: string;
  path: string;
  content: string;
  tags: string[];
  modified: string;
}

export interface SearchResult {
  title: string;
  content: string;
  score: number;
  path: string;
}

export interface SystemStatus {
  ollama_online: boolean;
  model: string;
  indexed_notes: number;
  uptime: number;
}

export interface DashboardStats {
  total_notes: number;
  total_chunks: number;
  total_commands: number;
  total_categories: number;
  ollama_online: boolean;
  active_model: string;
  vault_path: string;
}

export interface DashboardRecentNote {
  title: string;
  category: string;
  folder: string;
  tags: string[];
  modified: string | null;
  path: string;
}

export interface DashboardTag {
  tag: string;
  count: number;
}

export interface DashboardFeaturedCommand {
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
}

export interface DashboardData {
  stats: DashboardStats;
  categories: Record<string, number>;
  command_categories: Record<string, number>;
  recent_notes: DashboardRecentNote[];
  top_tags: DashboardTag[];
  featured_commands: DashboardFeaturedCommand[];
}
