'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Target,
  Lightbulb,
  Calendar,
  ArrowLeft,
  Copy,
  Check,
  X,
  Eye,
  Clock,
  Building2,
  Briefcase,
  Users,
  Code,
  Star,
  ChevronRight,
  Share2,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface ResultsPageProps {
  params: Promise<{
    runId: string;
  }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const { runId } = use(params);
  const router = useRouter();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [runId]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/results/${runId}`);
      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 401) {
          setError('Please sign in to view this analysis');
          setTimeout(() => router.push('/auth/signin?callbackUrl=' + encodeURIComponent(`/results/${runId}`)), 2000);
          return;
        }
        if (response.status === 403) {
          setError('Access denied: This analysis belongs to another user');
          return;
        }
        if (response.status === 404) {
          setError('Analysis not found');
          return;
        }
        if (response.status === 410) {
          setError('This analysis has expired (30-day retention policy)');
          return;
        }

        throw new Error(data.error || 'Failed to fetch results');
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-lg font-medium text-muted-foreground animate-pulse">Analyzing your fit...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Error Loading Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getFitBadgeVariant = (fit: string) => {
    switch (fit) {
      case 'FIT':
        return 'default';
      case 'BORDERLINE':
        return 'secondary';
      case 'NOT_FIT':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getFitIcon = (fit: string) => {
    switch (fit) {
      case 'FIT':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'BORDERLINE':
        return <AlertTriangle className="h-5 w-5" />;
      case 'NOT_FIT':
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md mb-8">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-normal">
                  Analysis Results
                </Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {results.jd.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {results.jd.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {results.jd.company}
                  </span>
                )}
                {results.ttfi && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Generated in {(results.ttfi / 1000).toFixed(1)}s
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Overall Fit Badge */}
            {results.fitMap && (
              <Card className="border-border/50 shadow-sm bg-secondary/10">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Overall Fit</p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-2xl font-bold">{results.fitMap.overallFit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(results.fitMap.confidence * 100).toFixed(0)}% Confidence
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${results.fitMap.overallFit === 'FIT' ? 'bg-green-100 text-green-600' :
                      results.fitMap.overallFit === 'BORDERLINE' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                    }`}>
                    {getFitIcon(results.fitMap.overallFit)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="fit-map" className="space-y-8">
          <TabsList className="w-full justify-start border-b border-border/40 bg-transparent p-0 h-auto rounded-none">
            <TabsTrigger
              value="fit-map"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Fit Map
            </TabsTrigger>
            <TabsTrigger
              value="advisor"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Change Advisor
            </TabsTrigger>
            <TabsTrigger
              value="recruiter"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Recruiter Insights
            </TabsTrigger>
            <TabsTrigger
              value="lens"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Interview Lens
            </TabsTrigger>
            <TabsTrigger
              value="prep"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              7-Day Prep
            </TabsTrigger>
          </TabsList>

          {/* Fit Map Tab */}
          <TabsContent value="fit-map" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            {results.fitMap && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Overlaps */}
                <Card className="border-border/50 shadow-sm h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      Skills That Match ({results.fitMap.overlap.length})
                    </CardTitle>
                    <CardDescription>
                      Skills and qualifications you have that align with the job
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.fitMap.overlap.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-green-50/50 border border-green-100 rounded-lg hover:border-green-200 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-green-900">{item.skill}</h4>
                            <Badge variant="outline" className="text-xs bg-white/50">
                              {(item.confidence * 100).toFixed(0)}% match
                            </Badge>
                          </div>
                          <div className="grid gap-2 text-sm">
                            <div className="p-2 bg-white/50 rounded border border-green-100/50">
                              <p className="text-xs font-medium text-muted-foreground mb-1">In Job Description:</p>
                              <p className="text-foreground/80">{item.jdSpan.text}</p>
                            </div>
                            <div className="p-2 bg-white/50 rounded border border-green-100/50">
                              <p className="text-xs font-medium text-muted-foreground mb-1">In Your Resume:</p>
                              <p className="text-foreground/80">{item.resumeSpan.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  {/* Gaps */}
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        Skills to Address ({results.fitMap.gaps.length})
                      </CardTitle>
                      <CardDescription>
                        Required skills not clearly demonstrated in your resume
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {results.fitMap.gaps.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg border transition-all hover:shadow-sm ${item.severity === 'HIGH'
                                ? 'bg-red-50/50 border-red-100 hover:border-red-200'
                                : item.severity === 'MEDIUM'
                                  ? 'bg-orange-50/50 border-orange-100 hover:border-orange-200'
                                  : 'bg-yellow-50/50 border-yellow-100 hover:border-yellow-200'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-semibold text-foreground mb-1">{item.skill}</h4>
                                <p className="text-sm text-muted-foreground">{item.jdSpan.text}</p>
                              </div>
                              <Badge variant={item.severity === 'HIGH' ? 'destructive' : 'secondary'} className="shrink-0">
                                {item.severity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Under-Evidenced */}
                  {results.fitMap.underEvidenced.length > 0 && (
                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-5 w-5" />
                          Under-Evidenced Skills ({results.fitMap.underEvidenced.length})
                        </CardTitle>
                        <CardDescription>
                          Skills mentioned but lacking metrics or concrete examples
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {results.fitMap.underEvidenced.map((item: any, idx: number) => (
                            <div key={idx} className="p-4 bg-orange-50/50 border border-orange-100 rounded-lg hover:border-orange-200 transition-colors">
                              <h4 className="font-semibold text-orange-900 mb-1">{item.skill}</h4>
                              <p className="text-sm text-muted-foreground">{item.reason}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Change Advisor Tab */}
          <TabsContent value="advisor" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            {results.changeAdvisor && (
              <>
                {/* ATS Warnings */}
                {results.changeAdvisor.atsWarnings.length > 0 && (
                  <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>ATS Warnings Found:</strong> Your resume has {results.changeAdvisor.atsWarnings.length} formatting issues that may cause problems with Applicant Tracking Systems.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Suggestions */}
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Lightbulb className="h-5 w-5" />
                      Resume Improvement Suggestions ({results.changeAdvisor.suggestions.length})
                    </CardTitle>
                    <CardDescription>
                      Precise, evidence-based recommendations to strengthen your resume
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {results.changeAdvisor.suggestions.map((suggestion: any) => (
                      <div
                        key={suggestion.id}
                        className="border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        {/* Header */}
                        <div className="bg-secondary/20 px-4 py-3 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-background">{suggestion.targetSection}</Badge>
                              {suggestion.keywordMirror && (
                                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20">ATS Keyword</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {(suggestion.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(suggestion.suggestedBullet, suggestion.id)}
                                className="h-8"
                              >
                                {copiedId === suggestion.id ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Diff View */}
                        <div className="p-6 space-y-6">
                          <div className="grid gap-4 md:grid-cols-2">
                            {/* Current Bullet */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current</p>
                              <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 h-full">
                                <div className="flex items-start gap-3">
                                  <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-foreground/80 leading-relaxed">{suggestion.currentBullet}</p>
                                </div>
                              </div>
                            </div>

                            {/* Suggested Bullet */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggested</p>
                              <div className="bg-green-50/50 border border-green-100 rounded-lg p-4 h-full">
                                <div className="flex items-start gap-3">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm font-medium text-foreground leading-relaxed">{suggestion.suggestedBullet}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Reason & Prompts */}
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                              <p className="text-xs font-medium text-blue-700 mb-2 uppercase tracking-wider">Why this change</p>
                              <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                            </div>

                            {suggestion.requiredMetric && (
                              <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-4">
                                <p className="text-xs font-medium text-purple-700 mb-2 uppercase tracking-wider">Add this metric</p>
                                <p className="text-sm text-muted-foreground">{suggestion.requiredMetric}</p>
                              </div>
                            )}

                            {suggestion.evidenceToAttach && (
                              <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
                                <p className="text-xs font-medium text-amber-700 mb-2 uppercase tracking-wider">Evidence to include</p>
                                <p className="text-sm text-muted-foreground">{suggestion.evidenceToAttach}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* ATS Warnings Detail */}
                {results.changeAdvisor.atsWarnings.length > 0 && (
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                        ATS Formatting Issues
                      </CardTitle>
                      <CardDescription>
                        These formatting issues may prevent your resume from being parsed correctly
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {results.changeAdvisor.atsWarnings.map((warning: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg border ${warning.severity === 'HIGH'
                                ? 'bg-red-50/50 border-red-100'
                                : warning.severity === 'MEDIUM'
                                  ? 'bg-orange-50/50 border-orange-100'
                                  : 'bg-yellow-50/50 border-yellow-100'
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <Badge
                                variant={warning.severity === 'HIGH' ? 'destructive' : 'secondary'}
                                className="mt-0.5 shrink-0"
                              >
                                {warning.severity}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium text-foreground">{warning.type}</p>
                                <p className="text-xs text-muted-foreground mt-1">{warning.description}</p>
                                <p className="text-xs text-muted-foreground mt-1 font-mono">Location: {warning.location}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Recruiter Insights Tab */}
          <TabsContent value="recruiter" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            {results.companyResearch && results.recruiterPriority && (
              <>
                {/* Company Context */}
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600">
                      <Building2 className="h-5 w-5" />
                      Company Context
                    </CardTitle>
                    <CardDescription>
                      Intelligence extracted from the job description
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Company Name & Size */}
                      <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">Company Profile</h4>
                        </div>
                        <div className="space-y-2">
                          {results.companyResearch.companyName && (
                            <p className="text-sm text-foreground">
                              <span className="font-medium text-muted-foreground">Name:</span> {results.companyResearch.companyName}
                            </p>
                          )}
                          <p className="text-sm text-foreground">
                            <span className="font-medium text-muted-foreground">Size:</span> {results.companyResearch.companySize}
                          </p>
                          <p className="text-sm text-foreground">
                            <span className="font-medium text-muted-foreground">Industry:</span> {results.companyResearch.industry}
                          </p>
                        </div>
                      </div>

                      {/* Seniority Level */}
                      <div className="p-6 bg-purple-50/30 border border-purple-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <Briefcase className="h-4 w-4 text-purple-600" />
                          <h4 className="font-semibold text-purple-900">Expected Seniority</h4>
                        </div>
                        <p className="text-3xl font-bold text-purple-700 tracking-tight">
                          {results.companyResearch.seniority}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Based on JD language and requirements
                        </p>
                      </div>

                      {/* Tech Stack */}
                      {results.companyResearch.techStack.length > 0 && (
                        <div className="p-6 bg-green-50/30 border border-green-100 rounded-xl">
                          <div className="flex items-center gap-2 mb-4">
                            <Code className="h-4 w-4 text-green-600" />
                            <h4 className="font-semibold text-green-900">Tech Stack</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {results.companyResearch.techStack.map((tech: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="bg-white/50">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Culture Signals */}
                      <div className="p-6 bg-amber-50/30 border border-amber-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="h-4 w-4 text-amber-600" />
                          <h4 className="font-semibold text-amber-900">Culture Signals</h4>
                        </div>
                        <div className="space-y-4">
                          {(results.companyResearch.cultureSignals as any[]).map((signal: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              <p className="font-medium text-foreground mb-1">{signal.signal}</p>
                              <div className="flex flex-wrap gap-1">
                                {signal.evidence.map((ev: string, evIdx: number) => (
                                  <Badge key={evIdx} variant="outline" className="text-xs text-muted-foreground bg-white/50">
                                    "{ev}"
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="mt-6 p-4 bg-secondary/20 border border-border/50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Analysis Reasoning</p>
                      <p className="text-sm text-foreground/80">{results.companyResearch.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Recruiter Priorities */}
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-600">
                      <Star className="h-5 w-5" />
                      What Recruiters Are Looking For
                    </CardTitle>
                    <CardDescription>
                      Priority classification based on JD language patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Requirements by Priority */}
                    {['CRITICAL', 'IMPORTANT', 'NICE_TO_HAVE'].map((priority) => {
                      const reqs = (results.recruiterPriority.requirements as any[]).filter(
                        (r: any) => r.priority === priority
                      );
                      if (reqs.length === 0) return null;

                      const bgColor =
                        priority === 'CRITICAL'
                          ? 'bg-red-50/30 border-red-100'
                          : priority === 'IMPORTANT'
                            ? 'bg-orange-50/30 border-orange-100'
                            : 'bg-yellow-50/30 border-yellow-100';

                      const badgeVariant =
                        priority === 'CRITICAL'
                          ? 'destructive'
                          : priority === 'IMPORTANT'
                            ? 'default'
                            : 'secondary';

                      return (
                        <div key={priority}>
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant={badgeVariant as any}>
                              {priority.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">({reqs.length} requirements)</span>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            {reqs.map((req: any, idx: number) => (
                              <div key={idx} className={`p-4 rounded-xl border ${bgColor} h-full`}>
                                <div className="flex items-start justify-between mb-3">
                                  <p className="font-medium text-foreground flex-1">{req.requirement}</p>
                                  <Badge variant="outline" className="text-xs bg-white/50 ml-2">
                                    {req.category.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <div className="bg-white/50 rounded-lg p-3 border border-border/20">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Evidence from JD:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {req.jdEvidence.map((ev: string, evIdx: number) => (
                                      <Badge key={evIdx} variant="outline" className="text-xs bg-white">
                                        "{ev}"
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <Separator className="my-6" />

                    {/* ATS Keywords */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="p-6 bg-red-50/30 border border-red-100 rounded-xl">
                        <h4 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Must-Have Keywords
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {results.recruiterPriority.mustHaveKeywords.map((kw: string, idx: number) => (
                            <Badge key={idx} variant="destructive" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          These keywords should appear in your resume for ATS screening
                        </p>
                      </div>

                      <div className="p-6 bg-green-50/30 border border-green-100 rounded-xl">
                        <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Nice-to-Have Keywords
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {results.recruiterPriority.niceToHaveKeywords.map((kw: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-green-100 text-green-800 hover:bg-green-200">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          These boost your profile but aren't deal-breakers
                        </p>
                      </div>
                    </div>

                    {/* Overall Strategy */}
                    <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-xl">
                      <h4 className="font-semibold text-blue-900 mb-2">Recruiter's Overall Strategy</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed">{results.recruiterPriority.overallStrategy}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Interview Lens Tab */}
          <TabsContent value="lens" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            {results.lens && (
              <>
                {/* Competencies */}
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-600">
                      <Target className="h-5 w-5" />
                      What Interviewers Will Measure
                    </CardTitle>
                    <CardDescription>
                      Key competencies they'll evaluate based on the job description
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      {results.lens.competencies.map((comp: any, idx: number) => (
                        <div key={idx} className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                          <h4 className="font-semibold text-indigo-900 mb-2">{comp.name}</h4>
                          <p className="text-sm text-foreground/80 mb-4">{comp.description}</p>
                          <div className="bg-white/50 rounded-lg p-3 border border-indigo-100/50">
                            <p className="text-xs font-medium text-indigo-900 mb-1">What good looks like:</p>
                            <p className="text-xs text-muted-foreground">{comp.whatGoodLooksLike}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Interview Formats */}
                  <Card className="border-border/50 shadow-sm h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-600">
                        <Eye className="h-5 w-5" />
                        Likely Interview Stages
                      </CardTitle>
                      <CardDescription>
                        Expected interview format based on role and seniority
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {results.lens.likelyFormats.map((format: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-4 p-4 bg-blue-50/30 border border-blue-100 rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{format.stage}</p>
                              <p className="text-sm text-muted-foreground">{format.format}</p>
                            </div>
                            {format.duration && (
                              <Badge variant="outline" className="bg-white/50">{format.duration}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Company Behavior Cues */}
                  <Card className="border-border/50 shadow-sm h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <TrendingUp className="h-5 w-5" />
                        Company Culture Signals
                      </CardTitle>
                      <CardDescription>
                        Behavior expectations inferred from job description language
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {results.lens.behaviorCues.map((cue: any, idx: number) => (
                          <div key={idx} className="p-4 bg-green-50/30 border border-green-100 rounded-lg">
                            <h4 className="font-semibold text-green-900 mb-2">{cue.cue}</h4>
                            <p className="text-sm text-foreground/80 mb-3">{cue.implication}</p>
                            <div className="bg-white/50 rounded-lg p-2 border border-green-100/50">
                              <p className="text-xs font-medium text-green-900 mb-1">Evidence from JD:</p>
                              <div className="flex flex-wrap gap-1">
                                {cue.jdPhrases.map((phrase: string, pIdx: number) => (
                                  <Badge key={pIdx} variant="outline" className="text-xs bg-white">
                                    "{phrase}"
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* 7-Day Prep Tab */}
          <TabsContent value="prep" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Calendar className="h-5 w-5" />
                  Your 7-Day Preparation Plan
                </CardTitle>
                <CardDescription>
                  A structured daily plan to get you ready for the interview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 bg-primary/5 border border-primary/10 rounded-xl">
                    <p className="text-lg font-medium text-primary mb-2">Focus Area</p>
                    <p className="text-foreground/80">Based on the job description, your preparation should focus on demonstrating <strong>{results.fitMap?.overlap?.[0]?.skill || 'core skills'}</strong> and addressing gaps in <strong>{results.fitMap?.gaps?.[0]?.skill || 'required qualifications'}</strong>.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <Card key={day} className="border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium flex items-center justify-between">
                            Day {day}
                            <Badge variant="outline" className="font-normal">
                              {day === 1 ? 'Research' : day === 2 ? 'Skills' : day === 3 ? 'Stories' : day === 4 ? 'Mock' : day === 5 ? 'Questions' : day === 6 ? 'Logistics' : 'Rest'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {day === 1 && "Deep dive into company products, culture, and recent news."}
                            {day === 2 && "Brush up on technical skills and address identified gaps."}
                            {day === 3 && "Prepare STAR method stories for behavioral questions."}
                            {day === 4 && "Practice mock interviews with a friend or recording yourself."}
                            {day === 5 && "Prepare thoughtful questions to ask your interviewers."}
                            {day === 6 && "Review logistics, dress code, and test your equipment."}
                            {day === 7 && "Light review and rest to ensure you're fresh for the big day."}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
