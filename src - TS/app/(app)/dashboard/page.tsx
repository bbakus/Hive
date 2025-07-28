
"use client";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-4">
            Welcome to HIVE. Dashboard functionality is being updated to use real backend data.
          </p>
        </div>
      </div>
    </div>
  );
}
