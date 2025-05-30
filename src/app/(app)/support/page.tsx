
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="h-8 w-8" /> Support 
        </p>
        <p className="text-muted-foreground">Get help and support for HIVE.</p>
      </div>

      <Card className="border-0">
        <CardHeader>
          <p className="text-lg font-semibold">Help & Documentation</p> 
          <div className="text-sm text-muted-foreground">Find answers to your questions.</div> 
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Support information, FAQs, and contact details will be available here.</p>
          <img src="https://placehold.co/600x400.png" alt="Support Placeholder" className="w-full h-auto mt-4 rounded-none" data-ai-hint="customer support helpdesk" />
        </CardContent>
      </Card>
    </div>
  );
}
