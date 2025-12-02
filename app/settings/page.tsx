/**
 * Settings Page
 * User profile and account management
 */

import { auth, signOut } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Crown,
  BarChart3,
  Calendar,
  ArrowLeft,
  LogOut,
  Shield,
  FileText,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ResumeManager from '@/components/resume-manager';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/settings');
  }

  // Fetch user data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      plan: true,
      analysisCount: true,
      monthlyLimit: true,
      lastReset: true,
      stripeCustomerId: true,
      _count: {
        select: {
          jobRuns: true,
        },
      },
    },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  const remaining = Math.max(0, user.monthlyLimit - user.analysisCount);
  const percentage = (user.analysisCount / user.monthlyLimit) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-lg text-slate-600 mt-1">Manage your profile and preferences</p>
        </div>

        {/* Profile Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Name</label>
                <p className="text-slate-900 mt-1">{user.name || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <p className="text-slate-900 mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  {user.email}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-slate-700">Member Since</label>
              <p className="text-slate-900 mt-1">
                {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resume Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Resumes
            </CardTitle>
            <CardDescription>Manage your uploaded resumes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResumeManager />
          </CardContent>
        </Card>

        {/* Subscription & Usage */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Subscription & Usage
            </CardTitle>
            <CardDescription>Current plan and usage statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Current Plan</label>
                <Badge variant={user.plan === 'FREE' ? 'secondary' : 'default'} className="text-sm">
                  {user.plan}
                </Badge>
              </div>
              {user.plan === 'FREE' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-3">
                    Upgrade to Pro for unlimited analyses and priority support
                  </p>
                  <Button asChild size="sm">
                    <Link href="/pricing">
                      <Crown className="mr-2 h-3 w-3" />
                      Upgrade Now
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Usage Stats */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">Monthly Usage</label>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Analyses Used</span>
                  <span className="font-medium">
                    {user.analysisCount} / {user.monthlyLimit}
                  </span>
                </div>

                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      percentage >= 100
                        ? 'bg-red-500'
                        : percentage >= 80
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Remaining</span>
                  <span className="font-medium text-slate-900">
                    {remaining} {remaining === 1 ? 'analysis' : 'analyses'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Resets {formatDistanceToNow(new Date(user.lastReset.getTime() + 30 * 24 * 60 * 60 * 1000), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Total Analyses */}
            <div className="flex justify-between items-center">
              <div>
                <label className="text-sm font-medium text-slate-700">Total Analyses</label>
                <p className="text-xs text-slate-500">All time</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{user._count.jobRuns}</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Actions
            </CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sign Out */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Sign Out</p>
                <p className="text-sm text-slate-600">Sign out of your account</p>
              </div>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <Button type="submit" variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>

            {/* Delete Account (Future) */}
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <p className="font-medium text-red-900">Delete Account</p>
                <p className="text-sm text-red-700">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-8 flex justify-center gap-6 text-sm text-slate-600">
          <Link href="/privacy" className="hover:text-slate-900 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-900 hover:underline">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-slate-900 hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
