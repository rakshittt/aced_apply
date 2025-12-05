'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Trash2, CheckCircle2, Loader2, Star, Upload, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Resume {
  id: string;
  name: string | null;
  uploadedAt: string;
  isDefault: boolean;
  preview: string;
}

export default function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  async function fetchResumes() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/resume');
      const data = await response.json();

      if (response.ok) {
        setResumes(data.resumes);
      } else {
        setError(data.error || 'Failed to fetch resumes');
      }
    } catch (err) {
      setError('Failed to load resumes');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetDefault(resumeId: string) {
    setSettingDefaultId(resumeId);
    setError(null);

    try {
      const response = await fetch(`/api/resume/${resumeId}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        await fetchResumes();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to set as default');
      }
    } catch (err) {
      setError('Failed to update resume');
    } finally {
      setSettingDefaultId(null);
    }
  }

  async function handleDelete(resumeId: string) {
    if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    setDeletingId(resumeId);
    setError(null);

    try {
      const response = await fetch(`/api/resume/${resumeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchResumes();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete resume');
      }
    } catch (err) {
      setError('Failed to delete resume');
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {resumes.length === 0 ? (
        <div className="text-center py-8 text-slate-600">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm">No resumes uploaded yet</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <a href="/analyze">
              <Upload className="mr-2 h-3 w-3" />
              Upload Resume
            </a>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className={`p-4 border rounded-lg ${resume.isDefault
                ? 'border-green-300 bg-green-50'
                : 'border-slate-200 bg-white'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <div>
                      <span className="text-sm font-medium text-slate-900 block">
                        {resume.name || `Resume from ${new Date(resume.uploadedAt).toLocaleDateString()}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        Uploaded {formatDistanceToNow(new Date(resume.uploadedAt), { addSuffix: true })}
                      </span>
                    </div>
                    {resume.isDefault && (
                      <Badge variant="default" className="text-xs">
                        <Star className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-2">{resume.preview}</p>
                </div>

                <div className="flex items-center gap-2 ml-4">


                  {!resume.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(resume.id)}
                      disabled={settingDefaultId === resume.id || deletingId === resume.id}
                    >
                      {settingDefaultId === resume.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Set Active
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(resume.id)}
                    disabled={deletingId === resume.id || settingDefaultId === resume.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === resume.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resumes.length > 0 && (
        <div className="pt-2">
          <Button variant="outline" size="sm" asChild className="w-full">
            <a href="/analyze">
              <Upload className="mr-2 h-3 w-3" />
              Upload New Resume
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
