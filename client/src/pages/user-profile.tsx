import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, Calendar, User as UserIcon, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MoonMenu from "@/components/moon-menu";
import { format } from "date-fns";
import { CreationsSection } from "@/components/creations-section";

type UserProfileData = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  membershipTier: string;
  createdAt: string | null;
};

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();

  const { data: user, isLoading, isError, error } = useQuery<UserProfileData>({
    queryKey: ["/api/users", username],
    queryFn: async () => {
      const response = await fetch(`/api/users/${username}`);
      if (!response.ok) throw new Error("User not found");
      return response.json();
    },
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">User Not Found</h1>
            <p className="text-muted-foreground">The user you're looking for doesn't exist or has been deleted.</p>
          </div>
          <Button onClick={() => setLocation("/")} variant="default" className="hover-elevate">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const firstInitial = user.firstName?.[0] || "";
  const lastInitial = user.lastName?.[0] || "";
  const userInitials = `${firstInitial}${lastInitial}`.toUpperCase() || "LU";
  const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Lunara User";
  const memberSince = user.createdAt
    ? format(new Date(user.createdAt), "MMMM yyyy")
    : "Unknown";

  return (
    <div className="min-h-screen px-4 py-8 md:p-4 bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900">
      <MoonMenu />

      <div className="w-full max-w-2xl mx-auto space-y-8 pt-12">
        {/* Back Button */}
        <Button
          onClick={() => setLocation("/")}
          variant="outline"
          size="sm"
          className="hover-elevate"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Profile Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 transition-all duration-700" />

          <div className="relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 rounded-3xl p-8 md:p-16 space-y-10 shadow-2xl">
            {/* Profile Header */}
            <div className="flex flex-col items-center space-y-6 text-center">
              {/* Avatar with Glow */}
              <div className="relative group/avatar">
                <div className="absolute -inset-3 bg-gradient-to-r from-primary to-secondary rounded-full blur-2xl opacity-40 group-hover/avatar:opacity-70 transition-all duration-500" />
                <div className="absolute -inset-2 bg-gradient-to-r from-secondary to-primary rounded-full blur-xl opacity-30 group-hover/avatar:opacity-50 transition-all duration-500" />

                <Avatar className="relative w-32 h-32 md:w-40 md:h-40 ring-4 ring-primary/50 shadow-2xl border-2 border-white/50 dark:border-slate-700/50">
                  <AvatarImage src={user.profileImageUrl || ""} alt={displayName} />
                  <AvatarFallback className="text-5xl md:text-6xl bg-gradient-to-br from-primary to-secondary text-primary-foreground font-black">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* User Info */}
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                  {displayName}
                </h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-center gap-2">
                  <span className="text-primary dark:text-secondary">@</span>{user.username}
                </p>

                {/* Membership Badge */}
                <Badge className="px-6 py-2 h-auto bg-gradient-to-r from-primary/20 to-secondary/20 dark:from-primary/30 dark:to-secondary/30 text-primary dark:text-secondary border-primary/40 dark:border-primary/50 font-bold capitalize text-sm shadow-lg shadow-primary/20 dark:shadow-primary/30 mx-auto">
                  <Crown className="w-4 h-4 mr-2 flex-shrink-0" />
                  {user.membershipTier} Member
                </Badge>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-8 border-t border-white/20 dark:border-slate-700/30">
              {/* User ID */}
              <div className="group/stat relative p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 border border-slate-200/60 dark:border-slate-700/40">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 text-primary dark:text-secondary">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      ID
                    </p>
                    <p className="text-sm font-mono text-slate-900 dark:text-white truncate mt-1 font-semibold">
                      {user.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tier */}
              <div className="group/stat relative p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 border border-slate-200/60 dark:border-slate-700/40">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 text-primary dark:text-secondary">
                      <Crown className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Tier
                    </p>
                    <p className="text-sm text-slate-900 dark:text-white mt-1 font-semibold capitalize">
                      {user.membershipTier}
                    </p>
                  </div>
                </div>
              </div>

              {/* Member Since */}
              <div className="group/stat relative p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 border border-slate-200/60 dark:border-slate-700/40 md:col-span-1 col-span-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 text-primary dark:text-secondary">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Member Since
                    </p>
                    <p className="text-sm text-slate-900 dark:text-white mt-1 font-semibold">
                      {memberSince}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Username Display */}
            <div className="pt-4 border-t border-white/20 dark:border-slate-700/30">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                Username
              </p>
              <p className="text-lg font-bold text-primary dark:text-secondary">
                @{user.username}
              </p>
            </div>
          </div>
        </div>

        {/* Creations Section */}
        <div className="relative mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <CreationsSection userId={user.id} />
        </div>
      </div>
    </div>
  );
}
