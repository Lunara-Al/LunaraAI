import { User, Mail, Calendar, LogOut, Crown } from "lucide-react";
import MoonMenu from "@/components/moon-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Handle unauthorized access
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'LU';
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Lunara User';
  const createdDate = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen px-4 py-8 md:p-8 bg-gradient-to-br from-background via-background to-card">
      <MoonMenu />
      
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-muted-foreground">Your Lunara AI profile</p>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-6 md:p-8 space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24 md:w-32 md:h-32">
              <AvatarImage src={user.profileImageUrl || ""} alt={displayName} />
              <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{displayName}</h2>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {user.membershipTier} Plan
                </Badge>
                {user.membershipTier !== "free" && (
                  <Crown className="w-4 h-4 text-primary" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 py-3 border-b border-card-border">
              <User className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <h3 className="font-medium">User ID</h3>
                <p className="text-sm text-muted-foreground">{user.id}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-3 border-b border-card-border">
              <Mail className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <h3 className="font-medium">Email</h3>
                <p className="text-sm text-muted-foreground">{user.email || 'No email provided'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <h3 className="font-medium">Member Since</h3>
                <p className="text-sm text-muted-foreground">{createdDate}</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/api/logout'}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
