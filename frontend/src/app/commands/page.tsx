"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { useChat } from "@/hooks/useChat";
import { api } from "@/lib/api";
import { SystemStatus } from "@/types";
import { 
  Search, Terminal, Copy, Check, Star, Filter, Folder, Tag, Play, 
  ExternalLink, Sparkles, RefreshCw, Zap, Shield, Code, Plus, X, FolderPlus,
  Send, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

interface CommandParam {
  name: string;
  placeholder: string;
  default: string;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  description: string;
  template: string;
  language: string;
  parameters: CommandParam[];
  tags: string[];
  filepath: string;
  filename: string;
}

export default function CommandsPage() {
  const router = useRouter();
  const { conversations, activeConversationId, switchConversation, createNewChat, deleteConversation, renameConversation, togglePinConversation } = useChat();
  const [status, setStatus] = useState<SystemStatus | null>(null);

  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tagsMap, setTagsMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem("nexus_favorite_commands");
        return raw ? JSON.parse(raw) : [];
      } catch (e) {}
    }
    return [];
  });

  const [selectedCommand, setSelectedCommand] = useState<CommandItem | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Command Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmittingCmd, setIsSubmittingCmd] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const handleSaveNewCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = customCategory.trim() || newCategory.trim() || "General Commands";
    if (!newTitle.trim() || !newCommand.trim()) return;

    setIsSubmittingCmd(true);
    setAddFeedback(null);
    try {
      const res = await api.commands.addCommand({
        category: finalCategory,
        title: newTitle.trim(),
        command: newCommand.trim(),
        description: newDescription.trim()
      });

      setAddFeedback(res.message || "Command successfully added!");
      await fetchCommands();

      setTimeout(() => {
        setIsAddModalOpen(false);
        setNewTitle("");
        setNewCommand("");
        setNewDescription("");
        setCustomCategory("");
        setAddFeedback(null);
      }, 1500);
    } catch (err: any) {
      setAddFeedback(`Failed: ${err.message || "Could not save command"}`);
    } finally {
      setIsSubmittingCmd(false);
    }
  };

  const fetchCommands = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.commands.list();
      setCommands(data.commands || []);
      setCategories(data.categories || []);
      setTagsMap(data.tags || {});

      // Auto-select first command if none selected
      if (!selectedCommand && data.commands && data.commands.length > 0) {
        setSelectedCommand(data.commands[0]);
      }
    } catch (err) {
      console.error("Failed to load commands:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCommand]);

  useEffect(() => {
    fetchCommands();
    api.system.getStatus().then(setStatus).catch(console.error);
  }, [fetchCommands]);

  // Sync parameter default values when selectedCommand changes
  useEffect(() => {
    if (selectedCommand) {
      const initialParams: Record<string, string> = {};
      if (selectedCommand.parameters) {
        selectedCommand.parameters.forEach(p => {
          initialParams[p.name] = p.default || "";
        });
      }
      setParamValues(initialParams);
    }
  }, [selectedCommand]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem("nexus_favorite_commands", JSON.stringify(next));
      }
      return next;
    });
  };

  const filteredCommands = useMemo(() => {
    return commands.filter(cmd => {
      if (selectedCategory && cmd.category !== selectedCategory) return false;
      if (selectedTag && (!cmd.tags || !cmd.tags.includes(selectedTag))) return false;
      if (onlyFavorites && !favorites.includes(cmd.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = cmd.title.toLowerCase().includes(q);
        const inDesc = cmd.description?.toLowerCase().includes(q);
        const inTemplate = cmd.template.toLowerCase().includes(q);
        const inTags = cmd.tags?.some(t => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTemplate && !inTags) return false;
      }
      return true;
    });
  }, [commands, selectedCategory, selectedTag, onlyFavorites, searchQuery, favorites]);

  // Compiled command string with parameter replacements
  const compiledCommand = useMemo(() => {
    if (!selectedCommand) return "";
    let result = selectedCommand.template;
    if (selectedCommand.parameters) {
      selectedCommand.parameters.forEach(p => {
        const userVal = paramValues[p.name] !== undefined ? paramValues[p.name] : (p.default || p.placeholder);
        result = result.replaceAll(p.placeholder, userVal);
      });
    }
    return result;
  }, [selectedCommand, paramValues]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecuteInClaude = () => {
    if (!compiledCommand) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_initial_prompt', compiledCommand);
    }
    createNewChat();
    router.push('/');
  };

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'row',
      background: '#FFFFFF',
      color: '#0F0F0F',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <AnimatedBackground />

      <Sidebar 
        conversations={conversations} 
        activeId={activeConversationId} 
        onSelect={switchConversation} 
        onNewChat={createNewChat}
        onDelete={deleteConversation}
        onRename={renameConversation}
        onTogglePin={togglePinConversation}
        status={status}
      />

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        
        {/* Top Header */}
        <header style={{
          padding: '14px 28px',
          background: '#FFFFFF',
          borderBottom: '2px solid #0F0F0F',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 20
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} /> TACTICAL ARSENAL // SHELL & AUTOMATION
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F', letterSpacing: '-0.02em', margin: '2px 0 0 0', textTransform: 'uppercase' }}>
              Command Vectors
            </h1>
          </div>

          {/* Quick Stats Badges */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="brutalist-tag brutalist-tag-lime">
              <span>{commands.length} COMMANDS</span>
            </span>

            <span className="brutalist-tag brutalist-tag-white">
              <span>{categories.length} CATEGORIES</span>
            </span>

            <span className="brutalist-tag brutalist-tag-white">
              <Star size={11} color="#0F0F0F" />
              <span>{favorites.length} STARRED</span>
            </span>

            <button
              onClick={fetchCommands}
              title="Rescan Commands Repository"
              className="brutalist-btn-secondary"
              style={{ fontSize: '0.74rem', padding: '6px 12px' }}
            >
              <RefreshCw size={12} className={isLoading ? "spinning" : ""} />
              <span>RESCAN</span>
            </button>

            <button
              onClick={() => {
                setAddFeedback(null);
                setIsAddModalOpen(true);
              }}
              className="brutalist-btn-primary"
              style={{ fontSize: '0.74rem', padding: '6px 14px' }}
            >
              <Plus size={13} />
              <span>ADD COMMAND</span>
            </button>
          </div>
        </header>

        {/* Filter Controls Bar */}
        <div style={{
          padding: '12px 28px',
          background: '#F4F4F5',
          borderBottom: '2px solid #0F0F0F',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          zIndex: 20
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#0F0F0F' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search commands, flags, tools..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                color: '#0F0F0F',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          {/* Category Filter Dropdown */}
          <select
            value={selectedCategory || ""}
            onChange={e => setSelectedCategory(e.target.value || null)}
            style={{
              padding: '8px 12px',
              background: '#FFFFFF',
              border: '2px solid #0F0F0F',
              color: '#0F0F0F',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <option value="">ALL CATEGORIES</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Favorites Only Toggle */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            style={{
              padding: '8px 14px',
              background: onlyFavorites ? '#D0FF14' : '#FFFFFF',
              border: '2px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              color: '#0F0F0F',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Star size={13} fill={onlyFavorites ? "#0F0F0F" : "none"} />
            <span>FAVORITES ({favorites.length})</span>
          </button>

          {(selectedCategory || selectedTag || searchQuery || onlyFavorites) && (
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedTag(null);
                setSearchQuery("");
                setOnlyFavorites(false);
              }}
              style={{
                padding: '7px 12px',
                background: '#FFFFFF',
                border: '1px solid #0F0F0F',
                color: '#0F0F0F',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                cursor: 'pointer'
              }}
            >
              RESET FILTERS
            </button>
          )}
        </div>

        {/* Main Content Area (Dual Pane Grid & Inspector) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', zIndex: 10 }}>
          
          {/* LEFT PANE: Command List */}
          <div style={{
            width: '420px',
            borderRight: '2px solid #0F0F0F',
            background: '#FFFFFF',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '16px'
          }}>
            {isLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#71717A', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                <RefreshCw size={20} className="spinning" style={{ margin: '0 auto 10px auto' }} />
                SCANNING REPOSITORY...
              </div>
            ) : filteredCommands.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#71717A', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                NO COMMANDS MATCHING FILTER.
              </div>
            ) : (
              filteredCommands.map(cmd => {
                const isSelected = selectedCommand?.id === cmd.id;
                const isFav = favorites.includes(cmd.id);

                return (
                  <div
                    key={cmd.id}
                    onClick={() => setSelectedCommand(cmd)}
                    style={{
                      background: isSelected ? '#D0FF14' : '#FFFFFF',
                      border: isSelected ? '2px solid #0F0F0F' : '1px solid #0F0F0F',
                      boxShadow: isSelected ? '3px 3px 0px #0F0F0F' : 'none',
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.1s ease'
                    }}
                    onMouseOver={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#F4F4F5';
                      }
                    }}
                    onMouseOut={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#FFFFFF';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        {cmd.category}
                      </span>
                      
                      <button
                        onClick={(e) => toggleFavorite(cmd.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#0F0F0F' }}
                      >
                        <Star size={14} fill={isFav ? "#0F0F0F" : "none"} />
                      </button>
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F' }}>
                      {cmd.title}
                    </div>

                    <div style={{
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#D0FF14',
                      background: '#0F0F0F',
                      padding: '8px 10px',
                      border: '1px solid #0F0F0F',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      $ {cmd.template}
                    </div>

                    {cmd.tags && cmd.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {cmd.tags.slice(0, 3).map(t => (
                          <span key={t} className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT PANE: Command Inspector & Parameter Customizer */}
          <div style={{ flex: 1, background: '#FAFAFA', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {selectedCommand ? (
              <>
                {/* Header Card */}
                <div className="brutalist-card-static" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      INSPECTOR // {selectedCommand.filename}
                    </span>
                    <span className="brutalist-tag brutalist-tag-lime" style={{ fontSize: '0.7rem' }}>
                      {selectedCommand.category}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                    {selectedCommand.title}
                  </h2>

                  {selectedCommand.description && (
                    <div style={{ fontSize: '0.86rem', color: '#52525B', marginTop: '8px', lineHeight: 1.6 }}>
                      {selectedCommand.description}
                    </div>
                  )}
                </div>

                {/* Interactive Parameters Form (if parameters exist) */}
                {selectedCommand.parameters && selectedCommand.parameters.length > 0 && (
                  <div className="brutalist-card-static" style={{ padding: '24px' }}>
                    <div style={{ fontSize: '0.76rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Code size={14} /> PARAMETERS ({selectedCommand.parameters.length})
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                      {selectedCommand.parameters.map(p => (
                        <div key={p.name}>
                          <label style={{ display: 'block', fontSize: '0.74rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '6px' }}>
                            {p.name}
                          </label>
                          <input
                            type="text"
                            value={paramValues[p.name] || ""}
                            onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                            placeholder={`Enter ${p.name}...`}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: '#FFFFFF',
                              border: '2px solid #0F0F0F',
                              color: '#0F0F0F',
                              fontSize: '0.84rem',
                              fontFamily: 'var(--font-mono)'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compiled Shell Command Box (Dark Terminal Box) */}
                <div style={{
                  background: '#0F0F0F',
                  border: '2px solid #0F0F0F',
                  boxShadow: '4px 4px 0px #0F0F0F',
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#A1A1AA', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
                    <span>COMPILED SHELL INSTRUCTION</span>
                    <span style={{ color: '#D0FF14', fontWeight: 700 }}>{selectedCommand.language.toUpperCase()}</span>
                  </div>

                  <pre style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.94rem',
                    color: '#D0FF14',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    lineHeight: 1.6
                  }}>
                    $ {compiledCommand}
                  </pre>
                </div>

                {/* Action Trigger Buttons */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleCopy(compiledCommand, selectedCommand.id)}
                    className="brutalist-btn-secondary"
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      fontSize: '0.82rem'
                    }}
                  >
                    {copiedId === selectedCommand.id ? <Check size={16} color="#15803D" /> : <Copy size={16} />}
                    <span>{copiedId === selectedCommand.id ? "COPIED TO CLIPBOARD" : "COPY COMMAND"}</span>
                  </button>

                  <button
                    onClick={handleExecuteInClaude}
                    className="brutalist-btn-primary"
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <Send size={15} />
                    <span>EXECUTE IN CONSOLE</span>
                  </button>
                </div>

                {/* Tags Metadata */}
                {selectedCommand.tags && selectedCommand.tags.length > 0 && (
                  <div className="brutalist-card-static" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '8px' }}>
                      TAXONOMY TAGS
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedCommand.tags.map(t => (
                        <span key={t} className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.72rem' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                SELECT A COMMAND VECTOR TO INSPECT.
              </div>
            )}
          </div>

        </div>

      </div>


      {isAddModalOpen && typeof window !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', border: '2px solid #0F0F0F',
            maxWidth: '560px', width: '100%', padding: '28px', position: 'relative',
            boxShadow: '6px 6px 0px #0F0F0F'
          }}>
            <button
              onClick={() => setIsAddModalOpen(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px', background: '#FFFFFF',
                border: '1px solid #0F0F0F', color: '#0F0F0F', cursor: 'pointer', padding: '4px'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '30px', height: '30px', background: '#D0FF14', border: '1px solid #0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={16} color="#0F0F0F" />
              </div>
              <h2 style={{ fontSize: '1.18rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F', textTransform: 'uppercase', margin: 0 }}>
                Add Tactical Command
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#52525B', marginBottom: '18px' }}>
              Save new syntax to your Obsidian Commands Repository. Markdown files are created directly on disk.
            </p>

            {addFeedback && (
              <div style={{
                padding: '10px 14px', marginBottom: '16px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                background: addFeedback.includes("Failed") ? '#FEE2E2' : '#DCFCE7',
                border: `1px solid ${addFeedback.includes("Failed") ? '#DC2626' : '#15803D'}`,
                color: addFeedback.includes("Failed") ? '#991B1B' : '#15803D',
                fontWeight: 700
              }}>
                {addFeedback}
              </div>
            )}

            <form onSubmit={handleSaveNewCommand} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '6px' }}>
                  CATEGORY_NAME
                </label>
                <select
                  value={newCategory}
                  onChange={e => {
                    setNewCategory(e.target.value);
                    if (e.target.value !== '__custom__') setCustomCategory('');
                  }}
                  style={{
                    width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '2px solid #0F0F0F',
                    color: '#0F0F0F', fontSize: '0.84rem', fontFamily: 'var(--font-mono)'
                  }}
                >
                  <option value="">Select Existing Category...</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="__custom__">+ Create New Category...</option>
                </select>
                {(newCategory === '__custom__' || categories.length === 0) && (
                  <input
                    type="text"
                    placeholder="Enter new category (e.g. Web Security, PrivEsc)..."
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    style={{
                      width: '100%', marginTop: '8px', padding: '9px 12px', background: '#FFFFFF',
                      border: '2px solid #0F0F0F', color: '#0F0F0F', fontSize: '0.84rem', fontFamily: 'var(--font-mono)'
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '6px' }}>
                  COMMAND_TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SQLMap Automated Database Dump"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '2px solid #0F0F0F',
                    color: '#0F0F0F', fontSize: '0.84rem', fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '6px' }}>
                  COMMAND_SYNTAX *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder='e.g. sqlmap -u "<TARGET_URL>" --batch --dbs'
                  value={newCommand}
                  onChange={e => setNewCommand(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#0F0F0F', border: '2px solid #0F0F0F',
                    color: '#D0FF14', fontSize: '0.84rem', fontFamily: 'var(--font-mono)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#71717A', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: '6px' }}>
                  DESCRIPTION / NOTES (OPTIONAL)
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief notes on parameters or target flags..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '2px solid #0F0F0F',
                    color: '#0F0F0F', fontSize: '0.84rem', fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="brutalist-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.78rem' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCmd || !newTitle.trim() || !newCommand.trim()}
                  className="brutalist-btn-primary"
                  style={{ fontSize: '0.78rem', padding: '8px 18px' }}
                >
                  {isSubmittingCmd ? "SAVING..." : "SAVE TO VAULT"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
