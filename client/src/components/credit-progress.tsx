import { Zap } from "lucide-react";

interface CreditProgressProps {
  credits: number;
  monthlyCredits: number;
  compact?: boolean;
}

export function CreditProgress({ credits, monthlyCredits, compact = false }: CreditProgressProps) {
  const percentage = Math.min((credits / monthlyCredits) * 100, 100);
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <div className="flex-1">
          <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {credits}/{monthlyCredits}
        </span>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Monthly Credits</span>
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {credits} / {monthlyCredits}
        </span>
      </div>
      <div className="w-full bg-background rounded-full h-2 mt-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
