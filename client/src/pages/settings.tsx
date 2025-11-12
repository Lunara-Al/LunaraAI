import MoonMenu from "@/components/moon-menu";

export default function Settings() {
  return (
    <div className="min-h-screen px-4 py-8 md:p-8 bg-gradient-to-br from-background via-background to-card">
      <MoonMenu />
      
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">Customize your Lunara AI experience</p>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Account Settings</h2>
            <p className="text-sm text-muted-foreground">
              Manage your account preferences and settings.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-card-border">
              <div>
                <h3 className="font-medium">Default Video Length</h3>
                <p className="text-sm text-muted-foreground">Choose your preferred video duration</p>
              </div>
              <span className="text-sm text-muted-foreground">10 seconds</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-card-border">
              <div>
                <h3 className="font-medium">Default Aspect Ratio</h3>
                <p className="text-sm text-muted-foreground">Your default aspect ratio preference</p>
              </div>
              <span className="text-sm text-muted-foreground">1:1 (Instagram)</span>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium">Auto-save to Gallery</h3>
                <p className="text-sm text-muted-foreground">Automatically save generated videos</p>
              </div>
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
