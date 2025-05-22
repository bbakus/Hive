import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="h-8 w-8 text-accent" /> Support
        </h1>
        <p className="text-muted-foreground">Get help and support for HIVE.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Help & Documentation</CardTitle>
          <CardDescription>Find answers to your questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Support information, FAQs, and contact details will be available here.</p>
          <img src="https://placehold.co/600x400.png" alt="Support Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="customer support helpdesk" />
        </CardContent>
      </Card>
    </div>
  );
}
