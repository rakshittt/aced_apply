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
} from 'lucide-react';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Error Loading Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/')} className="w-full mt-4">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Analysis
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Analysis Results
              </h1>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>{results.jd.title}</span>
                {results.jd.company && (
                  <>
                    <span>•</span>
                    <span>{results.jd.company}</span>
                  </>
                )}
                {results.ttfi && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      TTFI: {(results.ttfi / 1000).toFixed(1)}s
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Overall Fit Badge */}
            {results.fitMap && (
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  {getFitIcon(results.fitMap.overallFit)}
                  <Badge variant={getFitBadgeVariant(results.fitMap.overallFit)} className="text-lg px-4 py-1">
                    {results.fitMap.overallFit}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  Confidence: {(results.fitMap.confidence * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="fit-map" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="fit-map">Fit Map</TabsTrigger>
            <TabsTrigger value="advisor">Change Advisor</TabsTrigger>
            <TabsTrigger value="lens">Interview Lens</TabsTrigger>
            <TabsTrigger value="prep">7-Day Prep</TabsTrigger>
          </TabsList>

          {/* Fit Map Tab */}
          <TabsContent value="fit-map" className="space-y-6">
            {results.fitMap && (
              <>
                {/* Overlaps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Skills That Match ({results.fitMap.overlap.length})
                    </CardTitle>
                    <CardDescription>
                      Skills and qualifications you have that align with the job
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.fitMap.overlap.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-green-900">{item.skill}</h4>
                            <Badge variant="outline" className="text-xs">
                              {(item.confidence * 100).toFixed(0)}% match
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-medium text-slate-600 mb-1">In Job Description:</p>
                              <p className="text-slate-700">{item.jdSpan.text}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-600 mb-1">In Your Resume:</p>
                              <p className="text-slate-700">{item.resumeSpan.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Gaps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
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
                          className={`p-4 rounded-lg border ${
                            item.severity === 'HIGH'
                              ? 'bg-red-50 border-red-200'
                              : item.severity === 'MEDIUM'
                              ? 'bg-orange-50 border-orange-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-1">{item.skill}</h4>
                              <p className="text-sm text-slate-700">{item.jdSpan.text}</p>
                            </div>
                            <Badge variant={item.severity === 'HIGH' ? 'destructive' : 'secondary'}>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Under-Evidenced Skills ({results.fitMap.underEvidenced.length})
                      </CardTitle>
                      <CardDescription>
                        Skills mentioned but lacking metrics or concrete examples
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {results.fitMap.underEvidenced.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <h4 className="font-semibold text-orange-900 mb-1">{item.skill}</h4>
                            <p className="text-sm text-slate-700">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Change Advisor Tab */}
          <TabsContent value="advisor" className="space-y-6">
            {results.changeAdvisor && (
              <>
                {/* ATS Warnings */}
                {results.changeAdvisor.atsWarnings.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>ATS Warnings Found:</strong> Your resume has {results.changeAdvisor.atsWarnings.length} formatting issues that may cause problems with Applicant Tracking Systems.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Suggestions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                      Resume Improvement Suggestions ({results.changeAdvisor.suggestions.length})
                    </CardTitle>
                    <CardDescription>
                      Precise, evidence-based recommendations to strengthen your resume
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {results.changeAdvisor.suggestions.map((suggestion: any) => (
                      <div
                        key={suggestion.id}
                        className="border border-slate-200 rounded-lg overflow-hidden"
                      >
                        {/* Header */}
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{suggestion.targetSection}</Badge>
                              {suggestion.keywordMirror && (
                                <Badge variant="secondary" className="text-xs">ATS Keyword</Badge>
                              )}
                              <span className="text-xs text-slate-600">
                                {(suggestion.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(suggestion.suggestedBullet, suggestion.id)}
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
                        <div className="p-4">
                          <div className="space-y-3">
                            {/* Current Bullet */}
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <div className="flex items-start gap-2">
                                <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-red-900 mb-1">Current:</p>
                                  <p className="text-sm text-slate-700">{suggestion.currentBullet}</p>
                                </div>
                              </div>
                            </div>

                            {/* Suggested Bullet */}
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-green-900 mb-1">Suggested:</p>
                                  <p className="text-sm text-slate-700 font-medium">{suggestion.suggestedBullet}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Reason & Prompts */}
                          <div className="mt-4 space-y-2">
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <p className="text-xs font-medium text-blue-900 mb-1">Why this change:</p>
                              <p className="text-sm text-slate-700">{suggestion.reason}</p>
                            </div>

                            {suggestion.requiredMetric && (
                              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                <p className="text-xs font-medium text-purple-900 mb-1">Add this metric:</p>
                                <p className="text-sm text-slate-700">{suggestion.requiredMetric}</p>
                              </div>
                            )}

                            {suggestion.evidenceToAttach && (
                              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                <p className="text-xs font-medium text-amber-900 mb-1">Evidence to include:</p>
                                <p className="text-sm text-slate-700">{suggestion.evidenceToAttach}</p>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        ATS Formatting Issues
                      </CardTitle>
                      <CardDescription>
                        These formatting issues may prevent your resume from being parsed correctly
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {results.changeAdvisor.atsWarnings.map((warning: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded border ${
                              warning.severity === 'HIGH'
                                ? 'bg-red-50 border-red-200'
                                : warning.severity === 'MEDIUM'
                                ? 'bg-orange-50 border-orange-200'
                                : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <Badge
                                variant={warning.severity === 'HIGH' ? 'destructive' : 'secondary'}
                                className="mt-0.5"
                              >
                                {warning.severity}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{warning.type}</p>
                                <p className="text-xs text-slate-600 mt-1">{warning.description}</p>
                                <p className="text-xs text-slate-500 mt-1">Location: {warning.location}</p>
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

          {/* Interview Lens Tab */}
          <TabsContent value="lens" className="space-y-6">
            {results.lens && (
              <>
                {/* Competencies */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-indigo-600" />
                      What Interviewers Will Measure
                    </CardTitle>
                    <CardDescription>
                      Key competencies they'll evaluate based on the job description
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {results.lens.competencies.map((comp: any, idx: number) => (
                        <div key={idx} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                          <h4 className="font-semibold text-indigo-900 mb-2">{comp.name}</h4>
                          <p className="text-sm text-slate-700 mb-3">{comp.description}</p>
                          <div className="bg-white rounded p-2 border border-indigo-100">
                            <p className="text-xs font-medium text-indigo-900 mb-1">What good looks like:</p>
                            <p className="text-xs text-slate-600">{comp.whatGoodLooksLike}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Interview Formats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-600" />
                      Likely Interview Stages
                    </CardTitle>
                    <CardDescription>
                      Expected interview format based on role and seniority
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.lens.likelyFormats.map((format: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{format.stage}</p>
                            <p className="text-sm text-slate-600">{format.format}</p>
                          </div>
                          {format.duration && (
                            <Badge variant="outline">{format.duration}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Company Behavior Cues */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Company Culture Signals
                    </CardTitle>
                    <CardDescription>
                      Behavior expectations inferred from job description language
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {results.lens.behaviorCues.map((cue: any, idx: number) => (
                        <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-semibold text-green-900 mb-2">{cue.cue}</h4>
                          <p className="text-sm text-slate-700 mb-3">{cue.implication}</p>
                          <div className="bg-white rounded p-2 border border-green-100">
                            <p className="text-xs font-medium text-green-900 mb-1">Evidence from JD:</p>
                            <div className="flex flex-wrap gap-1">
                              {cue.jdPhrases.map((phrase: string, pIdx: number) => (
                                <Badge key={pIdx} variant="outline" className="text-xs">
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
              </>
            )}
          </TabsContent>

          {/* 7-Day Prep Kit Tab */}
          <TabsContent value="prep" className="space-y-6">
            {results.prepKit && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    7-Day Preparation Plan
                  </CardTitle>
                  <CardDescription>
                    Targeted prep tasks mapped to your top skill gaps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.prepKit.days.map((day: any) => (
                      <Accordion key={day.dayNumber} type="single" collapsible>
                        <AccordionItem value={`day-${day.dayNumber}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-4 w-full">
                              <div className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                                {day.dayNumber}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-semibold text-slate-900">Day {day.dayNumber}: {day.gapRef}</p>
                                <p className="text-sm text-slate-600">{day.timeboxMin} minutes • {day.expectedArtifact}</p>
                              </div>
                              {day.completed && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-4 space-y-4">
                              {/* Inputs */}
                              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <p className="text-xs font-medium text-blue-900 mb-2">📚 What you need:</p>
                                <p className="text-sm text-slate-700">{day.inputs}</p>
                              </div>

                              {/* Practice Task */}
                              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                <p className="text-xs font-medium text-purple-900 mb-2">🎯 Practice Task:</p>
                                <p className="text-sm text-slate-700">{day.practiceTask}</p>
                              </div>

                              {/* Rubric */}
                              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                                <p className="text-xs font-medium text-slate-900 mb-2">📊 Scoring Rubric:</p>
                                <div className="space-y-2 text-sm">
                                  <div className="flex gap-2">
                                    <Badge variant="destructive">1</Badge>
                                    <p className="text-slate-700">{day.rubric.level1}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge variant="secondary">2</Badge>
                                    <p className="text-slate-700">{day.rubric.level2}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge variant="default">3</Badge>
                                    <p className="text-slate-700">{day.rubric.level3}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge className="bg-green-600">4</Badge>
                                    <p className="text-slate-700">{day.rubric.level4}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Company Behavior Context */}
                              {day.companyBehaviorRef && (
                                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                  <p className="text-xs font-medium text-amber-900 mb-1">💼 Company Context:</p>
                                  <p className="text-sm text-slate-700">{day.companyBehaviorRef}</p>
                                </div>
                              )}

                              {/* Expected Artifact */}
                              <div className="bg-green-50 border border-green-200 rounded p-3">
                                <p className="text-xs font-medium text-green-900 mb-1">✅ Deliverable:</p>
                                <p className="text-sm text-slate-700">{day.expectedArtifact}</p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
