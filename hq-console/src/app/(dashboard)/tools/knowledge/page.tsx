"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { RefreshCw, Save, FileText, Folder, Book, Upload, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface RagFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export default function KnowledgeBasePage() {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [ragFiles, setRagFiles] = useState<RagFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kbRes, ragRes] = await Promise.all([
        api.get('/hq/knowledge-base'),
        api.get('/hq/rag-files'),
      ]);
      setContent(kbRes.data.content || '');
      setOriginalContent(kbRes.data.content || '');
      setRagFiles(ragRes.data.files || ragRes.data || []);
    } catch (e) {
      console.error('Failed to fetch knowledge base:', e);
      setError('Failed to connect to HQ Backend. Check NEXT_PUBLIC_HQ_API_URL (or NEXT_PUBLIC_HQ_URL) in your env config.');
      setContent('# Agentrix Knowledge Base\n\nThis is the central knowledge repository for HQ Agents.\n\n## Getting Started\n\nAdd your company documentation, policies, and guidelines here.');
      setOriginalContent(content);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/hq/knowledge-base', { content });
      setOriginalContent(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save knowledge base:', e);
      setError('Failed to save. Check backend connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const text = await file.text();
        await api.post('/hq/rag-files/upload', {
          filename: file.name,
          content: text,
        });
      }
      await fetchData();
    } catch (e) {
      console.error('Failed to upload file:', e);
      setError('Failed to upload file. Check backend connection.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (filename: string) => {
    setDeleting(filename);
    setError(null);
    try {
      await api.delete(`/hq/rag-files/${encodeURIComponent(filename)}`);
      await fetchData();
    } catch (e) {
      console.error('Failed to delete file:', e);
      setError('Failed to delete file.');
    } finally {
      setDeleting(null);
    }
  };

  const hasChanges = content !== originalContent;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: RagFile) => {
    if (file.type === 'directory') return <Folder className="h-4 w-4 text-amber-400" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md':
        return <FileText className="h-4 w-4 text-blue-400" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-400" />;
      case 'txt':
        return <FileText className="h-4 w-4 text-slate-400" />;
      case 'json':
        return <FileText className="h-4 w-4 text-yellow-400" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Book className="h-6 w-6 text-purple-400" />
            Knowledge Base
          </h1>
          <p className="text-slate-400">Central knowledge repository for HQ Agents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-pulse' : ''}`} />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-slate-800/50 border border-slate-700 w-fit">
          <TabsTrigger value="editor" className="data-[state=active]:bg-slate-700">
            <FileText className="h-4 w-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-slate-700">
            <Folder className="h-4 w-4 mr-2" />
            RAG Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 mt-4">
          <Card className="bg-slate-800/50 border-slate-700 h-full flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Knowledge Base Content</CardTitle>
                  <CardDescription>Markdown content injected into Agent system prompts</CardDescription>
                </div>
                {hasChanges && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Unsaved Changes</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="h-[calc(100vh-400px)] min-h-[400px] bg-slate-900/50 border-slate-700 text-slate-200 font-mono text-sm resize-none"
                placeholder="Enter knowledge base content in Markdown format..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">RAG Document Files</CardTitle>
                  <CardDescription>Local files indexed for RAG search ({ragFiles.length} files)</CardDescription>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,.json"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className={`h-4 w-4 mr-2 ${uploading ? 'animate-spin' : ''}`} />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
              {error && (
                <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {ragFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No RAG files found</p>
                  <p className="text-sm mt-2">Upload Markdown, Text, or JSON files to enable RAG search</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {ragFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file)}
                        <div>
                          <p className="text-white text-sm">{file.name}</p>
                          <p className="text-slate-500 text-xs">{file.path}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 text-sm">{formatFileSize(file.size)}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-400 hover:text-red-400"
                          disabled={deleting === file.name}
                          onClick={() => handleDeleteFile(file.name)}
                        >
                          <Trash2 className={`h-4 w-4 ${deleting === file.name ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
