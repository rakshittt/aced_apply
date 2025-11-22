'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdInput, setJdInput] = useState<'url' | 'text'>('url');
  const [jdUrl, setJdUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);

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
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResumeId(data.resumeId);
      setProgress(50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeId) {
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
          resumeId,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
            Ace Your Application
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Get a detailed analysis of how your resume fits the job, plus targeted prep guidance
            in under 3 minutes.
          </p>
        </div>

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-slate-600 mt-2 text-center">
              {progress < 50 && 'Uploading resume...'}
              {progress >= 50 && progress < 60 && 'Resume uploaded!'}
              {progress >= 60 && progress < 100 && 'Analyzing fit...'}
              {progress === 100 && 'Analysis complete!'}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Upload Resume */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Step 1: Upload Your Resume
            </CardTitle>
            <CardDescription>
              Upload your resume in PDF format (max 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
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
                  <Upload className="h-12 w-12 text-slate-400 mb-4" />
                  <span className="text-sm font-medium text-slate-700 mb-1">
                    {resumeFile ? resumeFile.name : 'Click to upload or drag and drop'}
                  </span>
                  <span className="text-xs text-slate-500">PDF up to 5MB</span>
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

              {resumeId && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Resume uploaded successfully!
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Job Description */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Step 2: Add Job Description
            </CardTitle>
            <CardDescription>
              Paste the job posting URL or the full job description text
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={jdInput} onValueChange={(v) => setJdInput(v as 'url' | 'text')}>
              <TabsList className="grid w-full grid-cols-2">
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
                  />
                  <p className="text-xs text-slate-500">
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
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">
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
          disabled={!resumeId || isAnalyzing || isUploading}
          size="lg"
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing... (this may take up to 3 minutes)
            </>
          ) : (
            <>
              Analyze Fit
            </>
          )}
        </Button>

        {/* Info Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Your data is encrypted and will be automatically deleted after 30 days.</p>
        </div>
      </div>
    </div>
  );
}
