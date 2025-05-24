
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { Settings as SettingsIcon, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SettingsPage() {
  const { useDemoData, setUseDemoData, isLoading } = useSettingsContext();

  if (isLoading) {
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
          </CardHeader>
          <CardContent>
            <p>Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="demo-data-toggle" className="text-base font-medium">
                Load Demo Data
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable to populate the application with sample projects, events, and other data for demonstration and testing. Disable to start with a clean slate.
              </p>
            </div>
            <Switch
              id="demo-data-toggle"
              checked={useDemoData}
              onCheckedChange={setUseDemoData}
              aria-label="Toggle demo data"
            />
          </div>
           <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Refresh Required</AlertTitle>
            <AlertDescription>
              Changes to the "Load Demo Data" setting will take full effect after refreshing the application (e.g., by navigating to a different page or reloading your browser tab). New projects, events, etc., added while demo data is off will persist.
            </AlertDescription>
          </Alert>
          {/* Future settings can be added here */}
          {/* Example:
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="theme-selector" className="text-base font-medium">
                Theme
              </Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred application theme (Light/Dark).
              </p>
            </div>
            <p className="text-muted-foreground">(Theme selection coming soon)</p>
          </div>
          */}
        </CardContent>
      </Card>
    </div>
  );
}
