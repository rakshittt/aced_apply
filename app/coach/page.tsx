'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Target, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

const STAGES = [
  { id: 'recruiter', label: 'Recruiter Screen' },
  { id: 'tech_screen', label: 'Technical Screen' },
  { id: 'system_design', label: 'System Design' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'hiring_manager', label: 'Hiring Manager' },
  { id: 'onsite', label: 'Onsite/Loop' },
  { id: 'offer', label: 'Offer & Negotiation' },
];

export default function CoachPage() {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState('recruiter');
  const [coachCard, setCoachCard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCoachCard(selectedStage);
  }, [selectedStage]);

  const fetchCoachCard = async (stage: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/coach/${stage}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch coach card');
      }

      setCoachCard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coach card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Interview Coach
          </h1>
          <p className="text-lg text-slate-600">
            Stage-specific guidance to help you ace every interview round
          </p>
        </div>

        {/* Stage Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Interview Stage</CardTitle>
            <CardDescription>
              Choose the interview stage you're preparing for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STAGES.map((stage) => (
                <Button
                  key={stage.id}
                  variant={selectedStage === stage.id ? 'default' : 'outline'}
                  onClick={() => setSelectedStage(stage.id)}
                  className="h-auto py-3 text-left justify-start"
                >
                  {stage.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Coach Card Content */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-600">
              Loading guidance...
            </CardContent>
          </Card>
        ) : coachCard ? (
          <div className="space-y-6">
            {/* What's Measured */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-600" />
                  What They're Measuring
                </CardTitle>
                <CardDescription>
                  Key evaluation criteria for this stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  {coachCard.whatMeasured.map((criterion: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-slate-700">{criterion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Framework/Scaffold */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Interview Framework
                </CardTitle>
                <CardDescription>
                  Structured approach to excel in this stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                    {coachCard.scaffold}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Failure Modes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Common Mistakes to Avoid
                </CardTitle>
                <CardDescription>
                  Pitfalls that cause candidates to fail this stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {coachCard.failureModes.map((failure: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <span className="flex-shrink-0 text-red-600 font-bold">✗</span>
                      <p className="text-sm text-slate-700">{failure}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Follow-up Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-green-600" />
                  Likely Follow-up Questions
                </CardTitle>
                <CardDescription>
                  Be prepared to answer these
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {coachCard.followUps.map((question: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <span className="flex-shrink-0 text-green-600 font-bold">Q{idx + 1}:</span>
                      <p className="text-sm text-slate-700">{question}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pro Tips */}
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro Tip:</strong> Practice your answers out loud before the interview.
                Record yourself and watch for filler words, pacing, and clarity. The more you
                practice, the more confident you'll feel.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
      </div>
    </div>
  );
}
