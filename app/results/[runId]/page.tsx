'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Share2,
  Download,
  Building2,
  Clock,
  Briefcase,
  Target,
  Lightbulb,
  Calendar,
  BrainCircuit,
  ShieldAlert,
  MessageSquare,
  Trophy
} from 'lucide-react';
import Link from 'next/link';
import { CoachChat } from '@/components/coach/coach-chat';
import { CoachSheet } from '@/components/coach/coach-sheet';

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

  useEffect(() => {
    fetchResults();
  }, [runId]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/results/${runId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to view this analysis');
          setTimeout(() => router.push('/auth/signin?callbackUrl=' + encodeURIComponent(`/results/${runId}`)), 2000);
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
          <p className="text-lg font-medium text-muted-foreground animate-pulse">Generating your Insight Report...</p>
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
              Error Loading Report
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

  const getFitColor = (fit: string) => {
    switch (fit) {
      case 'FIT': return 'text-green-600 bg-green-100';
      case 'BORDERLINE': return 'text-yellow-600 bg-yellow-100';
      case 'NOT_FIT': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md mb-8">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-normal">Insight Report</Badge>
                <span className="text-xs text-muted-foreground">• {new Date().toLocaleDateString()}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{results.jd.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                {results.jd.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {results.jd.company}
                  </span>
                )}
                {results.ttfi && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Generated in {(results.ttfi / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>

            {/* Overall Fit Score */}
            {results.fitMap && (
              <div className="flex items-center gap-4 bg-secondary/10 p-4 rounded-xl border border-border/50">
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alignment Score</p>
                  <p className="text-2xl font-bold">{results.fitMap.overallFit}</p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${getFitColor(results.fitMap.overallFit)}`}>
                  {results.fitMap.overallFit === 'FIT' ? <CheckCircle2 className="h-6 w-6" /> :
                    results.fitMap.overallFit === 'BORDERLINE' ? <AlertTriangle className="h-6 w-6" /> :
                      <XCircle className="h-6 w-6" />}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* The 3 Pillars */}
        <Tabs defaultValue="reality" className="space-y-8">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto p-1 bg-secondary/20 rounded-xl">
            <TabsTrigger value="reality" className="py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ShieldAlert className="h-4 w-4 mr-2" /> The Reality Check
            </TabsTrigger>
            <TabsTrigger value="scoop" className="py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BrainCircuit className="h-4 w-4 mr-2" /> The Inside Scoop
            </TabsTrigger>
            <TabsTrigger value="plan" className="py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Trophy className="h-4 w-4 mr-2" /> The Game Plan
            </TabsTrigger>
          </TabsList>

          {/* PILLAR 1: REALITY CHECK */}
          <TabsContent value="reality" className="space-y-6 animate-in fade-in-50">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Deal Breakers Alert */}
              {results.fitMap?.dealBreakers && results.fitMap.dealBreakers.length > 0 && (
                <div className="md:col-span-2">
                  <Alert variant="destructive" className="border-red-600/50 bg-red-600/10">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertDescription className="ml-2">
                      <span className="font-bold block mb-1">Deal Breakers Detected</span>
                      <ul className="list-disc pl-4 space-y-1">
                        {results.fitMap.dealBreakers.map((breaker: string, idx: number) => (
                          <li key={idx}>{breaker}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Hiring Manager's Memo */}
              {results.fitMap?.hiringManagerMemo && (
                <Card className="md:col-span-2 border-red-200 bg-red-50/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <ShieldAlert className="h-5 w-5" />
                        Hiring Manager's Internal Memo
                      </CardTitle>
                      {results.fitMap.levelAssessment && (
                        <Badge variant={results.fitMap.levelAssessment === 'MATCH' ? 'outline' : 'destructive'} className="uppercase">
                          Level: {results.fitMap.levelAssessment.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      The brutal truth: why they might reject you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-white/80 rounded-lg border border-red-100 font-mono text-sm text-red-900 leading-relaxed shadow-sm">
                      "{results.fitMap.hiringManagerMemo}"
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* BS Detector */}
              {results.changeAdvisor?.fluffWords && results.changeAdvisor.fluffWords.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <AlertTriangle className="h-5 w-5" />
                      BS Detector Results
                    </CardTitle>
                    <CardDescription>
                      "Zero-calorie" words that weaken your profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {results.changeAdvisor.fluffWords.map((word: string, idx: number) => (
                        <Badge key={idx} variant="destructive" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200">
                          {word}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      *Recruiters ignore these words. Replace them with metrics.*
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Critical Fixes */}
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Lightbulb className="h-5 w-5" />
                    Top 3 Critical Fixes
                  </CardTitle>
                  <CardDescription>
                    High-impact changes to improve your fit score.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {results.changeAdvisor?.suggestions.slice(0, 3).map((suggestion: any, idx: number) => (
                    <div key={idx} className="p-4 bg-secondary/10 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{suggestion.targetSection}</Badge>
                        <span className="text-xs text-muted-foreground">Impact: High</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="text-red-500 line-through text-xs">{suggestion.currentBullet}</div>
                        <div className="text-green-600 font-medium">{suggestion.suggestedBullet}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PILLAR 2: INSIDE SCOOP */}
          <TabsContent value="scoop" className="space-y-6 animate-in fade-in-50">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recruiter Priorities */}
              <Card className="md:col-span-2 border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <Target className="h-5 w-5" />
                    What They Are Really Looking For
                  </CardTitle>
                  <CardDescription>
                    Prioritized requirements extracted from the JD.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {['CRITICAL', 'IMPORTANT', 'NICE_TO_HAVE'].map((priority) => {
                      const reqs = results.recruiterPriority?.requirements.filter((r: any) => r.priority === priority) || [];
                      if (reqs.length === 0) return null;
                      return (
                        <div key={priority} className="space-y-3">
                          <Badge variant={priority === 'CRITICAL' ? 'destructive' : priority === 'IMPORTANT' ? 'default' : 'secondary'}>
                            {priority.replace('_', ' ')}
                          </Badge>
                          {reqs.map((req: any, idx: number) => (
                            <div key={idx} className="p-3 bg-secondary/10 rounded-lg text-sm border border-border/50">
                              {req.requirement}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Situational Questions */}
              {results.lens?.situationalQuestions && (
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-600">
                      <MessageSquare className="h-5 w-5" />
                      Situational Questions
                    </CardTitle>
                    <CardDescription>
                      "Tell me about a time..." questions specific to this role.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.lens.situationalQuestions.map((q: string, idx: number) => (
                      <div key={idx} className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg text-sm text-purple-900">
                        "{q}"
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Company Culture */}
              {results.companyResearch && (
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                      <Building2 className="h-5 w-5" />
                      Company Decoder
                    </CardTitle>
                    <CardDescription>
                      Culture signals hidden in the JD.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.companyResearch.cultureSignals.map((signal: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                        <span className="font-medium text-amber-900">{signal.signal}</span>
                        <Badge variant="outline" className="bg-white/50 text-xs text-muted-foreground">
                          "{signal.evidence[0]}"
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* PILLAR 3: GAME PLAN */}
          <TabsContent value="plan" className="space-y-6 animate-in fade-in-50">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* 7-Day Prep Kit */}
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Calendar className="h-5 w-5" />
                    7-Day Prep Grind
                  </CardTitle>
                  <CardDescription>
                    Your daily schedule to crush this interview.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.prepKit?.days.map((day: any) => (
                      <div key={day.dayNumber} className="flex gap-4 p-4 bg-secondary/10 rounded-xl border border-border/50">
                        <div className="flex-shrink-0 w-12 h-12 bg-background rounded-full flex items-center justify-center font-bold border border-border">
                          D{day.dayNumber}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-foreground">{day.gapRef}</h4>
                          <p className="text-sm text-muted-foreground">{day.practiceTask}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{day.timeboxMin} min</Badge>
                            <Badge variant="secondary" className="text-xs">Artifact: {day.expectedArtifact}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Interview-AI Coach */}
              <div className="lg:sticky lg:top-24 h-fit">
                <CoachChat runId={runId} chatId="coach-tab" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Floating Coach Button */}
        <CoachSheet runId={runId} />
      </div>
    </div>
  );
}
