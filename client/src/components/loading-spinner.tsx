import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8", 
  lg: "w-12 h-12",
};

export function LoadingSpinner({ 
  message, 
  size = "md", 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {message && (
        <p className="text-muted-foreground text-sm">{message}</p>
      )}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card">
        {content}
      </div>
    );
  }
  
  return content;
}

export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return <LoadingSpinner message={message} size="md" fullScreen />;
}
