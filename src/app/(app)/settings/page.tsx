
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useTheme } from "@/contexts/ThemeContext"; // Added import
import { Settings as SettingsIcon, Info, Sun, Moon } from "lucide-react"; // Added Sun, Moon
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SettingsPage() {
  const { useDemoData, setUseDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { theme, setTheme, toggleTheme } = useTheme(); // Added useTheme

  if (isLoadingSettings) { // isLoading from ThemeContext might also be relevant if it had one
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
            <AlertTitle>Refresh May Be Required</AlertTitle>
            <AlertDescription>
              Changes to "Load Demo Data" or "Theme" may require a page refresh or navigation to fully apply across all components.
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="theme-toggle" className="text-base font-medium">
                Appearance
              </Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes for the application.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sun className={theme === 'light' ? 'text-accent' : 'text-muted-foreground'} />
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                aria-label="Toggle dark mode"
              />
              <Moon className={theme === 'dark' ? 'text-accent' : 'text-muted-foreground'} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
