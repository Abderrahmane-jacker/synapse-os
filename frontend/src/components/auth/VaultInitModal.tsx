"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Folder, FolderOpen, Check, Sparkles, RefreshCw, 
  X, ArrowRight, HardDrive, AlertCircle, ChevronRight, ChevronUp, Layers,
  UploadCloud, FileArchive, CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";

interface VaultInitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (vaultPath: string) => void;
  userName?: string;
}

interface DetectedVault {
  path: string;
  name: string;
  note_count: number;
}

interface Subdirectory {
  name: string;
  path: string;
  note_count: number;
  is_vault: boolean;
}

interface Shortcut {
  name: string;
  path: string;
  exists: boolean;
}

export default function VaultInitModal({
  isOpen,
  onClose,
  onSuccess,
  userName = "OPERATOR"
}: VaultInitModalProps) {
  const [mounted, setMounted] = useState(false);
  const [vaultPath, setVaultPath] = useState("");
  const [detectedVaults, setDetectedVaults] = useState<DetectedVault[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    noteCount: number;
    message: string;
  } | null>(null);

  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingDone, setIndexingDone] = useState(false);
  const [systemFolderName, setSystemFolderName] = useState<string | null>(null);
  const [systemFilesFound, setSystemFilesFound] = useState<number | null>(null);

  // Tab State: Local Directory vs ZIP Archive Upload
  const [activeTab, setActiveTab] = useState<"local" | "zip">("local");

  // ZIP Upload State
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<{ note_count: number; vault_path: string } | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Visual Folder Browser State
  const [currentBrowsePath, setCurrentBrowsePath] = useState<string>("/vault");
  const [browseParentPath, setBrowseParentPath] = useState<string | null>(null);
  const [browseDirectories, setBrowseDirectories] = useState<Subdirectory[]>([]);
  const [browseShortcuts, setBrowseShortcuts] = useState<Shortcut[]>([]);
  const [currentFolderNotes, setCurrentFolderNotes] = useState<number>(0);
  const [isBrowsingLoading, setIsBrowsingLoading] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigateToFolder = async (folderPath: string) => {
    setIsBrowsingLoading(true);
    try {
      const res = await api.knowledge.browseFolders(folderPath);
      setCurrentBrowsePath(res.current_path);
      setBrowseParentPath(res.parent_path);
      setBrowseDirectories(res.directories || []);
      setBrowseShortcuts(res.shortcuts || []);
      setCurrentFolderNotes(res.note_count || 0);

      setVaultPath(res.current_path);
    } catch (err) {
      console.warn("Folder navigation error:", err);
    } finally {
      setIsBrowsingLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let initialPath = "";
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("nexus_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.vaultPath) {
            initialPath = parsed.vaultPath;
            setVaultPath(parsed.vaultPath);
          }
        }
      } catch (e) {}
    }

    navigateToFolder(initialPath || "/vault");

    api.knowledge.detectVaults()
      .then((res) => {
        if (res?.vaults && res.vaults.length > 0) {
          setDetectedVaults(res.vaults);
          if (!initialPath) {
            setVaultPath(res.vaults[0].path);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not auto-detect vaults:", err);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!vaultPath.trim()) {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await api.knowledge.validatePath(vaultPath.trim());
        setValidationResult({
          valid: res.valid,
          noteCount: res.note_count || 0,
          message: res.message
        });
      } catch (err: any) {
        setValidationResult({
          valid: false,
          noteCount: 0,
          message: err?.message || "Failed to validate path"
        });
      } finally {
        setIsValidating(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [vaultPath]);

  if (!isOpen || !mounted) return null;

  const handleOpenNativeDirectoryPicker = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: "read"
        });

        if (dirHandle && dirHandle.name) {
          setSystemFolderName(dirHandle.name);

          let mdCount = 0;
          try {
            for await (const entry of (dirHandle as any).values()) {
              if (entry.kind === "file" && entry.name.endsWith(".md")) {
                mdCount++;
              }
            }
          } catch (e) {}

          setSystemFilesFound(mdCount);

          const matchingDetected = detectedVaults.find(
            (v) => v.name.toLowerCase() === dirHandle.name.toLowerCase()
          );

          if (matchingDetected) {
            setVaultPath(matchingDetected.path);
            navigateToFolder(matchingDetected.path);
          } else {
            const resolved = `/vault/${dirHandle.name}`;
            setVaultPath(resolved);
            navigateToFolder(resolved);
          }
          return;
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("showDirectoryPicker failed, falling back to input:", err);
      } else {
        return;
      }
    }

    fileInputRef.current?.click();
  };

  const handleDirectoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const relativePath = (firstFile as any).webkitRelativePath || firstFile.name;
    const rootFolder = relativePath.split("/")[0] || "Selected Vault";

    let mdCount = 0;
    for (let i = 0; i < files.length; i++) {
      if (files[i].name.endsWith(".md")) {
        mdCount++;
      }
    }

    setSystemFolderName(rootFolder);
    setSystemFilesFound(mdCount);

    const matchingDetected = detectedVaults.find(
      (v) => v.name.toLowerCase() === rootFolder.toLowerCase()
    );

    if (matchingDetected) {
      setVaultPath(matchingDetected.path);
      navigateToFolder(matchingDetected.path);
    } else {
      const resolved = `/vault/${rootFolder}`;
      setVaultPath(resolved);
      navigateToFolder(resolved);
    }
  };

  const handleConfirmAndIndex = async () => {
    const finalPath = vaultPath.trim() || currentBrowsePath || "/vault";
    setIsIndexing(true);

    try {
      let currentSettings: any = {};
      try {
        const raw = localStorage.getItem("nexus_settings");
        if (raw) currentSettings = JSON.parse(raw);
      } catch (e) {}

      currentSettings.vaultPath = finalPath;
      localStorage.setItem("nexus_settings", JSON.stringify(currentSettings));
      localStorage.setItem("nexus_vault_initialized", "true");

      await api.knowledge.index();

      setIndexingDone(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(finalPath);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error("Failed to index vault during setup:", err);
      if (onSuccess) onSuccess(finalPath);
      onClose();
    } finally {
      setIsIndexing(false);
    }
  };

  const handleZipFileSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setUploadError("Please select a valid .zip archive.");
      return;
    }
    setZipFile(file);
    setUploadError(null);
  };

  const handleUploadZip = async () => {
    if (!zipFile) return;
    setIsUploading(true);
    setUploadProgressMsg("Uploading vault archive...");
    setUploadError(null);

    try {
      setUploadProgressMsg("Extracting notes & indexing vector graph...");
      const res = await api.vault.uploadZip(zipFile);
      if (res.status === "success") {
        setUploadSuccess({
          note_count: res.note_count,
          vault_path: res.vault_path,
        });
        setVaultPath(res.vault_path);

        try {
          let currentSettings: any = {};
          const raw = localStorage.getItem("nexus_settings");
          if (raw) currentSettings = JSON.parse(raw);
          currentSettings.vaultPath = res.vault_path;
          localStorage.setItem("nexus_settings", JSON.stringify(currentSettings));
          localStorage.setItem("nexus_vault_initialized", "true");
        } catch (e) {}

        setTimeout(() => {
          if (onSuccess) onSuccess(res.vault_path);
          onClose();
        }, 1200);
      } else {
        setUploadError(res.message || "Failed to process vault zip.");
      }
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload and extract zip archive.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    try {
      let currentSettings: any = {};
      const raw = localStorage.getItem("nexus_settings");
      if (raw) currentSettings = JSON.parse(raw);
      currentSettings.vaultPath = vaultPath.trim() || "/vault";
      localStorage.setItem("nexus_settings", JSON.stringify(currentSettings));
      localStorage.setItem("nexus_vault_initialized", "true");
    } catch (e) {}

    if (onSuccess) onSuccess(vaultPath.trim() || "/vault");
    onClose();
  };

  const pathParts = currentBrowsePath.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => ({
    name: part,
    path: "/" + pathParts.slice(0, index + 1).join("/")
  }));

  const modalContent = (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 15, 15, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999999,
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '640px',
        maxHeight: '90vh',
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        borderRadius: '0px',
        boxShadow: '8px 8px 0px #0F0F0F',
        padding: '24px 28px',
        position: 'relative',
        color: '#0F0F0F',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Close Button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: '#F4F4F5',
            border: '1px solid #0F0F0F',
            color: '#0F0F0F',
            cursor: 'pointer',
            padding: '4px',
            zIndex: 10,
            fontWeight: 800
          }}
        >
          <X size={16} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={handleDirectoryInputChange}
        />

        <input
          type="file"
          ref={zipInputRef}
          accept=".zip"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleZipFileSelected(file);
          }}
        />

        {/* Header Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#D0FF14',
          border: '1px solid #0F0F0F',
          borderRadius: '0px',
          padding: '2px 8px',
          fontSize: '0.65rem',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#0F0F0F',
          fontWeight: 800,
          marginBottom: '8px',
          width: 'fit-content'
        }}>
          <Sparkles size={12} /> [ONBOARDING] // SELECT OBSIDIAN VAULT
        </div>

        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          margin: '0 0 4px 0',
          color: '#0F0F0F'
        }}>
          CONNECT OBSIDIAN KNOWLEDGE VAULT
        </h2>

        <p style={{
          fontSize: '0.82rem',
          color: '#52525B',
          lineHeight: '1.45',
          margin: '0 0 14px 0'
        }}>
          Operator <span style={{ color: '#0F0F0F', fontWeight: 800 }}>{userName.toUpperCase()}</span>: Mount a local storage directory or upload an exported <code style={{ background: '#F4F4F5', padding: '1px 4px', border: '1px solid #E4E4E7' }}>.zip</code> archive to initialize your knowledge graph.
        </p>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => setActiveTab("local")}
            style={{
              padding: '9px 12px',
              background: activeTab === 'local' ? '#D0FF14' : '#FAFAFA',
              border: '2px solid #0F0F0F',
              boxShadow: activeTab === 'local' ? '2px 2px 0px #0F0F0F' : 'none',
              color: '#0F0F0F',
              fontSize: '0.74rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.1s ease'
            }}
          >
            <Folder size={14} /> LOCAL DIRECTORY
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("zip")}
            style={{
              padding: '9px 12px',
              background: activeTab === 'zip' ? '#D0FF14' : '#FAFAFA',
              border: '2px solid #0F0F0F',
              boxShadow: activeTab === 'zip' ? '2px 2px 0px #0F0F0F' : 'none',
              color: '#0F0F0F',
              fontSize: '0.74rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.1s ease'
            }}
          >
            <UploadCloud size={14} /> UPLOAD VAULT (.ZIP)
          </button>
        </div>

        {/* Scrollable Main Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>

          {activeTab === "zip" ? (
            /* ─── TAB 2: ZIP ARCHIVE UPLOAD ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleZipFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => zipInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed #0F0F0F' : zipFile ? '2px solid #0F0F0F' : '2px dashed #71717A',
                  background: isDragging ? '#E4FF66' : zipFile ? '#F4F4F5' : '#FAFAFA',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  background: zipFile ? '#D0FF14' : '#FFFFFF',
                  border: '2px solid #0F0F0F',
                  boxShadow: '2px 2px 0px #0F0F0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileArchive size={22} color="#0F0F0F" />
                </div>

                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#0F0F0F' }}>
                    {zipFile ? zipFile.name : "DRAG & DROP VAULT (.ZIP) HERE"}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#52525B', fontFamily: "'JetBrains Mono', monospace", marginTop: '4px' }}>
                    {zipFile
                      ? `${(zipFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace file`
                      : "or click to browse your computer for an exported Obsidian archive"}
                  </div>
                </div>
              </div>

              {/* Status / Error Alerts */}
              {uploadError && (
                <div style={{
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '2px solid #DC2626',
                  color: '#DC2626',
                  fontSize: '0.74rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div style={{
                  padding: '12px 14px',
                  background: '#F0FDF4',
                  border: '2px solid #16A34A',
                  color: '#15803D',
                  fontSize: '0.76rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <div>
                    <div>SUCCESS: Vault extracted & mounted!</div>
                    <div style={{ fontSize: '0.68rem', color: '#166534', marginTop: '2px' }}>
                      {uploadSuccess.note_count} markdown notes indexed into RAG vector engine.
                    </div>
                  </div>
                </div>
              )}

              {isUploading && (
                <div style={{
                  padding: '12px 14px',
                  background: '#F4F4F5',
                  border: '2px solid #0F0F0F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <RefreshCw size={16} className="animate-spin" color="#0F0F0F" />
                  <div style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#0F0F0F' }}>
                    {uploadProgressMsg}
                  </div>
                </div>
              )}

              {/* Export Guide */}
              <div style={{
                padding: '12px 14px',
                background: '#FAFAFA',
                border: '1px solid #E4E4E7',
                fontSize: '0.72rem',
                fontFamily: "'JetBrains Mono', monospace",
                color: '#52525B',
                lineHeight: '1.5'
              }}>
                <div style={{ fontWeight: 800, color: '#0F0F0F', marginBottom: '4px' }}>
                  💡 HOW TO COMPRESS YOUR VAULT:
                </div>
                <div>1. Open your computer's file explorer.</div>
                <div>2. Right-click your Obsidian vault folder → <strong>Compress / Send to ZIP</strong>.</div>
                <div>3. Drop the <code>.zip</code> file above. SynapseOS safely isolates and indexes it.</div>
              </div>
            </div>
          ) : (
            /* ─── TAB 1: LOCAL DIRECTORY BROWSER ─── */
            <>
              {/* Native OS Folder Picker Button */}
              <button
                type="button"
                onClick={handleOpenNativeDirectoryPicker}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#FAFAFA',
                  border: '2px dashed #0F0F0F',
                  borderRadius: '0px',
                  color: '#0F0F0F',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  transition: 'background 0.1s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#D0FF14'}
                onMouseOut={e => e.currentTarget.style.background = '#FAFAFA'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FolderOpen size={18} color="#0F0F0F" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F0F0F', fontFamily: "'JetBrains Mono', monospace" }}>
                      OPEN SYSTEM FOLDER CHOOSER...
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
                      Select directory via native operating system dialog
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} color="#0F0F0F" />
              </button>

              {/* Quick Shortcuts */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.68rem', fontFamily: "'JetBrains Mono', monospace", color: '#71717A', marginBottom: '6px', fontWeight: 700 }}>
                  QUICK SHORTCUTS:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {browseShortcuts.map((sc) => (
                    <button
                      key={sc.path}
                      type="button"
                      onClick={() => navigateToFolder(sc.path)}
                      style={{
                        padding: '4px 10px',
                        background: currentBrowsePath === sc.path ? '#D0FF14' : '#FFFFFF',
                        border: '1px solid #0F0F0F',
                        boxShadow: '1px 1px 0px #0F0F0F',
                        borderRadius: '0px',
                        color: '#0F0F0F',
                        fontSize: '0.72rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Folder size={12} color="#0F0F0F" />
                      {sc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Folder Navigator Box */}
              <div style={{
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                borderRadius: '0px',
                overflow: 'hidden'
              }}>
                {/* Explorer Toolbar / Breadcrumbs */}
                <div style={{
                  padding: '8px 12px',
                  background: '#F4F4F5',
                  borderBottom: '2px solid #0F0F0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexWrap: 'wrap',
                    fontSize: '0.74rem',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    <button
                      type="button"
                      onClick={() => navigateToFolder("/")}
                      style={{ background: 'none', border: 'none', color: '#0F0F0F', cursor: 'pointer', padding: '2px 4px', fontWeight: 800 }}
                    >
                      /
                    </button>
                    {breadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={crumb.path}>
                        <ChevronRight size={12} color="#0F0F0F" />
                        <button
                          type="button"
                          onClick={() => navigateToFolder(crumb.path)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0F0F0F',
                            fontWeight: idx === breadcrumbs.length - 1 ? 800 : 500,
                            cursor: 'pointer',
                            padding: '2px 4px'
                          }}
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  {browseParentPath && (
                    <button
                      type="button"
                      onClick={() => navigateToFolder(browseParentPath)}
                      title="Go to parent directory"
                      style={{
                        padding: '3px 8px',
                        background: '#FFFFFF',
                        border: '1px solid #0F0F0F',
                        borderRadius: '0px',
                        color: '#0F0F0F',
                        fontSize: '0.68rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <ChevronUp size={12} /> UP
                    </button>
                  )}
                </div>

                {/* Folder List Content */}
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '6px'
                }}>
                  {isBrowsingLoading ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#71717A',
                      fontSize: '0.74rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <RefreshCw size={14} className="animate-spin" /> Scanning directory structure...
                    </div>
                  ) : browseDirectories.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#71717A', fontSize: '0.74rem', fontFamily: "'JetBrains Mono', monospace" }}>
                      No subdirectories found in this folder.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {browseDirectories.map((dir) => {
                        const isSelected = vaultPath === dir.path;
                        return (
                          <div
                            key={dir.path}
                            onClick={() => navigateToFolder(dir.path)}
                            style={{
                              padding: '6px 10px',
                              background: isSelected ? '#D0FF14' : '#FAFAFA',
                              border: '1px solid #0F0F0F',
                              borderRadius: '0px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Folder size={14} color="#0F0F0F" />
                              <span style={{ fontSize: '0.78rem', color: '#0F0F0F', fontWeight: dir.is_vault ? 800 : 500 }}>
                                {dir.name}
                              </span>
                            </div>

                            {dir.is_vault && (
                              <span style={{
                                fontSize: '0.65rem',
                                fontFamily: "'JetBrains Mono', monospace",
                                background: '#FFFFFF',
                                border: '1px solid #0F0F0F',
                                color: '#0F0F0F',
                                padding: '1px 6px',
                                fontWeight: 800
                              }}>
                                ★ {dir.note_count} NOTES
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Current Folder Selection Footer */}
                <div style={{
                  padding: '8px 12px',
                  background: '#F4F4F5',
                  borderTop: '2px solid #0F0F0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#0F0F0F', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    Active: <span style={{ background: '#E4FF66', padding: '1px 4px', border: '1px solid #0F0F0F' }}>{currentBrowsePath}</span>
                    {currentFolderNotes > 0 && ` (${currentFolderNotes} notes found)`}
                  </div>

                  <button
                    type="button"
                    onClick={() => setVaultPath(currentBrowsePath)}
                    style={{
                      padding: '4px 10px',
                      background: vaultPath === currentBrowsePath ? '#D0FF14' : '#FFFFFF',
                      border: '1px solid #0F0F0F',
                      boxShadow: '1px 1px 0px #0F0F0F',
                      borderRadius: '0px',
                      color: '#0F0F0F',
                      fontSize: '0.7rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {vaultPath === currentBrowsePath ? <Check size={12} /> : null}
                    {vaultPath === currentBrowsePath ? "SELECTED" : "SELECT FOLDER"}
                  </button>
                </div>
              </div>

              {/* Validation Feedback Banner */}
              <div style={{ marginTop: '10px', minHeight: '20px' }}>
                {isValidating && (
                  <span style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
                    Verifying directory path...
                  </span>
                )}

                {!isValidating && validationResult && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: validationResult.valid ? '#15803D' : '#DC2626',
                    fontWeight: 700
                  }}>
                    {validationResult.valid ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span>{validationResult.message}</span>
                  </div>
                )}
              </div>

              {/* Advanced Manual Entry Toggle */}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#52525B',
                    fontSize: '0.7rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    fontWeight: 700
                  }}
                >
                  {showManualInput ? "Hide manual path input" : "⚙ Manual path input"}
                </button>

                {showManualInput && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      value={vaultPath}
                      onChange={(e) => setVaultPath(e.target.value)}
                      placeholder="/vault or /home/username/notes"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#FFFFFF',
                        border: '2px solid #0F0F0F',
                        borderRadius: '0px',
                        color: '#0F0F0F',
                        fontSize: '0.78rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '2px solid #0F0F0F' }}>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isIndexing || isUploading}
            style={{
              flex: 1,
              padding: '12px',
              background: '#F4F4F5',
              border: '2px solid #0F0F0F',
              borderRadius: '0px',
              color: '#0F0F0F',
              fontSize: '0.8rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            SKIP FOR NOW
          </button>

          {activeTab === 'zip' ? (
            <button
              type="button"
              onClick={handleUploadZip}
              disabled={!zipFile || isUploading || !!uploadSuccess}
              style={{
                flex: 2,
                padding: '12px',
                background: !zipFile ? '#E4E4E7' : '#D0FF14',
                border: '2px solid #0F0F0F',
                boxShadow: !zipFile ? 'none' : '3px 3px 0px #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                fontSize: '0.82rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 900,
                cursor: !zipFile || isUploading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.1s'
              }}
              onMouseOver={e => {
                if (zipFile && !isUploading && !uploadSuccess) {
                  e.currentTarget.style.background = '#E4FF66';
                  e.currentTarget.style.transform = 'translate(-1px, -1px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
                }
              }}
              onMouseOut={e => {
                if (zipFile && !isUploading && !uploadSuccess) {
                  e.currentTarget.style.background = '#D0FF14';
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
                }
              }}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  EXTRACTING & INDEXING...
                </>
              ) : uploadSuccess ? (
                <>
                  <Check size={16} />
                  VAULT READY ({uploadSuccess.note_count} NOTES)
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  UPLOAD & EXTRACT VAULT
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmAndIndex}
              disabled={isIndexing || indexingDone}
              style={{
                flex: 2,
                padding: '12px',
                background: '#D0FF14',
                border: '2px solid #0F0F0F',
                boxShadow: '3px 3px 0px #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                fontSize: '0.82rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 900,
                cursor: isIndexing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.1s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#E4FF66';
                e.currentTarget.style.transform = 'translate(-1px, -1px)';
                e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#D0FF14';
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
              }}
            >
              {isIndexing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  INDEXING VAULT...
                </>
              ) : indexingDone ? (
                <>
                  <Check size={16} />
                  VAULT INITIALIZED!
                </>
              ) : (
                <>
                  CONNECT & INITIALIZE VAULT
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
