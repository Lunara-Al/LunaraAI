import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md mx-4 moon-glow hover-elevate transition-all">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground dark:text-white">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            The page you're looking for doesn't exist in the cosmos. Please check the URL and try again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
