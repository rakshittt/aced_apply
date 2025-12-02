/**
 * Email Verification Page
 * Shown after user clicks email magic link
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            A sign-in link has been sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              Click the link in the email to complete your sign-in.
            </p>
            <p className="text-xs text-blue-600">
              The link will expire in 24 hours. If you don't see the email, check your spam folder.
            </p>
          </div>

          <div className="text-center text-sm text-slate-600">
            <p>You can close this window.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
