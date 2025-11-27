import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProviderSidebar } from "@/components/provider/ProviderSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProviderEarnings() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ProviderSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6 bg-background sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-2xl font-bold">Earnings</h1>
          </header>

          <main className="flex-1 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Coming soon...</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
