import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Bell, Grid3x3, Sun, Moon as MoonIcon, Check, Loader2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  const { toast } = useToast();

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
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
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
  };

  const isLoading = authLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

        <div className="bg-card border border-card-border rounded-lg p-6 md:p-8 space-y-8">
          {/* Video Generation Defaults */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Video Generation</h2>
            </div>
            <Separator />
            
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="defaultLength" className="text-base font-medium">
                    Default Video Length
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your preferred video duration for new generations
                  </p>
                </div>
                <Select
                  value={formData.defaultLength.toString()}
                  onValueChange={(value) => updateField("defaultLength", parseInt(value))}
                >
                  <SelectTrigger className="w-full md:w-[200px]" data-testid="select-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="15">15 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="defaultAspectRatio" className="text-base font-medium">
                    Default Aspect Ratio
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your preferred aspect ratio for new videos
                  </p>
                </div>
                <Select
                  value={formData.defaultAspectRatio}
                  onValueChange={(value) => updateField("defaultAspectRatio", value)}
                >
                  <SelectTrigger className="w-full md:w-[200px]" data-testid="select-aspect-ratio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1 (Instagram)</SelectItem>
                    <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                    <SelectItem value="9:16">9:16 (TikTok)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="autoSave" className="text-base font-medium">
                    Auto-save to Gallery
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically save generated videos to your gallery
                  </p>
                </div>
                <Switch
                  id="autoSave"
                  checked={formData.autoSave === 1}
                  onCheckedChange={(checked) => updateField("autoSave", checked ? 1 : 0)}
                  data-testid="switch-autosave"
                />
              </div>
            </div>
          </div>

          {/* Display Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Grid3x3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Display</h2>
            </div>
            <Separator />
            
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="galleryView" className="text-base font-medium">
                    Gallery View
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    How to display videos in your gallery
                  </p>
                </div>
                <Select
                  value={formData.galleryView}
                  onValueChange={(value) => updateField("galleryView", value)}
                >
                  <SelectTrigger className="w-full md:w-[200px]" data-testid="select-gallery-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid View</SelectItem>
                    <SelectItem value="list">List View</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="theme" className="text-base font-medium">
                    Theme
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose your preferred color theme
                  </p>
                </div>
                <Select
                  value={formData.theme}
                  onValueChange={(value) => updateField("theme", value)}
                >
                  <SelectTrigger className="w-full md:w-[200px]" data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            <Separator />
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="emailNotifications" className="text-base font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive updates about your account and videos via email
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={formData.emailNotifications === 1}
                onCheckedChange={(checked) => updateField("emailNotifications", checked ? 1 : 0)}
                data-testid="switch-notifications"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="min-w-[140px]"
              data-testid="button-save-settings"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : hasChanges ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {updateMutation.isPending ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
