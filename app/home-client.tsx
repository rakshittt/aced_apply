'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle,
  BarChart3, Crown, Zap, ArrowLeft, History, Plus, File
} from 'lucide-react';
import { AnalysisTerminal } from '@/components/analysis/analysis-terminal';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}

interface Resume {
  id: string;
  name: string | null;
  uploadedAt: Date;
  isDefault: boolean;
}

interface PastJD {
  id: string;
  title: string;
  company: string | null;
  rawText: string;
  parsedAt: Date;
}

interface HomeClientProps {
  user: UserData;
  resumes: Resume[];
  pastJDs: PastJD[];
}

export default function HomeClient({ user, resumes, pastJDs }: HomeClientProps) {
  const router = useRouter();

  // State
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(
    resumes.find(r => r.isDefault)?.id || resumes[0]?.id || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [jdSource, setJdSource] = useState<'text' | 'history'>('text');
  const [jdText, setJdText] = useState('');
  const [selectedJdId, setSelectedJdId] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis State
  const [analysisSteps, setAnalysisSteps] = useState<any[]>([]);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | undefined>(undefined);

  // Handle Resume Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');

      // Refresh page to get new resume list (or ideally update local state)
      // For now, we'll just set the ID and let the user proceed, 
      // but in a real app we'd want to update the `resumes` list optimistically.
      setSelectedResumeId(data.resumeId);
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Analysis
  const handleAnalyze = async () => {
    if (!selectedResumeId) {
      setError('Please select or upload a resume');
      return;
    }

    let finalJdText = jdText;
    if (jdSource === 'history') {
      if (!selectedJdId) {
        setError('Please select a job description from history');
        return;
      }
      const selectedJD = pastJDs.find(jd => jd.id === selectedJdId);
      if (selectedJD) {
        finalJdText = selectedJD.rawText;
      }
    }

    if (!finalJdText.trim()) {
      setError('Please provide a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisLogs([]);
    setAnalysisSteps([
      { id: 'init', label: 'Initializing...', status: 'running' },
      { id: 'jd', label: 'Parse Job Description', status: 'pending' },
      { id: 'company', label: 'Company Research', status: 'pending' },
      { id: 'fit', label: 'Analyze Fit', status: 'pending' },
      { id: 'advisor', label: 'Change Advisor', status: 'pending' },
      { id: 'prep', label: 'Generate Prep Kit', status: 'pending' },
    ]);
    setCurrentStepId('init');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          jdText: finalJdText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventMatch = line.match(/^event: (.*)\ndata: (.*)$/);
            if (eventMatch) {
              const event = eventMatch[1];
              const data = JSON.parse(eventMatch[2]);
              handleStreamEvent(event, data);
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setIsAnalyzing(false);
    }
  };

  const handleStreamEvent = (event: string, data: any) => {
    switch (event) {
      case 'START':
        setAnalysisLogs(prev => [...prev, `[SYSTEM] ${data.message}`]);
        updateStep('init', 'completed');
        updateStep('jd', 'running');
        setCurrentStepId('jd');
        break;
      case 'LOG':
        setAnalysisLogs(prev => [...prev, `[INFO] ${data.message}`]);
        break;
      case 'JD_PARSED':
        setAnalysisLogs(prev => [...prev, `[SUCCESS] Parsed JD: ${data.title} at ${data.company}`]);
        updateStep('jd', 'completed', `Found ${data.requirementsCount} requirements`);
        updateStep('company', 'running');
        setCurrentStepId('company');
        break;
      case 'COMPANY_RESEARCHED':
        setAnalysisLogs(prev => [...prev, `[SUCCESS] Researched ${data.company} (${data.industry})`]);
        updateStep('company', 'completed', `${data.industry}`);
        updateStep('fit', 'running');
        setCurrentStepId('fit');
        break;
      case 'FIT_ANALYZED':
        setAnalysisLogs(prev => [...prev, `[SUCCESS] Fit Analysis: ${data.score} (${Math.round(data.confidence * 100)}% confidence)`]);
        updateStep('fit', 'completed', `Score: ${data.score}`);
        updateStep('advisor', 'running');
        setCurrentStepId('advisor');
        break;
      case 'ADVISOR_READY':
        setAnalysisLogs(prev => [...prev, `[SUCCESS] Generated ${data.count} suggestions`]);
        updateStep('advisor', 'completed', `${data.count} suggestions`);
        updateStep('prep', 'running');
        setCurrentStepId('prep');
        break;
      case 'PREP_READY':
        setAnalysisLogs(prev => [...prev, `[SUCCESS] Created 7-Day Prep Plan`]);
        updateStep('prep', 'completed', 'Ready');
        break;
      case 'COMPLETE':
        setAnalysisLogs(prev => [...prev, `[DONE] Analysis complete in ${data.duration}ms`]);
        setCurrentStepId(undefined);
        setTimeout(() => router.push(`/results/${data.runId}`), 1000);
        break;
      case 'ERROR':
        setAnalysisLogs(prev => [...prev, `[ERROR] ${data.message}`]);
        setError(data.message);
        setIsAnalyzing(false);
        break;
    }
  };

  const updateStep = (id: string, status: string, detail?: string) => {
    setAnalysisSteps(prev => prev.map(step =>
      step.id === id ? { ...step, status, detail } : step
    ));
  };

  const atLimit = user.remaining === 0;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">A</div>
            <span className="font-semibold tracking-tight">New Analysis</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Usage Stats Banner */}
        <Card className="border-border/50 bg-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{user.used} / {user.limit} analyses used</p>
                    <p className="text-xs text-muted-foreground">{user.remaining} remaining</p>
                  </div>
                </div>
                <Badge variant={user.plan === 'FREE' ? 'secondary' : 'default'}>{user.plan}</Badge>
              </div>
              {user.plan === 'FREE' && (
                <Button size="sm" asChild variant="outline">
                  <Link href="/pricing"><Crown className="mr-2 h-3 w-3" />Upgrade</Link>
                </Button>
              )}
            </div>
            <div className="mt-4">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500 ease-in-out" style={{ width: `${Math.min(user.percentage, 100)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Start Your Analysis</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select a resume and a job description to get AI-powered insights.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Step 1: Resume Selection */}
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">1</div>
                Select Resume
              </CardTitle>
              <CardDescription>Choose from your portfolio or upload new</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {resumes.map((resume) => (
                    <div
                      key={resume.id}
                      onClick={() => setSelectedResumeId(resume.id)}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                        selectedResumeId === resume.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className={cn("h-5 w-5", selectedResumeId === resume.id ? "text-primary" : "text-muted-foreground")} />
                          <div>
                            <p className="font-medium text-sm">{resume.name || 'Untitled Resume'}</p>
                            <p className="text-xs text-muted-foreground">Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {selectedResumeId === resume.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                    </div>
                  ))}

                  {/* Upload New Option */}
                  <div className="relative">
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading || isAnalyzing}
                    />
                    <label
                      htmlFor="resume-upload"
                      className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-secondary/5 transition-all text-muted-foreground hover:text-foreground"
                    >
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                      <span className="font-medium text-sm">{isUploading ? 'Uploading...' : 'Upload New PDF'}</span>
                    </label>
                  </div>
                  {uploadError && <p className="text-xs text-destructive text-center">{uploadError}</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Step 2: Job Description */}
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</div>
                Add Job Description
              </CardTitle>
              <CardDescription>Paste text or select from history</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <Tabs value={jdSource} onValueChange={(v) => setJdSource(v as 'text' | 'history')} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                  <TabsTrigger value="history">From History</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="flex-1 flex flex-col gap-2">
                  <Textarea
                    placeholder="Paste the full job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="flex-1 min-h-[250px] font-mono text-sm resize-none"
                    disabled={isAnalyzing}
                  />
                  <p className="text-xs text-muted-foreground">Include requirements and responsibilities.</p>
                </TabsContent>

                <TabsContent value="history" className="flex-1 flex flex-col h-full">
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {pastJDs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No past job descriptions found.
                        </div>
                      ) : (
                        pastJDs.map((jd) => (
                          <div
                            key={jd.id}
                            onClick={() => setSelectedJdId(jd.id)}
                            className={cn(
                              "p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                              selectedJdId === jd.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border bg-card"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <History className={cn("h-5 w-5", selectedJdId === jd.id ? "text-primary" : "text-muted-foreground")} />
                                <div>
                                  <p className="font-medium text-sm line-clamp-1">{jd.title}</p>
                                  <p className="text-xs text-muted-foreground">{jd.company || 'Unknown Company'} • {new Date(jd.parsedAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              {selectedJdId === jd.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Analyze Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleAnalyze}
            disabled={!selectedResumeId || (jdSource === 'text' ? !jdText.trim() : !selectedJdId) || isAnalyzing || atLimit}
            size="lg"
            className="w-full max-w-md h-12 text-base shadow-lg shadow-primary/20"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : atLimit ? (
              <>Limit Reached</>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Start Analysis
              </>
            )}
          </Button>
        </div>

        {/* Analysis Terminal */}
        {isAnalyzing && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AnalysisTerminal
              steps={analysisSteps}
              currentStepId={currentStepId}
              logs={analysisLogs}
            />
          </div>
        )}
      </div>
    </div>
  );
}
