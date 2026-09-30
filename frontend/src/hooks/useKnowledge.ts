import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { KnowledgeNote, SearchResult } from '@/types';

export function useKnowledge() {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [stats, setStats] = useState<{ total_notes: number; last_indexed: number; vault_path: string } | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  const fetchNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    try {
      const data = await api.knowledge.getNotes();
      setNotes(Array.isArray(data) ? data : (data as any)?.notes || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.knowledge.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch knowledge stats:', error);
    }
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await api.knowledge.search(query);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const indexVault = useCallback(async () => {
    setIsIndexing(true);
    try {
      await api.knowledge.index();
      await fetchStats();
      await fetchNotes();
    } catch (error) {
      console.error('Indexing failed:', error);
    } finally {
      setIsIndexing(false);
    }
  }, [fetchStats, fetchNotes]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    notes,
    searchResults,
    stats,
    isSearching,
    isLoadingNotes,
    isIndexing,
    search,
    fetchNotes,
    indexVault,
  };
}
