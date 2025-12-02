import { signIn } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || '/dashboard';
  const error = params.error;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="text-muted-foreground">Start your journey to your dream job</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="pt-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">
                  {error === 'EmailExists'
                    ? 'An account with this email already exists. Please sign in instead.'
                    : error === 'PasswordMismatch'
                      ? 'Passwords do not match. Please try again.'
                      : 'An error occurred during sign up. Please try again.'}
                </p>
              </div>
            )}

            {/* Sign Up Form */}
            <form
              action={async (formData: FormData) => {
                'use server';

                const email = formData.get('email') as string;
                const password = formData.get('password') as string;
                const confirmPassword = formData.get('confirmPassword') as string;
                const name = formData.get('name') as string | null;

                // Validate passwords match
                if (password !== confirmPassword) {
                  redirect(`/auth/signup?error=PasswordMismatch&callbackUrl=${encodeURIComponent(callbackUrl)}`);
                }

                try {
                  // Check if user already exists
                  const existingUser = await prisma.user.findUnique({
                    where: { email },
                  });

                  if (existingUser) {
                    redirect(`/auth/signup?error=EmailExists&callbackUrl=${encodeURIComponent(callbackUrl)}`);
                  }

                  // Create new user
                  const hashedPassword = await hash(password, 12);

                  await prisma.user.create({
                    data: {
                      email,
                      password: hashedPassword,
                      name: name || null,
                      plan: 'FREE',
                      monthlyLimit: 3,
                      analysisCount: 0,
                      lastReset: new Date(),
                    },
                  });

                  // Sign in the user
                  await signIn('credentials', {
                    email,
                    password,
                    redirectTo: callbackUrl,
                  });
                } catch (error) {
                  console.error('Sign up error:', error);
                  redirect(`/auth/signup?error=SignupFailed&callbackUrl=${encodeURIComponent(callbackUrl)}`);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="h-11"
                />
              </div>

              <Button type="submit" className="w-full h-11">
                Create Account
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Already have an account?</span>
              </div>
            </div>

            <div className="text-center">
              <Link href="/auth/signin" className="text-sm font-medium text-primary hover:underline">
                Sign in to your account
              </Link>
            </div>

            {/* Feature List */}
            <div className="bg-secondary/50 border border-border/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Free Plan Includes:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>3 resume analyses per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Full access to all analysis features</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>7-day interview prep plans</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
