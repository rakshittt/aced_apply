'use client';

import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CoachChatProps {
    runId: string;
    className?: string;
    chatId?: string;
}

export function CoachChat({ runId, className, chatId }: CoachChatProps) {
    const { messages, isLoading, append, error } = useChat({
        id: chatId,
        body: { runId },
        initialMessages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: "Hi! I'm your personal Interview Coach. I've analyzed your profile and the job description. How can I help you prepare today?",
            },
        ],
    } as any) as any;

    const [localInput, setLocalInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!localInput.trim() || isLoading) return;

        const content = localInput;
        setLocalInput(''); // Clear immediately for better UX
        await append({ role: 'user', content });
    };

    const quickStarters = [
        "Mock interview me",
        "What are my red flags?",
        "How do I explain my gaps?",
        "What questions should I ask?",
    ];

    return (
        <Card className={`flex flex-col border-primary/20 shadow-lg ${className || 'h-[500px] md:h-[600px]'}`}>
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
                <CardTitle className="flex items-center gap-2 text-primary">
                    <Bot className="h-5 w-5" />
                    Interview-AI Coach
                </CardTitle>
                <CardDescription>
                    Context-aware guidance based on your analysis.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col min-h-0">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.map((m: any) => (
                            <div
                                key={m.id}
                                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {m.role === 'assistant' && (
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                )}
                                <div
                                    className={`rounded-lg p-3 max-w-[80%] text-sm ${m.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary/50 text-foreground'
                                        }`}
                                >
                                    {m.content}
                                </div>
                                {m.role === 'user' && (
                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                        <User className="h-4 w-4 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4 text-primary" />
                                </div>
                                <div className="bg-secondary/50 rounded-lg p-3">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {error && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 mx-4 mb-2">
                        Error: {error.message}
                    </div>
                )}

                {/* Quick Starters */}
                {messages.length === 1 && (
                    <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                        {quickStarters.map((starter) => (
                            <Button
                                key={starter}
                                variant="outline"
                                size="sm"
                                className="whitespace-nowrap text-xs"
                                onClick={() => {
                                    append({ role: 'user', content: starter });
                                }}
                            >
                                <Sparkles className="mr-1 h-3 w-3 text-amber-500" />
                                {starter}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 border-t border-border/50 bg-background">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <Input
                            value={localInput}
                            onChange={(e) => setLocalInput(e.target.value)}
                            placeholder="Ask for advice, mock questions, or strategy..."
                            className="flex-1"
                            autoFocus
                        />
                        <Button type="submit" size="icon" disabled={isLoading || !localInput.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
