import { auth, signOut } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  TrendingUp,
  Calendar,
  Settings,
  LogOut,
  Crown,
  BarChart3,
  History,
  Plus,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Fetch user's recent job runs
  const recentRuns = await prisma.jobRun.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      jd: {
        select: {
          title: true,
          company: true,
        },
      },
      fitMap: {
        select: {
          overallFit: true,
          confidence: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  const { plan, analysisCount, monthlyLimit } = session.user;
  const remainingAnalyses = Math.max(0, monthlyLimit - analysisCount);
  const usagePercentage = (analysisCount / monthlyLimit) * 100;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">
              A
            </div>
            <span className="font-semibold tracking-tight">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <form
              action={async () => {
                'use server';
                await signOut();
              }}
            >
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {session.user.name?.split(' ')[0] || 'User'}</h1>
            <p className="text-muted-foreground">Here's what's happening with your job search.</p>
          </div>
          <Button asChild size="lg" className="rounded-full px-6 shadow-lg shadow-primary/20">
            <Link href="/analyze">
              <Plus className="mr-2 h-4 w-4" /> New Analysis
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Plan Card */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
              <Crown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plan}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {plan === 'FREE' ? (
                  <Link href="/pricing" className="text-primary hover:underline flex items-center gap-1">
                    Upgrade to Pro <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  'Active subscription'
                )}
              </p>
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Usage</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analysisCount} <span className="text-muted-foreground text-sm font-normal">/ {monthlyLimit}</span>
              </div>
              <div className="mt-3 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-in-out"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {remainingAnalyses} {remainingAnalyses === 1 ? 'analysis' : 'analyses'} remaining
              </p>
            </CardContent>
          </Card>

          {/* Total Analyses Card */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Analyses</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentRuns.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime analyses run</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/history" className="group">
            <Card className="h-full border-border/50 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-primary" />
                  History
                </CardTitle>
                <CardDescription>View past analyses</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/coach" className="group">
            <Card className="h-full border-border/50 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Interview Coach
                </CardTitle>
                <CardDescription>Prepare for upcoming interviews</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Recent Analyses */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent Analyses</h2>
          {recentRuns.length === 0 ? (
            <Card className="border-dashed border-2 bg-secondary/10">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">No analyses yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                  Upload your first resume and job description to get started with AI-powered insights.
                </p>
                <Button asChild>
                  <Link href="/analyze">Start Analysis</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recentRuns.map((run) => (
                <Link key={run.id} href={`/results/${run.id}`}>
                  <Card className="border-border/50 hover:border-primary/50 transition-all hover:shadow-sm group">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {run.jd.title || 'Untitled Position'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {run.jd.company && <span>{run.jd.company}</span>}
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {run.fitMap && (
                          <Badge
                            variant={
                              run.fitMap.overallFit === 'FIT'
                                ? 'default'
                                : run.fitMap.overallFit === 'BORDERLINE'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="capitalize"
                          >
                            {run.fitMap.overallFit.toLowerCase()}
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade CTA for Free Users */}
        {plan === 'FREE' && (
          <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Crown className="h-32 w-32 text-primary" />
            </div>
            <CardContent className="p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Unlock Unlimited Potential
                </h3>
                <p className="text-muted-foreground max-w-xl">
                  Upgrade to Pro for unlimited analyses, priority processing, and advanced insights.
                  Take your job search to the next level.
                </p>
              </div>
              <Button size="lg" asChild className="shrink-0">
                <Link href="/pricing">Upgrade to Pro</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
