import { useState, useEffect, useCallback } from 'react';
import { Message, Conversation } from '@/types';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only load conversations if user is authenticated
    const userRaw = typeof window !== 'undefined' ? localStorage.getItem('nexus_user') : null;
    if (userRaw) {
      api.chat.getConversations()
        .then(setConversations)
        .catch((err) => {
          console.warn("Backend not yet reachable for conversations:", err);
          setConversations([]);
        });
    } else {
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
    }
      
    // Setup WS handler for streaming
    if (wsClient) {
      wsClient.connect();
      const unsubscribe = wsClient.onMessage((data) => {
        if (data.type === 'token') {
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0) {
              const lastMsg = { ...newMessages[newMessages.length - 1] };
              if (lastMsg.role === 'assistant') {
                lastMsg.content += data.content;
                newMessages[newMessages.length - 1] = lastMsg;
              }
            }
            return newMessages;
          });
        } else if (data.type === 'done') {
          setIsLoading(false);
          // If there are sources, update the last message
          if (data.sources && data.sources.length > 0) {
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.sources = data.sources;
              }
              return newMessages;
            });
          }
        } else if (data.type === 'error') {
          setIsLoading(false);
          const errorMsg = data.message || data.error || "An error occurred while communicating with the AI Provider.";
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0) {
              const lastMsg = { ...newMessages[newMessages.length - 1] };
              if (lastMsg.role === 'assistant') {
                lastMsg.content = `⚠️ ${errorMsg}`;
                newMessages[newMessages.length - 1] = lastMsg;
              }
            }
            return newMessages;
          });
        }
      });
      return () => { unsubscribe(); };
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    try {
      const history = await api.chat.getHistory(id);
      setMessages(history);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, image?: string) => {
    if (!content.trim() && !image) return;

    let convId = activeConversationId;
    
    // Create new conversation if none active
    if (!convId) {
      try {
        const newConv = await api.chat.createConversation();
        setConversations(prev => [newConv, ...prev]);
        convId = newConv.id;
        setActiveConversationId(convId);
      } catch (e) {
        console.error("Failed to create conversation", e);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      image,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add placeholder for assistant message
    setMessages(prev => [
      ...prev, 
      { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: Date.now() }
    ]);

    try {
      let sent = false;
      if (wsClient) {
          let payload: any = { message: content, conversation_id: convId };
          if (image) {
             payload.image = image.replace(/^data:image\/[a-z]+;base64,/, "");
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
          payload.operator_name = currentOp;
          payload.assistant_name = currentAst;
          
          const settingsStr = localStorage.getItem('nexus_settings');
          if (settingsStr) {
            try {
              const settings = JSON.parse(settingsStr);
              if (settings.selectedModel && settings.selectedModel !== 'deepseek-r1:8b') {
                payload.model = settings.selectedModel.toLowerCase() === 'auto' ? 'gemma4:31b-cloud' : settings.selectedModel;
              } else if (settings.agentModel && settings.agentModel !== 'deepseek-r1:8b') {
                payload.model = settings.agentModel;
              } else if (settings.llmProvider === 'omniroute') {
                payload.model = 'auto/best-coding';
              } else {
                payload.model = 'gemma4:31b-cloud';
              }

              if (settings.agentSystemPrompt) {
                payload.system_prompt = settings.agentSystemPrompt
                  .replace(/\bAbdo\b/gi, currentOp)
                  .replace(/\b(synapse|3awa)\b/gi, currentAst);
              }

              if (payload.model && (payload.model.startsWith('auto/') || payload.model === 'auto/best-coding')) {
                payload.provider = 'omniroute';
              } else if (settings.llmProvider) {
                payload.provider = settings.llmProvider;
              } else {
                payload.provider = 'ollama';
              }

              if (payload.provider === 'gemini') payload.api_key = settings.geminiApiKey;
              else if (payload.provider === 'anthropic') payload.api_key = settings.anthropicApiKey;
              else if (payload.provider === 'openai') payload.api_key = settings.openaiApiKey;
              else if (payload.provider === 'openrouter') payload.api_key = settings.openrouterApiKey;
              else if (payload.provider === 'omniroute') {
                payload.api_key = settings.omnirouteApiKey;
                payload.omniroute_host = settings.omnirouteHostUrl || 'http://localhost:20128';
              }

              if (settings.ollamaHostUrl) payload.ollama_host = settings.ollamaHostUrl;
              if (settings.omnirouteHostUrl) payload.omniroute_host = settings.omnirouteHostUrl;
            } catch (e) {}
          }
          if (!payload.model) payload.model = 'gemma4:31b-cloud';
          if (!payload.provider) payload.provider = 'ollama';
         
         sent = wsClient.send(payload);
      }

      if (!sent) {
         // Fallback to HTTP
         const res = await api.chat.send(content, convId);
         setMessages(prev => {
           const newMessages = [...prev];
           const lastMsg = newMessages[newMessages.length - 1];
           if (lastMsg && lastMsg.role === 'assistant') {
             lastMsg.content = res.response;
             lastMsg.sources = res.sources;
           }
           return newMessages;
         });
         setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = "Sorry, I encountered an error communicating with the server.";
        }
        return newMessages;
      });
    }
  }, [activeConversationId]);

  const switchConversation = useCallback((id: string) => {
    loadConversation(id);
  }, [loadConversation]);
  
  const createNewChat = useCallback(async () => {
    try {
      const newConv = await api.chat.createConversation();
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      return newConv.id;
    } catch (e) {
      console.error("Failed to create conversation", e);
      setActiveConversationId(null);
      setMessages([]);
      return null;
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await api.chat.deleteConversation(id);
      setConversations(prev => {
        const nextConvs = prev.filter(c => c.id !== id);
        
        if (activeConversationId === id) {
          if (nextConvs.length > 0) {
            // Select the most recent conversation or pinned
            const defaultConv = nextConvs.find(c => c.is_pinned) || nextConvs[0];
            setActiveConversationId(defaultConv.id);
            api.chat.getHistory(defaultConv.id).then(setMessages).catch(console.error);
          } else {
            // If zero conversations remain, just clear the active state.
            setActiveConversationId(null);
            setMessages([]);
          }
        }
        return nextConvs;
      });
    } catch (e) {
      console.error('Failed to delete conversation', e);
    }
  }, [activeConversationId]);

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await api.chat.updateConversation(id, { title: newTitle });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    } catch (e) {
      console.error('Failed to rename conversation', e);
    }
  }, []);

  const togglePinConversation = useCallback(async (id: string) => {
    const target = conversations.find(c => c.id === id);
    if (!target) return;
    const nextPinned = !target.is_pinned;
    try {
      await api.chat.updateConversation(id, { is_pinned: nextPinned });
      setConversations(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, is_pinned: nextPinned } : c);
        return updated.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
      });
    } catch (e) {
      console.error('Failed to toggle pin conversation', e);
    }
  }, [conversations]);

  return {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    sendMessage,
    switchConversation,
    createNewChat,
    deleteConversation,
    renameConversation,
    togglePinConversation,
  };
}
