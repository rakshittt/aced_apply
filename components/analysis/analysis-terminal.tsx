'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, Terminal, Search, Brain, Target, Lightbulb, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalysisStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    detail?: string;
    icon?: React.ReactNode;
}

interface AnalysisTerminalProps {
    steps: AnalysisStep[];
    currentStepId?: string;
    logs: string[];
}

export function AnalysisTerminal({ steps, currentStepId, logs }: AnalysisTerminalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="grid gap-6 md:grid-cols-[1fr_350px]">
            {/* Main Progress View */}
            <Card className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Brain className="h-5 w-5 text-primary" />
                        Analysis in Progress
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        {steps.map((step, index) => {
                            const isCurrent = step.id === currentStepId;
                            const isCompleted = step.status === 'completed';
                            const isPending = step.status === 'pending';

                            return (
                                <div
                                    key={step.id}
                                    className={cn(
                                        "relative flex items-start gap-4 p-4 rounded-lg transition-all duration-500",
                                        isCurrent && "bg-primary/5 border border-primary/20 shadow-sm scale-[1.02]",
                                        isCompleted && "opacity-80",
                                        isPending && "opacity-40"
                                    )}
                                >
                                    {/* Icon / Status Indicator */}
                                    <div className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                                        isCompleted ? "bg-green-500/10 border-green-500/20 text-green-500" :
                                            isCurrent ? "bg-primary/10 border-primary/20 text-primary animate-pulse" :
                                                "bg-muted border-border text-muted-foreground"
                                    )}>
                                        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> :
                                            isCurrent ? <Loader2 className="h-5 w-5 animate-spin" /> :
                                                step.icon || <Terminal className="h-5 w-5" />}
                                    </div>

                                    <div className="flex-1 space-y-1 pt-1">
                                        <div className="flex items-center justify-between">
                                            <p className={cn("font-medium leading-none", isCurrent && "text-primary")}>
                                                {step.label}
                                            </p>
                                            {isCurrent && (
                                                <span className="text-xs font-mono text-primary animate-pulse">Processing...</span>
                                            )}
                                        </div>
                                        {step.detail && (
                                            <p className="text-sm text-muted-foreground">
                                                {step.detail}
                                            </p>
                                        )}
                                    </div>

                                    {/* Connector Line */}
                                    {index < steps.length - 1 && (
                                        <div className={cn(
                                            "absolute left-[2.25rem] top-[3.5rem] h-6 w-px",
                                            isCompleted ? "bg-green-500/30" : "bg-border"
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Live Logs Terminal */}
            <Card className="bg-slate-950 border-slate-800 shadow-inner h-full max-h-[600px] flex flex-col">
                <CardHeader className="bg-slate-900/50 border-b border-slate-800 py-3">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
                            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/20" />
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500/20" />
                        </div>
                        <span className="text-xs font-mono text-slate-400 ml-2">aced-engine — live</span>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 relative">
                    <div
                        ref={scrollRef}
                        className="absolute inset-0 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                    >
                        {logs.length === 0 && (
                            <span className="text-slate-600 italic">Waiting for logs...</span>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2 text-slate-300 animate-in fade-in slide-in-from-left-1 duration-300">
                                <span className="text-slate-600 select-none">{'>'}</span>
                                <span>{log}</span>
                            </div>
                        ))}
                        {/* Blinking cursor */}
                        <div className="flex gap-2">
                            <span className="text-slate-600 select-none">{'>'}</span>
                            <span className="w-2 h-4 bg-slate-500 animate-pulse" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
