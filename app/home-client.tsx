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
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, BarChart3, Crown, Zap, RefreshCw, ArrowLeft, Settings, LogOut } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

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

interface HomeClientProps {
  user: UserData;
}

interface SavedResume {
  id: string;
  name: string | null;
  uploadedAt: string;
  isDefault: boolean;
  preview: string;
}

export default function HomeClient({ user }: HomeClientProps) {
  const router = useRouter();

  // Saved resumes state
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [defaultResumeId, setDefaultResumeId] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null); // Currently selected resume for analysis
  const [useSavedResume, setUseSavedResume] = useState(true);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);

  // Upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdInput, setJdInput] = useState<'url' | 'text'>('url');
  const [jdUrl, setJdUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);

  // Fetch saved resumes on mount
  useEffect(() => {
    async function fetchSavedResumes() {
      try {
        const response = await fetch('/api/resume');
        const data = await response.json();

        if (response.ok) {
          setSavedResumes(data.resumes);
          setDefaultResumeId(data.defaultResumeId);

          // Auto-select default resume if available
          if (data.defaultResumeId) {
            setSelectedResumeId(data.defaultResumeId);
            setResumeId(data.defaultResumeId);
          } else if (data.resumes.length > 0) {
            // If no default, select the first resume
            setSelectedResumeId(data.resumes[0].id);
            setResumeId(data.resumes[0].id);
          }

          // If user has saved resumes, default to using saved resume
          if (data.resumes.length > 0) {
            setUseSavedResume(true);
          } else {
            setUseSavedResume(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch saved resumes:', err);
      } finally {
        setIsLoadingResumes(false);
      }
    }

    fetchSavedResumes();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile) return;

    setIsUploading(true);
    setError(null);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          // No Content-Type header needed, browser sets it for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResumeId(data.resumeId);
      setProgress(50);

      // Refresh saved resumes list
      const resumesResponse = await fetch('/api/resume');
      const resumesData = await resumesResponse.json();
      if (resumesResponse.ok) {
        setSavedResumes(resumesData.resumes);
        setDefaultResumeId(resumesData.defaultResumeId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    // Validation
    if (useSavedResume && !selectedResumeId) {
      setError('Please select a resume to analyze.');
      return;
    }

    if (!useSavedResume && !resumeId) {
      setError('Please upload your resume first');
      return;
    }

    if (jdInput === 'url' && !jdUrl) {
      setError('Please enter a job posting URL');
      return;
    }

    if (jdInput === 'text' && !jdText) {
      setError('Please paste the job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(60);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use selected saved resume if enabled, otherwise use newly uploaded resume
          resumeId: useSavedResume ? selectedResumeId : resumeId,
          jdUrl: jdInput === 'url' ? jdUrl : undefined,
          jdText: jdInput === 'text' ? jdText : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setProgress(100);

      // Redirect to results page
      setTimeout(() => {
        router.push(`/results/${data.runId}`);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setProgress(50);
    } finally {
      setIsAnalyzing(false);
    }
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
            <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">
              A
            </div>
            <span className="font-semibold tracking-tight">New Analysis</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Usage Stats Banner */}
        <Card className="border-border/50 bg-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {user.used} / {user.limit} analyses used this month
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.remaining} {user.remaining === 1 ? 'analysis' : 'analyses'} remaining
                    </p>
                  </div>
                </div>
                <Badge variant={user.plan === 'FREE' ? 'secondary' : 'default'}>
                  {user.plan}
                </Badge>
              </div>
              {user.plan === 'FREE' && (
                <Button size="sm" asChild variant="outline">
                  <Link href="/pricing">
                    <Crown className="mr-2 h-3 w-3" />
                    Upgrade
                  </Link>
                </Button>
              )}
            </div>
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-in-out"
                  style={{ width: `${Math.min(user.percentage, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* At Limit Warning */}
        {atLimit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached your monthly limit of {user.limit} analyses.{' '}
              {user.plan === 'FREE' ? (
                <Link href="/pricing" className="underline font-medium hover:text-destructive-foreground/80">
                  Upgrade to Pro
                </Link>
              ) : (
                'Your limit will reset next month.'
              )}{' '}
              for unlimited analyses.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Create New Analysis
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your resume and the job description to get AI-powered insights in seconds.
          </p>
        </div>

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              {progress < 50 && 'Uploading resume...'}
              {progress >= 50 && progress < 60 && 'Resume uploaded!'}
              {progress >= 60 && progress < 100 && 'Analyzing fit...'}
              {progress === 100 && 'Analysis complete!'}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8">
          {/* Resume Selector */}
          {savedResumes.length > 0 && useSavedResume && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Select Resume
                </CardTitle>
                <CardDescription>
                  Choose which resume to use for this job analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="resume-select" className="mb-2 block">
                    Your Saved Resumes ({savedResumes.length})
                  </Label>
                  <Select
                    value={selectedResumeId || undefined}
                    onValueChange={(value: string) => setSelectedResumeId(value)}
                  >
                    <SelectTrigger id="resume-select" className="w-full">
                      <SelectValue placeholder="Select a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedResumes.map((resume) => (
                        <SelectItem key={resume.id} value={resume.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {resume.name || `Resume from ${new Date(resume.uploadedAt).toLocaleDateString()}`}
                            </span>
                            {resume.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedResumeId && (
                  <div className="p-4 bg-secondary/20 border border-border/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">
                          {savedResumes.find(r => r.id === selectedResumeId)?.name || 'Selected Resume'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(savedResumes.find(r => r.id === selectedResumeId)?.uploadedAt || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUseSavedResume(false)}
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Upload New
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 1: Upload Resume */}
          {(!useSavedResume || savedResumes.length === 0) && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Step 1: {savedResumes.length > 0 ? 'Upload New Resume' : 'Upload Your Resume'}
                </CardTitle>
                <CardDescription>
                  Upload your resume in PDF format (max 5MB)
                </CardDescription>
                {savedResumes.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      checked={useSavedResume}
                      onCheckedChange={setUseSavedResume}
                    />
                    <Label className="text-sm cursor-pointer" onClick={() => setUseSavedResume(!useSavedResume)}>
                      Use saved resume instead
                    </Label>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors bg-secondary/5">
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
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                    <span className="text-sm font-medium mb-1">
                      {resumeFile ? resumeFile.name : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-muted-foreground">PDF up to 5MB</span>
                  </label>
                </div>

                {resumeFile && !resumeId && (
                  <Button
                    onClick={handleUploadResume}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Resume
                      </>
                    )}
                  </Button>
                )}

                {resumeId && !useSavedResume && (
                  <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Resume uploaded successfully!</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Job Description */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Step 2: Add Job Description
              </CardTitle>
              <CardDescription>
                Paste the job posting URL or the full job description text
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={jdInput} onValueChange={(v) => setJdInput(v as 'url' | 'text')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="url">Job URL</TabsTrigger>
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jd-url">Job Posting URL</Label>
                    <Input
                      id="jd-url"
                      type="url"
                      placeholder="https://company.com/jobs/123"
                      value={jdUrl}
                      onChange={(e) => setJdUrl(e.target.value)}
                      disabled={isAnalyzing}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll fetch and parse the job description from this URL
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jd-text">Job Description</Label>
                    <Textarea
                      id="jd-text"
                      placeholder="Paste the full job description here..."
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      rows={12}
                      disabled={isAnalyzing}
                      className="font-mono text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include requirements, responsibilities, and qualifications
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={
              (useSavedResume ? !selectedResumeId : !resumeId) ||
              isAnalyzing ||
              isUploading ||
              atLimit
            }
            size="lg"
            className="w-full h-12 text-base shadow-lg shadow-primary/20"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing... (this may take up to 3 minutes)
              </>
            ) : atLimit ? (
              <>
                Limit Reached - {user.plan === 'FREE' ? 'Upgrade to Continue' : 'Wait for Reset'}
              </>
            ) : (
              <>
                {useSavedResume && savedResumes.length > 0 && (
                  <Zap className="mr-2 h-5 w-5" />
                )}
                Analyze Fit ({user.remaining} remaining)
              </>
            )}
          </Button>
        </div>

        {/* Info Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Your data is encrypted and will be automatically deleted after 30 days.</p>
        </div>
      </div>
    </div>
  );
}
