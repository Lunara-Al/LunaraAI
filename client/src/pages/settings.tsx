import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Bell, Grid3x3, Sun, Moon as MoonIcon, Check, Loader2, Zap, Eye, Mail, ToggleRight, Volume2 } from "lucide-react";
import MoonMenu from "@/components/moon-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useConditionalToast } from "@/hooks/useConditionalToast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { isUnauthorizedError } from "@/lib/authUtils";

type UserSettings = {
  id: number;
  userId: string;
  defaultLength: number;
  defaultAspectRatio: string;
  emailNotifications: number;
  galleryView: string;
  theme: string;
  autoSave: number;
  createdAt: string;
  updatedAt: string;
};

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useConditionalToast();
  const { theme, setTheme } = useTheme();

  // Local state for form
  const [formData, setFormData] = useState({
    defaultLength: 10,
    defaultAspectRatio: "1:1",
    emailNotifications: 1,
    galleryView: "grid",
    theme: "dark",
    autoSave: 1,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem("lunara-toast-notifications");
    return saved ? JSON.parse(saved) : true;
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  // Update local state when settings are fetched
  useEffect(() => {
    if (settings) {
      setFormData({
        defaultLength: settings.defaultLength,
        defaultAspectRatio: settings.defaultAspectRatio,
        emailNotifications: settings.emailNotifications,
        galleryView: settings.galleryView,
        theme: settings.theme,
        autoSave: settings.autoSave,
      });
    }
  }, [settings]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      const response = await apiRequest("PATCH", "/api/settings", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your preferences have been saved to the cosmos.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Apply theme immediately
    if (field === "theme") {
      setTheme(value as "light" | "dark");
    }
  };

  const isLoading = authLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:py-12 bg-gradient-to-br from-background via-background to-card">
      <MoonMenu />
      
      <div className="max-w-5xl mx-auto space-y-8 pt-6 md:pt-8">
        {/* Header */}
        <div className="text-center space-y-2 md:space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Customize your Lunara AI experience and fine-tune your preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Video Generation Settings */}
          <Card className="p-6 md:p-8 space-y-6 hover-elevate transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Video Generation</h2>
                <p className="text-xs md:text-sm text-muted-foreground">Set your default generation preferences</p>
              </div>
            </div>

            <div className="space-y-6 md:space-y-5">
              {/* Default Length */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-semibold block mb-1">
                    Default Video Length
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Your preferred duration for new generations
                  </p>
                </div>
                <Select
                  value={formData.defaultLength.toString()}
                  onValueChange={(value) => updateField("defaultLength", parseInt(value))}
                >
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">
                      <span className="flex items-center gap-2">
                        <span>5 seconds</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="15">
                      <span className="flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        <span>15 seconds</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Default Aspect Ratio */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-semibold block mb-1">
                    Default Aspect Ratio
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Your preferred format for new videos
                  </p>
                </div>
                <Select
                  value={formData.defaultAspectRatio}
                  onValueChange={(value) => updateField("defaultAspectRatio", value)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-aspect-ratio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1 Instagram</SelectItem>
                    <SelectItem value="16:9">16:9 YouTube</SelectItem>
                    <SelectItem value="9:16">9:16 TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-save */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-semibold block mb-1">
                    Auto-save to Gallery
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Automatically save generated videos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs md:text-sm font-medium text-muted-foreground">
                    {formData.autoSave === 1 ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    id="autoSave"
                    checked={formData.autoSave === 1}
                    onCheckedChange={(checked) => updateField("autoSave", checked ? 1 : 0)}
                    data-testid="switch-autosave"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Display Settings */}
          <Card className="p-6 md:p-8 space-y-6 hover-elevate transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Eye className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Display</h2>
                <p className="text-xs md:text-sm text-muted-foreground">Customize how you view your content</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Gallery View */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-semibold block mb-1">
                    Gallery View
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    How to display videos in your gallery
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant={formData.galleryView === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField("galleryView", "grid")}
                    className="flex-1 sm:flex-initial"
                    data-testid="button-gallery-grid"
                  >
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Grid
                  </Button>
                  <Button
                    type="button"
                    variant={formData.galleryView === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField("galleryView", "list")}
                    className="flex-1 sm:flex-initial"
                    data-testid="button-gallery-list"
                  >
                    List
                  </Button>
                </div>
              </div>

              {/* Theme with Live Preview */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors">
                  <div className="flex-1">
                    <Label className="text-sm md:text-base font-semibold block mb-1">
                      Theme
                    </Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Choose your preferred color theme
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant={formData.theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateField("theme", "light")}
                      className="flex-1 sm:flex-initial transition-all duration-300"
                      data-testid="button-theme-light"
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      type="button"
                      variant={formData.theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateField("theme", "dark")}
                      className="flex-1 sm:flex-initial transition-all duration-300"
                      data-testid="button-theme-dark"
                    >
                      <MoonIcon className="w-4 h-4 mr-2" />
                      Dark
                    </Button>
                  </div>
                </div>
                
                {/* Live Theme Preview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 transition-all duration-300">
                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Light Mode</div>
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                      <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 transition-all duration-300">
                    <div className="text-xs font-semibold text-white mb-2">Dark Mode</div>
                    <div className="space-y-2">
                      <div className="h-2 bg-slate-800 rounded w-full"></div>
                      <div className="h-2 bg-slate-800 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6 md:p-8 space-y-6 hover-elevate transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Notifications</h2>
                <p className="text-xs md:text-sm text-muted-foreground">Manage how you stay updated</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Email Notifications */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-semibold block mb-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Notifications
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Receive updates about your account and videos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs md:text-sm font-medium text-muted-foreground">
                    {formData.emailNotifications === 1 ? "On" : "Off"}
                  </span>
                  <Switch
                    id="emailNotifications"
                    checked={formData.emailNotifications === 1}
                    onCheckedChange={(checked) => updateField("emailNotifications", checked ? 1 : 0)}
                    data-testid="switch-notifications"
                  />
                </div>
              </div>

              {/* On-Screen Toast Notifications */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-background/40 hover:bg-background/60 transition-colors">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-semibold block mb-1 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Toast Notifications
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Show notifications when you change settings
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs md:text-sm font-medium text-muted-foreground">
                    {toastNotificationsEnabled ? "On" : "Off"}
                  </span>
                  <Switch
                    id="toastNotifications"
                    checked={toastNotificationsEnabled}
                    onCheckedChange={(checked) => {
                      setToastNotificationsEnabled(checked);
                      localStorage.setItem("lunara-toast-notifications", JSON.stringify(checked));
                      if (checked) {
                        toast({
                          title: "Notifications Enabled",
                          description: "You'll now see notifications for your actions.",
                        });
                      }
                    }}
                    data-testid="switch-toast-notifications"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (settings) {
                setFormData({
                  defaultLength: settings.defaultLength,
                  defaultAspectRatio: settings.defaultAspectRatio,
                  emailNotifications: settings.emailNotifications,
                  galleryView: settings.galleryView,
                  theme: settings.theme,
                  autoSave: settings.autoSave,
                });
                setHasChanges(false);
              }
            }}
            disabled={!hasChanges || updateMutation.isPending}
            data-testid="button-reset-settings"
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="min-w-[140px] bg-gradient-to-r from-primary to-secondary moon-glow"
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : hasChanges ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
