import { User, Mail, Calendar, LogOut, Crown, Trash2 } from "lucide-react";
import MoonMenu from "@/components/moon-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: async (payload: { method: string; password?: string; confirmation?: string }) => {
      return await apiRequest("POST", "/api/auth/delete-account", payload);
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      setTimeout(() => {
        setLocation("/");
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = () => {
    if (user?.hasPassword) {
      // Local users verify with password
      if (deletePassword) {
        deleteAccountMutation.mutate({ method: "password", password: deletePassword });
        setIsDeleteDialogOpen(false);
        setDeletePassword("");
      }
    } else {
      // OIDC users verify with "DELETE" text
      if (deleteConfirmation === "DELETE") {
        deleteAccountMutation.mutate({ method: "text", confirmation: deleteConfirmation });
        setIsDeleteDialogOpen(false);
        setDeleteConfirmation("");
      }
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground text-sm">Loading your profile...</p>
        </div>
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
      
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="text-center space-y-2 md:space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Your cosmic account information</p>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-6 md:p-8 space-y-8 hover-elevate transition-all duration-300">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative animate-in fade-in zoom-in duration-500" style={{ animationDelay: '100ms' }}>
              <Avatar className="w-24 h-24 md:w-32 md:h-32 ring-2 ring-primary/20">
                <AvatarImage src={user.profileImageUrl || ""} alt={displayName} />
                <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
              <h2 className="text-2xl md:text-3xl font-bold">{displayName}</h2>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/30">
                  {user.membershipTier} Plan
                </Badge>
                {user.membershipTier !== "free" && (
                  <Crown className="w-5 h-5 text-primary animate-pulse" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors duration-200 border border-transparent hover:border-primary/10">
              <User className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">User ID</h3>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{user.id}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors duration-200 border border-transparent hover:border-primary/10">
              <Mail className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Email</h3>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{user.email || 'No email provided'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors duration-200 border border-transparent hover:border-primary/10">
              <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Member Since</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{createdDate}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              variant="outline" 
              className="w-full transition-all duration-200 hover:scale-105"
              onClick={() => window.location.href = '/api/logout'}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            
            <Button 
              variant="destructive" 
              className="w-full transition-all duration-200 hover:scale-105"
              onClick={() => setIsDeleteDialogOpen(true)}
              data-testid="button-delete-account"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            {user?.hasPassword ? (
              <>
                <label htmlFor="delete-password" className="text-sm font-medium mb-2 block">
                  Enter your password to confirm
                </label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Password"
                  data-testid="input-delete-password"
                />
              </>
            ) : (
              <>
                <label htmlFor="delete-confirmation" className="text-sm font-medium mb-2 block">
                  Type <span className="font-bold">DELETE</span> to confirm
                </label>
                <Input
                  id="delete-confirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  data-testid="input-delete-confirmation"
                />
              </>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmation("");
                setDeletePassword("");
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={
                (user?.hasPassword ? !deletePassword : deleteConfirmation !== "DELETE") ||
                deleteAccountMutation.isPending
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
