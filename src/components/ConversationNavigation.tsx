import { PanelLeft } from "lucide-react";
import { useState } from "react";
import { ConversationHistory } from "@/components/ConversationHistory";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function ConversationNavigation({ selectedTaskId }: { selectedTaskId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl lg:hidden" aria-label="Your conversations" title="Your conversations">
          <PanelLeft aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] max-w-xs p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Your conversations</SheetTitle>
          <SheetDescription>Choose a project or start a new conversation.</SheetDescription>
        </SheetHeader>
        <ConversationHistory headingId="drawer-conversations" selectedTaskId={selectedTaskId} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}