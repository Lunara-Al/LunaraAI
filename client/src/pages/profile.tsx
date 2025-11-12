import { User, Mail, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MoonMenu from "@/components/moon-menu";

export default function Profile() {
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
              <AvatarImage src="" alt="User" />
              <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                LU
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Lunara User</h2>
              <p className="text-sm text-muted-foreground">Cosmic Creator</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 py-3 border-b border-card-border">
              <User className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-medium">Username</h3>
                <p className="text-sm text-muted-foreground">lunara_user</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-3 border-b border-card-border">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-medium">Email</h3>
                <p className="text-sm text-muted-foreground">user@lunara.ai</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 py-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-medium">Member Since</h3>
                <p className="text-sm text-muted-foreground">November 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
