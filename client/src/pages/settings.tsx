import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  Save,
  Bell,
  Grid3x3,
  List,
  Sun,
  Moon as MoonIcon,
  Check,
  Loader2,
  Zap,
  Eye,
  Mail,
  Volume2,
  Sparkles,
  Palette,
  Video,
  Shield,
  Download,
  Keyboard,
  RotateCcw,
  ChevronRight,
  Star,
  Layers,
  Clock,
  Film,
  Ratio,
  BellRing,
  MonitorSmartphone,
  HardDrive,
  Wand2,
  Droplet,
  Crown,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useConditionalToast } from "@/hooks/useConditionalToast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { isUnauthorizedError } from "@/lib/authUtils";
import { VIDEO_LENGTHS } from "@shared/schema";

type UserSettings = {
  id: number;
  userId: string;
  defaultLength: number;
  defaultAspectRatio: string;
  emailNotifications: number;
  galleryView: string;
  theme: string;
  autoSave: number;
  showWatermark: number;
  createdAt: string;
  updatedAt: string;
};

type SettingsSection = "generation" | "display" | "notifications" | "advanced";

const sectionConfig = {
  generation: {
    icon: Wand2,
    label: "Generation",
    description: "Video creation defaults",
    gradient: "from-violet-500 to-purple-600",
  },
  display: {
    icon: Palette,
    label: "Display",
    description: "Visual preferences",
    gradient: "from-pink-500 to-rose-600",
  },
  notifications: {
    icon: BellRing,
    label: "Alerts",
    description: "Notification settings",
    gradient: "from-amber-500 to-orange-600",
  },
  advanced: {
    icon: Shield,
    label: "Advanced",
    description: "Power user options",
    gradient: "from-cyan-500 to-blue-600",
  },
};

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useConditionalToast();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SettingsSection>("generation");
  const [formData, setFormData] = useState({
    defaultLength: 6,
    defaultAspectRatio: "16:9",
    emailNotifications: 1,
    galleryView: "grid",
    theme: "dark",
    autoSave: 1,
    showWatermark: 1,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem("lunara-toast-notifications");
    return saved !== "false";
  });

  const toggleToastNotifications = (enabled: boolean) => {
    setToastNotificationsEnabled(enabled);
    localStorage.setItem("lunara-toast-notifications", String(enabled));
    toast({
      title: enabled ? "Notifications Enabled" : "Notifications Disabled",
      description: enabled ? "You will now see cosmic alerts." : "Alerts will be suppressed.",
    });
  };

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

  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultLength: settings.defaultLength,
        defaultAspectRatio: settings.defaultAspectRatio,
        emailNotifications: settings.emailNotifications,
        galleryView: settings.galleryView,
        theme: settings.theme,
        autoSave: settings.autoSave,
        showWatermark: settings.showWatermark ?? 1,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      const response = await apiRequest("PATCH", "/api/settings", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your cosmic preferences have been updated.",
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
    if (field === "theme") {
      setTheme(value as "light" | "dark");
    }
  };

  const resetToDefaults = () => {
    const defaults = {
      defaultLength: 6,
      defaultAspectRatio: "16:9",
      emailNotifications: 1,
      galleryView: "grid",
      theme: "dark",
      autoSave: 1,
      showWatermark: 1,
    };
    setFormData(defaults);
    setHasChanges(true);
    toast({
      title: "Defaults Restored",
      description: "Settings reset to default values.",
    });
  };

  const isLoading = authLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur-2xl opacity-50 animate-pulse" />
            <div className="relative p-6 bg-white/10 dark:bg-slate-900/50 backdrop-blur-2xl rounded-full border border-white/20 dark:border-slate-700/40">
              <SettingsIcon className="w-12 h-12 text-primary animate-spin" style={{ animationDuration: "3s" }} />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-foreground dark:text-white">Loading Settings</p>
            <p className="text-sm text-muted-foreground">Preparing your cosmic preferences...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:py-12 bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900 overflow-hidden">
      <MoonMenu />

      {/* Floating Cosmic Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[15%] w-64 h-64 bg-gradient-to-br from-primary/20 to-secondary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 25, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-40 left-[10%] w-96 h-96 bg-gradient-to-br from-secondary/15 to-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 right-[5%] w-48 h-48 bg-gradient-to-br from-violet-500/10 to-pink-500/10 rounded-full blur-2xl"
        />
      </div>

      <div className="relative max-w-6xl mx-auto space-y-8 pt-6 md:pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/30 dark:bg-slate-800/40 backdrop-blur-xl rounded-full border border-white/40 dark:border-slate-700/40">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground dark:text-white uppercase tracking-widest">Settings</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Preferences
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
            Fine-tune your Lunara experience with cosmic precision
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Section Navigation - Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:sticky lg:top-8 lg:self-start space-y-2"
          >
            <div className="p-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-xl">
              {(Object.entries(sectionConfig) as [SettingsSection, typeof sectionConfig.generation][]).map(
                ([key, config], idx) => {
                  const Icon = config.icon;
                  const isActive = activeSection === key;
                  return (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 + 0.2 }}
                      onClick={() => setActiveSection(key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/40 shadow-lg"
                          : "hover:bg-white/30 dark:hover:bg-slate-800/40"
                      }`}
                      data-testid={`button-section-${key}`}
                    >
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} ${
                          isActive ? "shadow-lg" : "opacity-70"
                        } transition-all`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-bold ${isActive ? "text-foreground dark:text-white" : "text-muted-foreground"}`}>
                          {config.label}
                        </p>
                        <p className="text-xs text-muted-foreground hidden sm:block">{config.description}</p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${isActive ? "text-primary rotate-90" : "text-muted-foreground"}`}
                      />
                    </motion.button>
                  );
                }
              )}
            </div>

            {/* Quick Stats */}
            <div className="p-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 rounded-2xl hidden lg:block">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Quick Info</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Theme</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {formData.theme === "dark" ? <MoonIcon className="w-3 h-3 mr-1" /> : <Sun className="w-3 h-3 mr-1" />}
                    {formData.theme}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Default Length</span>
                  <Badge variant="outline" className="text-xs">{formData.defaultLength}s</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Aspect Ratio</span>
                  <Badge variant="outline" className="text-xs">{formData.defaultAspectRatio}</Badge>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <AnimatePresence mode="wait">
              {/* Generation Settings */}
              {activeSection === "generation" && (
                <motion.div
                  key="generation"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <SettingsCard
                    icon={Clock}
                    title="Default Video Length"
                    description="Set your preferred duration for new video generations"
                    gradient="from-violet-500 to-purple-600"
                  >
                    <div className="flex gap-2 flex-wrap">
                      {VIDEO_LENGTHS.map((length) => (
                        <Button
                          key={length}
                          type="button"
                          variant={formData.defaultLength === length ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateField("defaultLength", length)}
                          className={`min-w-[80px] transition-all duration-300 ${
                            formData.defaultLength === length ? "bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30" : ""
                          }`}
                          data-testid={`button-length-${length}`}
                        >
                          <Film className="w-3 h-3 mr-1.5" />
                          {length}s
                          {length === 8 && <Zap className="w-3 h-3 ml-1 text-amber-400" />}
                        </Button>
                      ))}
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    icon={Ratio}
                    title="Default Aspect Ratio"
                    description="Choose your preferred video format for different platforms"
                    gradient="from-pink-500 to-rose-600"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "1:1", label: "Square", platform: "Instagram" },
                        { value: "16:9", label: "Wide", platform: "YouTube" },
                        { value: "9:16", label: "Tall", platform: "TikTok" },
                      ].map((ratio) => (
                        <Button
                          key={ratio.value}
                          type="button"
                          variant={formData.defaultAspectRatio === ratio.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateField("defaultAspectRatio", ratio.value)}
                          className={`flex-col h-auto py-3 transition-all duration-300 ${
                            formData.defaultAspectRatio === ratio.value
                              ? "bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30"
                              : ""
                          }`}
                          data-testid={`button-ratio-${ratio.value.replace(":", "-")}`}
                        >
                          <span className="text-sm font-bold">{ratio.value}</span>
                          <span className="text-[10px] opacity-70">{ratio.platform}</span>
                        </Button>
                      ))}
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    icon={HardDrive}
                    title="Auto-Save to Gallery"
                    description="Automatically save all generated videos to your gallery"
                    gradient="from-emerald-500 to-teal-600"
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        id="autoSave"
                        checked={formData.autoSave === 1}
                        onCheckedChange={(checked) => updateField("autoSave", checked ? 1 : 0)}
                        data-testid="switch-autosave"
                      />
                      <Label htmlFor="autoSave" className="text-sm font-medium cursor-pointer">
                        {formData.autoSave === 1 ? (
                          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Check className="w-4 h-4" /> Enabled
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Disabled</span>
                        )}
                      </Label>
                    </div>
                  </SettingsCard>
                </motion.div>
              )}

              {/* Display Settings */}
              {activeSection === "display" && (
                <motion.div
                  key="display"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <SettingsCard
                    icon={Palette}
                    title="Color Theme"
                    description="Choose between light and dark cosmic themes"
                    gradient="from-amber-500 to-orange-600"
                  >
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={formData.theme === "light" ? "default" : "outline"}
                          onClick={() => updateField("theme", "light")}
                          className={`flex-1 h-auto py-4 transition-all duration-300 ${
                            formData.theme === "light"
                              ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30"
                              : ""
                          }`}
                          data-testid="button-theme-light"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Sun className="w-6 h-6" />
                            <span className="font-bold">Light</span>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          variant={formData.theme === "dark" ? "default" : "outline"}
                          onClick={() => updateField("theme", "dark")}
                          className={`flex-1 h-auto py-4 transition-all duration-300 ${
                            formData.theme === "dark"
                              ? "bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/30"
                              : ""
                          }`}
                          data-testid="button-theme-dark"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <MoonIcon className="w-6 h-6" />
                            <span className="font-bold">Dark</span>
                          </div>
                        </Button>
                      </div>

                      {/* Theme Preview */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            formData.theme === "light"
                              ? "border-primary bg-white shadow-lg"
                              : "border-transparent bg-slate-100 dark:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                          </div>
                          <div className="space-y-2">
                            <div className="h-2 bg-gray-200 rounded w-full" />
                            <div className="h-2 bg-gray-200 rounded w-3/4" />
                            <div className="h-2 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                        <div
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            formData.theme === "dark"
                              ? "border-primary bg-slate-900 shadow-lg shadow-primary/20"
                              : "border-transparent bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          </div>
                          <div className="space-y-2">
                            <div className="h-2 bg-slate-700 rounded w-full" />
                            <div className="h-2 bg-slate-700 rounded w-3/4" />
                            <div className="h-2 bg-slate-700 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    icon={Layers}
                    title="Gallery Layout"
                    description="How your videos appear in the gallery"
                    gradient="from-cyan-500 to-blue-600"
                  >
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={formData.galleryView === "grid" ? "default" : "outline"}
                        onClick={() => updateField("galleryView", "grid")}
                        className={`flex-1 h-auto py-4 transition-all duration-300 ${
                          formData.galleryView === "grid"
                            ? "bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30"
                            : ""
                        }`}
                        data-testid="button-gallery-grid"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Grid3x3 className="w-6 h-6" />
                          <span className="font-bold">Grid</span>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={formData.galleryView === "list" ? "default" : "outline"}
                        onClick={() => updateField("galleryView", "list")}
                        className={`flex-1 h-auto py-4 transition-all duration-300 ${
                          formData.galleryView === "list"
                            ? "bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30"
                            : ""
                        }`}
                        data-testid="button-gallery-list"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <List className="w-6 h-6" />
                          <span className="font-bold">List</span>
                        </div>
                      </Button>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    icon={Droplet}
                    title="Lunara Watermark"
                    description={
                      user?.membershipTier === "pro" || user?.membershipTier === "premium"
                        ? "Control the Lunara watermark on your videos"
                        : "Upgrade to Pro or Premium to remove the watermark"
                    }
                    gradient="from-violet-500 to-fuchsia-600"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Switch
                          id="showWatermark"
                          checked={formData.showWatermark === 1}
                          onCheckedChange={(checked) => {
                            if (user?.membershipTier === "pro" || user?.membershipTier === "premium") {
                              updateField("showWatermark", checked ? 1 : 0);
                            }
                          }}
                          disabled={user?.membershipTier !== "pro" && user?.membershipTier !== "premium"}
                          data-testid="switch-watermark"
                        />
                        <Label htmlFor="showWatermark" className="text-sm font-medium cursor-pointer">
                          {formData.showWatermark === 1 ? (
                            <span className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                              <Droplet className="w-4 h-4" /> Visible
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                              <Check className="w-4 h-4" /> Hidden
                            </span>
                          )}
                        </Label>
                      </div>
                      {user?.membershipTier !== "pro" && user?.membershipTier !== "premium" && (
                        <Badge variant="secondary" className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          <Crown className="w-3 h-3 mr-1" />
                          Pro+
                        </Badge>
                      )}
                    </div>
                    {user?.membershipTier !== "pro" && user?.membershipTier !== "premium" && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Basic members have a subtle Lunara watermark on videos. Upgrade to Pro or Premium to remove it.
                      </p>
                    )}
                  </SettingsCard>
                </motion.div>
              )}

              {/* Notification Settings */}
              {activeSection === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <SettingsCard
                    icon={Mail}
                    title="Email Notifications"
                    description="Receive updates about your account, videos, and features"
                    gradient="from-violet-500 to-purple-600"
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        id="emailNotifications"
                        checked={formData.emailNotifications === 1}
                        onCheckedChange={(checked) => updateField("emailNotifications", checked ? 1 : 0)}
                        data-testid="switch-notifications"
                      />
                      <Label htmlFor="emailNotifications" className="text-sm font-medium cursor-pointer">
                        {formData.emailNotifications === 1 ? (
                          <span className="flex items-center gap-2 text-primary">
                            <Bell className="w-4 h-4" /> Subscribed
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Unsubscribed</span>
                        )}
                      </Label>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    icon={MonitorSmartphone}
                    title="In-App Notifications"
                    description="Show toast notifications for actions and updates"
                    gradient="from-pink-500 to-rose-600"
                  >
                    <div className="flex items-center gap-4">
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
                      <Label htmlFor="toastNotifications" className="text-sm font-medium cursor-pointer">
                        {toastNotificationsEnabled ? (
                          <span className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                            <Volume2 className="w-4 h-4" /> Active
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Silenced</span>
                        )}
                      </Label>
                    </div>
                  </SettingsCard>
                </motion.div>
              )}

              {/* Advanced Settings */}
              {activeSection === "advanced" && (
                <motion.div
                  key="advanced"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <SettingsCard
                    icon={RotateCcw}
                    title="Reset to Defaults"
                    description="Restore all settings to their original values"
                    gradient="from-amber-500 to-orange-600"
                  >
                    <Button
                      variant="outline"
                      onClick={resetToDefaults}
                      className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                      data-testid="button-reset-defaults"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset All Settings
                    </Button>
                  </SettingsCard>

                  <SettingsCard
                    icon={Download}
                    title="Export Data"
                    description="Download a copy of your settings and preferences"
                    gradient="from-emerald-500 to-teal-600"
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        const data = JSON.stringify({ settings: formData, exportedAt: new Date().toISOString() }, null, 2);
                        const blob = new Blob([data], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "lunara-settings.json";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "Exported", description: "Settings downloaded successfully." });
                      }}
                      className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      data-testid="button-export-settings"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Settings
                    </Button>
                  </SettingsCard>

                  <SettingsCard
                    icon={Keyboard}
                    title="Keyboard Shortcuts"
                    description="Quick actions for power users"
                    gradient="from-cyan-500 to-blue-600"
                  >
                    <div className="grid gap-2 text-xs">
                      {[
                        { keys: ["⌘", "G"], action: "Open Gallery" },
                        { keys: ["⌘", "N"], action: "New Generation" },
                        { keys: ["⌘", ","], action: "Open Settings" },
                        { keys: ["⌘", "K"], action: "Quick Search" },
                      ].map((shortcut, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-white/10 dark:border-slate-700/30 last:border-0">
                          <span className="text-muted-foreground">{shortcut.action}</span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, i) => (
                              <kbd
                                key={i}
                                className="px-2 py-1 bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-slate-700/40 rounded text-foreground dark:text-white font-mono"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SettingsCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save Actions - Fixed Bottom Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="sticky bottom-4 z-10"
            >
              <div className="p-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {hasChanges ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All saved</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (settings) {
                        setFormData({
                          defaultLength: settings.defaultLength,
                          defaultAspectRatio: settings.defaultAspectRatio,
                          emailNotifications: settings.emailNotifications,
                          galleryView: settings.galleryView,
                          theme: settings.theme,
                          autoSave: settings.autoSave,
                          showWatermark: settings.showWatermark ?? 1,
                        });
                        setHasChanges(false);
                      }
                    }}
                    disabled={!hasChanges || updateMutation.isPending}
                    data-testid="button-reset-settings"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Revert
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || updateMutation.isPending}
                    className="bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                    data-testid="button-save-settings"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1.5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Reusable Settings Card Component
function SettingsCard({
  icon: Icon,
  title,
  description,
  gradient,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative p-6 bg-white/50 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative space-y-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground dark:text-white">{title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="pt-2">{children}</div>
      </div>
    </motion.div>
  );
}
