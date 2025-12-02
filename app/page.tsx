import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Star,
  Zap,
  Shield,
  BarChart,
  FileText,
  Briefcase,
  Layers
} from 'lucide-react';

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">
              A
            </div>
            <span className="text-lg font-semibold tracking-tight">Aced Apply</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Button asChild className="rounded-full px-6">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm font-medium text-secondary-foreground backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            Now with AI Interview Coach
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
            Master the interview. <br className="hidden md:block" />
            <span className="text-muted-foreground">Before you even apply.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            The all-in-one platform to tailor your resume, analyze job fit, and prepare for interviews with precision.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-12 px-8 rounded-full text-base" asChild>
              <Link href="/auth/signup">
                Start Free Analysis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-base" asChild>
              <Link href="#features">
                How it works
              </Link>
            </Button>
          </div>

          <div className="pt-12 flex items-center justify-center gap-8 text-muted-foreground grayscale opacity-50">
            {/* Trust badges placeholders */}
            <div className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> TechCorp</div>
            <div className="flex items-center gap-2"><Layers className="h-5 w-5" /> StartupInc</div>
            <div className="flex items-center gap-2"><Shield className="h-5 w-5" /> SecureNet</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-background border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Smart Resume Analysis</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Get instant, actionable feedback on your resume. Our AI identifies gaps, keywords, and formatting issues to help you pass the ATS.
              </CardContent>
            </Card>

            <Card className="bg-background border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                  <BarChart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Job Fit Score</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Paste a job description and see exactly how well you match. We highlight your strengths and pinpoint areas for improvement.
              </CardContent>
            </Card>

            <Card className="bg-background border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">7-Day Prep Plan</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Don't just apply—prepare. Get a personalized 7-day study plan covering technical concepts, behavioral questions, and company research.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start for free, upgrade when you're ready to scale your search.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="border-border/50 shadow-sm relative overflow-hidden">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl font-bold">Free</CardTitle>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <p className="text-muted-foreground mt-4">Perfect for casual job seekers.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary" /> 3 Resume Analyses / mo
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary" /> Basic Fit Scoring
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary" /> 7-Day Prep Plans
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-8 rounded-full" asChild>
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-primary shadow-lg relative overflow-hidden bg-primary/5">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl font-bold">Pro</CardTitle>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <p className="text-muted-foreground mt-4">For serious candidates who want to win.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm font-medium">
                    <Check className="h-4 w-4 text-primary" /> Unlimited Analyses
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium">
                    <Check className="h-4 w-4 text-primary" /> Priority AI Processing
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium">
                    <Check className="h-4 w-4 text-primary" /> Advanced Insights & Metrics
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium">
                    <Check className="h-4 w-4 text-primary" /> Unlimited History
                  </li>
                </ul>
                <Button className="w-full mt-8 rounded-full" asChild>
                  <Link href="/auth/signup">Start Pro Trial</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/40 bg-secondary/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary text-primary-foreground rounded-md flex items-center justify-center font-bold text-xs">
              A
            </div>
            <span className="font-semibold text-sm">Aced Apply</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Aced Apply.
          </div>
        </div>
      </footer>
    </div>
  );
}
