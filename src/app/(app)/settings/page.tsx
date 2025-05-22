import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-accent" /> Settings
        </h1>
        <p className="text-muted-foreground">Manage your application settings and preferences.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Application Preferences</CardTitle>
          <CardDescription>Customize HIVE to your needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Settings content will go here. (e.g., Theme, Notifications, Account Details)</p>
          <img src="https://placehold.co/600x400.png" alt="Settings Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="settings interface options" />
        </CardContent>
      </Card>
    </div>
  );
}
