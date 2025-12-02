/**
 * History Page
 * Shows all user's past resume analyses
 */

import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowLeft, Calendar, Building2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SearchParams {
  page?: string;
  limit?: string;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/history');
  }

  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '20', 10);
  const skip = (page - 1) * limit;

  // Fetch user's job runs with pagination
  const [jobRuns, totalCount] = await Promise.all([
    prisma.jobRun.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        jd: {
          select: {
            title: true,
            company: true,
            location: true,
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
      skip,
      take: limit,
    }),
    prisma.jobRun.count({
      where: {
        userId: session.user.id,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Analysis History</h1>
              <p className="text-lg text-slate-600 mt-1">
                {totalCount} {totalCount === 1 ? 'analysis' : 'analyses'} total
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/">
                <FileText className="mr-2 h-4 w-4" />
                New Analysis
              </Link>
            </Button>
          </div>
        </div>

        {/* Results */}
        {jobRuns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No analyses yet
              </h3>
              <p className="text-slate-600 mb-6">
                Start your first resume analysis to see it here
              </p>
              <Button asChild size="lg">
                <Link href="/">Start Your First Analysis</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Analysis Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {jobRuns.map((run) => (
                <Card
                  key={run.id}
                  className="hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {run.jd.title || 'Untitled Position'}
                        </CardTitle>
                        {run.jd.company && (
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {run.jd.company}
                          </CardDescription>
                        )}
                      </div>
                      {run.fitMap && (
                        <Badge
                          variant={
                            run.fitMap.overallFit === 'FIT'
                              ? 'default'
                              : run.fitMap.overallFit === 'BORDERLINE'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="ml-2"
                        >
                          {run.fitMap.overallFit}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Metadata */}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(run.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Status:</span>
                      <Badge
                        variant="outline"
                        className={
                          run.status === 'COMPLETED'
                            ? 'text-green-700 border-green-300'
                            : run.status === 'PROCESSING'
                            ? 'text-blue-700 border-blue-300'
                            : 'text-red-700 border-red-300'
                        }
                      >
                        {run.status}
                      </Badge>
                    </div>

                    {/* Confidence Score */}
                    {run.fitMap && (
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">Confidence</span>
                          <span className="font-medium">
                            {(run.fitMap.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${run.fitMap.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/results/${run.id}`}>View Details</Link>
                      </Button>
                      <form
                        action={async () => {
                          'use server';
                          await prisma.jobRun.delete({
                            where: { id: run.id },
                          });
                          redirect('/history');
                        }}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  asChild
                  variant="outline"
                  disabled={!hasPrevPage}
                >
                  {hasPrevPage ? (
                    <Link href={`/history?page=${page - 1}&limit=${limit}`}>
                      Previous
                    </Link>
                  ) : (
                    <span>Previous</span>
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                </div>

                <Button
                  asChild
                  variant="outline"
                  disabled={!hasNextPage}
                >
                  {hasNextPage ? (
                    <Link href={`/history?page=${page + 1}&limit=${limit}`}>
                      Next
                    </Link>
                  ) : (
                    <span>Next</span>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
