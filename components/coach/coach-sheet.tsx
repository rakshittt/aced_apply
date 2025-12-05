'use client';

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare } from 'lucide-react';
import { CoachChat } from './coach-chat';

interface CoachSheetProps {
    runId: string;
}

export function CoachSheet({ runId }: CoachSheetProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    size="lg"
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 animate-in zoom-in duration-300 hover:scale-105 transition-transform"
                >
                    <Bot className="h-6 w-6" />
                    <span className="sr-only">Open Interview Coach</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md md:max-w-lg flex flex-col h-full p-0 gap-0">
                <SheetHeader className="p-6 border-b bg-secondary/10">
                    <SheetTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Interview-AI Coach
                    </SheetTitle>
                    <SheetDescription>
                        Your personal interview prep assistant.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-hidden">
                    <CoachChat runId={runId} chatId="coach-sheet" className="h-full border-0 shadow-none rounded-none" />
                </div>
            </SheetContent>
        </Sheet>
    );
}
