import {
  User,
  Mail,
  Calendar as CalendarIcon,
  LogOut,
  Crown,
  Trash2,
  Upload,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Shield,
  Zap,
  Info,
  Star,
} from "lucide-react";
import MoonMenu from "@/components/moon-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState, useMemo } from "react";
import { useConditionalToast } from "@/hooks/useConditionalToast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VideoGeneration } from "@shared/schema";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { compressProfileImage, validateImageFile } from "@/lib/imageUtils";
import { ProfilePictureCropper } from "@/components/profile-picture-cropper";
import { ContentCalendar } from "@/components/content-calendar";

type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;

type UpdateProfileFormValues = UpdateProfileSchema & {
  currentPassword?: string;
  newPassword?: string;
};

type ApiFieldErrors = Record<string, string | string[]>;

interface ApiErrorShape {
  message?: string;
  errors?: ApiFieldErrors;
}

function getErrorPayload(error: unknown): ApiErrorShape {
  if (!error) return {};
  if (error instanceof Error) {
    return { message: error.message };
  }
  if (typeof error === "object") {
    const maybe = error as any;
    return {
      message: typeof maybe.message === "string" ? maybe.message : undefined,
      errors: typeof maybe.errors === "object" ? maybe.errors : undefined,
    };
  }
  return {};
}

// Password strength checker
function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  requirements: Array<{ met: boolean; label: string }>;
} {
  if (!password) {
    return { score: 0, label: "No password", color: "bg-gray-300", requirements: [] };
  }

  const requirements = [
    { met: password.length >= 8, label: "At least 8 characters" },
    { met: /[A-Z]/.test(password), label: "Uppercase letter" },
    { met: /[a-z]/.test(password), label: "Lowercase letter" },
    { met: /[0-9]/.test(password), label: "Number" },
    { met: /[^A-Za-z0-9]/.test(password), label: "Special character" },
  ];

  const score = requirements.filter((r) => r.met).length;
  let label = "Weak";
  let color = "bg-red-500";

  if (score >= 5) {
    label = "Very Strong";
    color = "bg-green-500";
  } else if (score >= 4) {
    label = "Strong";
    color = "bg-emerald-500";
  } else if (score >= 3) {
    label = "Fair";
    color = "bg-yellow-500";
  }

  return { score, label, color, requirements };
}

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useConditionalToast();
  const [, setLocation] = useLocation();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState("account");

  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imagePreviewForCropper, setImagePreviewForCropper] = useState<string | null>(null);

  const [deletePasswordVerification, setDeletePasswordVerification] = useState<
    "verifying" | "correct" | "incorrect" | null
  >(null);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const verifyPasswordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      username: user?.username || "",
      currentPassword: "",
      newPassword: "",
    },
  });

  const newPassword = form.watch("newPassword");
  const passwordStrength = useMemo(() => calculatePasswordStrength(newPassword || ""), [newPassword]);

  const uploadPictureMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await apiRequest("POST", "/api/profile/upload-picture", { imageData });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      if (imagePreviewForCropper) {
        URL.revokeObjectURL(imagePreviewForCropper);
      }
      setIsCropperOpen(false);
      setImagePreviewForCropper(null);
    },
    onError: (error: unknown) => {
      const { message } = getErrorPayload(error);
      toast({
        title: "Error",
        description: message || "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploadingPicture(false);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UpdateProfileFormValues>) => {
      return await apiRequest("PATCH", "/api/profile/update", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditDialogOpen(false);
      form.reset();
      setActiveTab("account");
    },
    onError: (error: unknown) => {
      const { message, errors } = getErrorPayload(error);

      if (errors) {
        Object.entries(errors).forEach(([field, msg]) => {
          const text = Array.isArray(msg) ? msg.join(", ") : String(msg);
          form.setError(field as keyof UpdateProfileFormValues, { message: text });
        });
      }

      toast({
        title: "Error",
        description: message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/auth/verify-delete-password", { password });
      return await response.json();
    },
    onSuccess: (data: { isCorrect?: boolean }) => {
      if (data?.isCorrect) {
        setDeletePasswordVerification("correct");
      } else {
        setDeletePasswordVerification("incorrect");
      }
    },
    onError: () => {
      setDeletePasswordVerification("incorrect");
    },
  });

  const handleDeletePasswordChange = (value: string) => {
    setDeletePassword(value);

    if (verifyPasswordTimeoutRef.current) {
      clearTimeout(verifyPasswordTimeoutRef.current);
    }

    if (!value.trim()) {
      setDeletePasswordVerification(null);
      return;
    }

    setDeletePasswordVerification("verifying");

    verifyPasswordTimeoutRef.current = setTimeout(() => {
      verifyPasswordMutation.mutate(value);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (verifyPasswordTimeoutRef.current) {
        clearTimeout(verifyPasswordTimeoutRef.current);
      }
    };
  }, []);

  const isPasswordCorrect = deletePasswordVerification === "correct";

  const deleteAccountMutation = useMutation({
    mutationFn: async (password: string) => {
      return await apiRequest("POST", "/api/auth/delete-account", { password });
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
    onError: (error: unknown) => {
      const { message } = getErrorPayload(error);
      toast({
        title: "Error",
        description: message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    try {
      const preview = URL.createObjectURL(file);
      if (imagePreviewForCropper) {
        URL.revokeObjectURL(imagePreviewForCropper);
      }
      setImagePreviewForCropper(preview);
      setIsCropperOpen(true);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load image preview.",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBase64: string) => {
    setIsUploadingPicture(true);
    try {
      const response = await fetch(croppedBase64);
      const blob = await response.blob();
      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });

      const compressedBase64 = await compressProfileImage(file);
      uploadPictureMutation.mutate(compressedBase64);
    } catch (error) {
      const { message } = getErrorPayload(error);
      toast({
        title: "Error",
        description: message || "Failed to process cropped image.",
        variant: "destructive",
      });
      setIsUploadingPicture(false);
      setIsCropperOpen(false);

      if (imagePreviewForCropper) {
        URL.revokeObjectURL(imagePreviewForCropper);
        setImagePreviewForCropper(null);
      }
    }
  };

  const handleDeleteAccount = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordCorrect) {
      toast({
        title: "Error",
        description: "Please enter the correct password to delete your account.",
        variant: "destructive",
      });
      return;
    }

    deleteAccountMutation.mutate(deletePassword);
    handleCloseDeleteDialog();
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletePassword("");
    setDeletePasswordVerification(null);
    setShowDeletePassword(false);

    if (verifyPasswordTimeoutRef.current) {
      clearTimeout(verifyPasswordTimeoutRef.current);
      verifyPasswordTimeoutRef.current = null;
    }
  };

  const handleSignOut = () => {
    setIsSigningOut(true);
    try {
      window.location.href = "/api/logout";
    } catch {
      setIsSigningOut(false);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  const isBusy = isSigningOut || isUploadingPicture || updateProfileMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-purple-50/40 to-pink-50/30 dark:from-slate-950 dark:via-purple-950/30 dark:to-pink-950/20">
        <div className="flex flex-col items-center gap-4" aria-busy="true" aria-live="polite">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-lg opacity-50 animate-pulse" />
            <div className="relative w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading your cosmic profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const firstInitial = user.firstName?.[0] || "";
  const lastInitial = user.lastName?.[0] || "";
  const userInitials = `${firstInitial}${lastInitial}`.toUpperCase() || "LU";
  const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Lunara User";
  
  let createdDate = "Unknown";
  if (user.createdAt) {
    const date = new Date(user.createdAt);
    if (!isNaN(date.getTime())) {
      createdDate = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
  }
  
  const membershipLabel = `${user.membershipTier || "Free"} Member`;
  const usernameLabel = user.username || "user";

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-white via-purple-50/40 to-pink-50/30 dark:from-slate-950 dark:via-purple-950/30 dark:to-pink-950/20 relative overflow-hidden transition-colors duration-300"
      aria-busy={isBusy}
    >
      {/* Animated cosmic background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/25 to-secondary/25 dark:from-primary/20 dark:to-secondary/20 rounded-full blur-3xl opacity-40 dark:opacity-20 animate-float-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-secondary/25 to-primary/25 dark:from-secondary/20 dark:to-primary/20 rounded-full blur-3xl opacity-40 dark:opacity-20 animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <MoonMenu />

      {imagePreviewForCropper && (
        <ProfilePictureCropper
          imagePreview={imagePreviewForCropper}
          isOpen={isCropperOpen}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setIsCropperOpen(false);
            if (imagePreviewForCropper) {
              URL.revokeObjectURL(imagePreviewForCropper);
            }
            setImagePreviewForCropper(null);
          }}
        />
      )}

      <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-12 animate-fade-in-up">
        {/* Hero Header with Cosmic Gradient */}
        <div className="text-center space-y-4 md:space-y-6 pb-6 md:pb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/15 dark:border-primary/30 backdrop-blur-sm mb-2 md:mb-4 shadow-sm animate-fade-in-scale">
            <Sparkles className="w-4 h-4 text-primary animate-pulse-glow" />
            <span className="text-xs md:text-sm font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Cosmic Account</span>
          </div>
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black bg-gradient-to-br from-primary via-secondary to-primary bg-clip-text text-transparent animate-text-gradient" style={{ backgroundSize: '200% 200%' }}>
            Profile
          </h1>
          <p className="text-sm md:text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Manage your cosmic account and customize your Lunara experience
          </p>
        </div>

        {/* Premium Glassmorphic Profile Card */}
        <div className="relative group perspective animate-fade-in-scale" style={{ animationDelay: '150ms' }}>
          {/* Enhanced glow background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-secondary/25 to-primary/30 dark:from-primary/40 dark:via-secondary/40 dark:to-primary/40 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
          
          {/* Card with dual-layer glassmorphism */}
          <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/50 dark:border-slate-700/40 rounded-3xl p-8 md:p-16 space-y-10 shadow-xl dark:shadow-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/3 via-transparent to-secondary/3 dark:from-primary/5 dark:to-secondary/5 pointer-events-none" />

            {/* Profile Header Section */}
            <div className="relative flex flex-col items-center space-y-8 animate-in zoom-in duration-700" style={{ animationDelay: "100ms" }}>
              {/* Avatar with Premium Multi-Layer Glow */}
              <div className="relative group/avatar">
                {/* Outer glow layer */}
                <div className="absolute -inset-3 bg-gradient-to-r from-primary to-secondary rounded-full blur-2xl opacity-40 group-hover/avatar:opacity-70 transition-all duration-500" />
                {/* Mid glow layer */}
                <div className="absolute -inset-2 bg-gradient-to-r from-secondary to-primary rounded-full blur-xl opacity-30 group-hover/avatar:opacity-50 transition-all duration-500" />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPicture}
                  className="relative cursor-pointer transition-all duration-300 hover-elevate"
                  data-testid="button-upload-profile-picture"
                  aria-label="Upload profile picture"
                >
                  <Avatar className="w-32 h-32 md:w-40 md:h-40 ring-4 ring-primary/50 shadow-2xl border-2 border-white/50 dark:border-slate-700/50">
                    <AvatarImage src={user.profileImageUrl || ""} alt={displayName} />
                    <AvatarFallback className="text-5xl md:text-6xl bg-gradient-to-br from-primary to-secondary text-primary-foreground font-black">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent rounded-full opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 flex items-center justify-center">
                    {isUploadingPicture ? (
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-6 h-6 text-white" />
                        <span className="text-xs text-white font-semibold">Upload</span>
                      </div>
                    )}
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                  disabled={isUploadingPicture}
                  data-testid="input-profile-picture"
                />
              </div>

              {/* User Info */}
              <div
                className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: "200ms" }}
              >
                <div className="space-y-2">
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    {displayName}
                  </h2>
                  <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-center gap-2">
                    <span className="text-primary dark:text-secondary">@</span>{usernameLabel}
                  </p>
                </div>

                {/* Membership Badge */}
                <div className="flex items-center justify-center gap-3 flex-wrap pt-4">
                  <Badge className={`px-6 py-3 h-auto font-bold capitalize text-sm md:text-base shadow-lg transition-all duration-300 rounded-full border-2 ${
                    user.membershipTier === "premium" 
                      ? "bg-gradient-to-r from-primary to-secondary text-white border-primary/80 shadow-lg shadow-primary/50" 
                      : user.membershipTier === "pro"
                      ? "bg-gradient-to-r from-primary/90 to-secondary/85 text-white border-primary/70 shadow-md shadow-primary/40"
                      : "bg-slate-200/90 dark:bg-slate-700/90 text-slate-900 dark:text-white border-slate-300/60 dark:border-slate-600/60 shadow-sm"
                  }`}>
                    <Crown className="w-4 h-4 mr-2 flex-shrink-0" />
                    {membershipLabel}
                  </Badge>
                </div>

                {/* Edit Button */}
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditDialogOpen(true);
                    setActiveTab("account");
                  }}
                  className="mt-6 px-8 py-3 h-auto text-base font-bold bg-gradient-to-r from-primary via-purple-500 to-secondary text-primary-foreground hover:shadow-2xl hover:shadow-primary/50 dark:hover:shadow-primary/40 transition-all duration-300 hover-elevate rounded-xl active-elevate-2"
                  data-testid="button-edit-profile"
                >
                  <Edit2 className="w-5 h-5 mr-2 flex-shrink-0" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* User Details Grid with Enhanced Cards */}
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 border-t border-white/20 dark:border-slate-700/30">
              {/* User ID Card */}
              <div className="group/card relative p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 hover:from-primary/8 hover:to-secondary/8 dark:hover:from-primary/15 dark:hover:to-secondary/15 transition-all duration-300 border border-slate-200/60 dark:border-slate-700/40 hover:border-primary/30 dark:hover:border-primary/40 backdrop-blur-sm hover-elevate">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-secondary/0 group-hover/card:from-primary/5 group-hover/card:to-secondary/5 rounded-2xl transition-all duration-300 pointer-events-none" />
                <div className="relative flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 text-primary dark:text-secondary shadow-lg shadow-primary/10">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      User ID
                    </p>
                    <p className="text-base font-mono text-slate-900 dark:text-white truncate mt-1.5 font-semibold">
                      {user.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Card */}
              <div className="group/card relative p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 hover:from-primary/8 hover:to-secondary/8 dark:hover:from-primary/15 dark:hover:to-secondary/15 transition-all duration-300 border border-slate-200/60 dark:border-slate-700/40 hover:border-primary/30 dark:hover:border-primary/40 backdrop-blur-sm hover-elevate">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-secondary/0 group-hover/card:from-primary/5 group-hover/card:to-secondary/5 rounded-2xl transition-all duration-300 pointer-events-none" />
                <div className="relative flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 text-primary dark:text-secondary shadow-lg shadow-primary/10">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Email
                    </p>
                    <p className="text-base text-slate-900 dark:text-white truncate mt-1.5 font-semibold">
                      {user.email || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Member Since Card */}
              <div className="group/card relative p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 hover:from-primary/8 hover:to-secondary/8 dark:hover:from-primary/15 dark:hover:to-secondary/15 transition-all duration-300 border border-slate-200/60 dark:border-slate-700/40 hover:border-primary/30 dark:hover:border-primary/40 backdrop-blur-sm hover-elevate">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-secondary/0 group-hover/card:from-primary/5 group-hover/card:to-secondary/5 rounded-2xl transition-all duration-300 pointer-events-none" />
                <div className="relative flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 text-primary dark:text-secondary shadow-lg shadow-primary/10">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Member Since
                    </p>
                    <p className="text-base text-slate-900 dark:text-white mt-1.5 font-semibold">
                      {createdDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative pt-6 border-t border-white/20 dark:border-slate-700/30 space-y-3 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={() => setIsSignOutDialogOpen(true)}
                disabled={isSigningOut}
                className="flex-1 px-6 py-3 h-auto text-base font-bold bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white hover:shadow-xl hover:shadow-slate-600/30 transition-all duration-300 hover-elevate rounded-xl active-elevate-2"
                data-testid="button-logout"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin flex-shrink-0" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-5 h-5 mr-2 flex-shrink-0" />
                    Sign Out
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex-1 px-6 py-3 h-auto text-base font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:shadow-xl hover:shadow-red-600/30 transition-all duration-300 hover-elevate rounded-xl active-elevate-2"
                data-testid="button-delete-account"
              >
                <Trash2 className="w-5 h-5 mr-2 flex-shrink-0" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        {/* Content Calendar Section */}
        <div className="relative mt-20 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: "400ms" }}>
          <ContentCalendar user={user} />
        </div>
      </div>

      {/* Sign Out Dialog */}
      <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
        <AlertDialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-700/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <LogOut className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to sign out? You'll need to log back in to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              You will be logged out from this device
            </p>
            <ul className="text-sm text-amber-800 dark:text-amber-300/90 space-y-2 ml-7">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                <span>Your videos and data will remain safe</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                <span>You can sign back in anytime</span>
              </li>
            </ul>
          </div>

          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel disabled={isSigningOut} data-testid="button-cancel-signout" className="rounded-lg">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="outline"
              className="border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg font-semibold"
              data-testid="button-confirm-signout"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin flex-shrink-0" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5 mr-2 flex-shrink-0" />
                  Sign Out
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Edit Profile Dialog with Tabs */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (open && user) {
            form.reset({
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              email: user.email || "",
              username: user.username || "",
              currentPassword: "",
              newPassword: "",
            });
            setActiveTab("account");
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-700/40 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Edit Profile
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 text-base">
              Update your profile information and settings securely.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1">
              <TabsTrigger value="account" className="flex items-center gap-2 rounded-md font-semibold">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 rounded-md font-semibold">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => {
                  const cleanData: Partial<UpdateProfileFormValues> = {};

                  const trimmedFirstName = data.firstName?.trim();
                  const trimmedLastName = data.lastName?.trim();
                  const trimmedEmail = data.email?.trim();
                  const trimmedUsername = data.username?.trim();

                  if (trimmedFirstName && trimmedFirstName !== (user.firstName || "")) {
                    cleanData.firstName = trimmedFirstName;
                  }
                  if (trimmedLastName && trimmedLastName !== (user.lastName || "")) {
                    cleanData.lastName = trimmedLastName;
                  }
                  if (trimmedEmail && trimmedEmail !== (user.email || "")) {
                    cleanData.email = trimmedEmail;
                  }
                  if (trimmedUsername && trimmedUsername !== (user.username || "")) {
                    cleanData.username = trimmedUsername;
                  }

                  if (data.currentPassword && data.newPassword) {
                    cleanData.currentPassword = data.currentPassword;
                    cleanData.newPassword = data.newPassword;
                  }

                  if (Object.keys(cleanData).length === 0) {
                    toast({
                      title: "No Changes",
                      description: "No changes were made to your profile.",
                    });
                    return;
                  }

                  updateProfileMutation.mutate(cleanData);
                })}
                className="space-y-6"
              >
                {/* Account Tab */}
                <TabsContent value="account" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground border-b pb-3">
                      <User className="w-4 h-4" />
                      Personal Information
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="First name"
                                {...field}
                                data-testid="input-edit-firstName"
                                className="rounded-lg border-slate-200/60 dark:border-slate-700/40"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Last name"
                                {...field}
                                data-testid="input-edit-lastName"
                                className="rounded-lg border-slate-200/60 dark:border-slate-700/40"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground border-b pb-3">
                      <Mail className="w-4 h-4" />
                      Contact Information
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              {...field}
                              data-testid="input-edit-email"
                              className="rounded-lg border-slate-200/60 dark:border-slate-700/40"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="username"
                              {...field}
                              data-testid="input-edit-username"
                              className="rounded-lg border-slate-200/60 dark:border-slate-700/40"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Letters, numbers, and underscores only. Must be unique.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-6 mt-6">
                  {user?.hasPassword ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground border-b pb-3">
                        <Shield className="w-4 h-4" />
                        Password Management
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Leave password fields empty if you don't want to change your password.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <Lock className="w-4 h-4" />
                              Current Password
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showCurrentPassword ? "text" : "password"}
                                  placeholder="Enter current password"
                                  {...field}
                                  data-testid="input-edit-currentPassword"
                                  className="rounded-lg border-slate-200/60 dark:border-slate-700/40 pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                                  tabIndex={-1}
                                  data-testid="button-toggle-current-password"
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              New Password
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showNewPassword ? "text" : "password"}
                                  placeholder="Enter new password"
                                  {...field}
                                  data-testid="input-edit-newPassword"
                                  className="rounded-lg border-slate-200/60 dark:border-slate-700/40 pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() => setShowNewPassword((prev) => !prev)}
                                  tabIndex={-1}
                                  data-testid="button-toggle-new-password"
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                              Must be at least 8 characters with uppercase, lowercase, and number.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Password Strength Indicator */}
                      {newPassword && (
                        <div className="space-y-3 pt-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Password Strength</span>
                            <Badge variant="outline" className={`${passwordStrength.color} text-white border-0`}>
                              {passwordStrength.label}
                            </Badge>
                          </div>

                          {/* Strength Bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${passwordStrength.color} transition-all duration-300`}
                              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            />
                          </div>

                          {/* Requirements Checklist */}
                          <div className="space-y-2 pt-2">
                            {passwordStrength.requirements.map((req, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                {req.met ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                )}
                                <span className={req.met ? "text-green-700 dark:text-green-400 font-medium" : "text-slate-500 dark:text-slate-400"}>
                                  {req.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-6 text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                        Password Management Not Available
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300/80">
                        You're using Replit authentication. Sign in with your password first to manage it.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Form Footer */}
                <div className="flex gap-3 pt-6 border-t border-slate-200/50 dark:border-slate-700/30">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-lg border-slate-200/60 dark:border-slate-700/40 font-semibold"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      form.reset();
                    }}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover-elevate active-elevate-2"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDeleteDialog();
          else setIsDeleteDialogOpen(true);
        }}
      >
        <AlertDialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-700/40 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This action cannot be undone. Enter your password to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-5">
              <h4 className="font-bold text-red-700 dark:text-red-400 text-base mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                This action is permanent
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300/90 space-y-2 ml-7">
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span>All your videos will be deleted forever</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span>Your profile and account data will be erased</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span>You cannot undo this action</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <label htmlFor="delete-password" className="text-base font-bold block">
                Enter your password to confirm
              </label>

              <div className="relative">
                <Input
                  id="delete-password"
                  type={showDeletePassword ? "text" : "password"}
                  value={deletePassword}
                  onChange={(e) => handleDeletePasswordChange(e.target.value)}
                  placeholder="Enter your password"
                  disabled={deleteAccountMutation.isPending}
                  aria-label="Password for account deletion"
                  aria-invalid={deletePasswordVerification === "incorrect"}
                  data-testid="input-delete-password"
                  autoFocus
                  className={`pl-11 pr-10 transition-colors rounded-lg border-slate-200/60 dark:border-slate-700/40 ${
                    deletePasswordVerification === "incorrect"
                      ? "border-red-500 focus:border-red-500"
                      : deletePasswordVerification === "correct"
                      ? "border-green-500 focus:border-green-500"
                      : ""
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowDeletePassword((prev) => !prev)}
                  disabled={deleteAccountMutation.isPending || !deletePassword}
                  aria-label={showDeletePassword ? "Hide password" : "Show password"}
                  data-testid="button-toggle-password-visibility"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1"
                >
                  {showDeletePassword ? (
                    <EyeOff className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Eye className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>

                {deletePasswordVerification === "verifying" && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin flex-shrink-0 pointer-events-none" />
                )}
                {deletePasswordVerification === "incorrect" && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 flex-shrink-0 pointer-events-none" />
                )}
                {deletePasswordVerification === "correct" && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 flex-shrink-0 pointer-events-none" />
                )}
              </div>

              {deletePasswordVerification === "verifying" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5" aria-live="polite">
                  <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                  Verifying password...
                </p>
              )}

              {deletePasswordVerification === "incorrect" && (
                <p className="text-xs text-red-600 dark:text-red-500 flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Incorrect password. Try again.
                </p>
              )}

              {deletePasswordVerification === "correct" && (
                <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Password verified. Ready to delete.
                </p>
              )}
            </div>

            <AlertDialogFooter className="mt-6 gap-3">
              <AlertDialogCancel
                onClick={handleCloseDeleteDialog}
                disabled={deleteAccountMutation.isPending}
                data-testid="button-cancel-delete"
                className="rounded-lg"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={!isPasswordCorrect || deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover-elevate active-elevate-2"
                data-testid="button-confirm-delete"
              >
                {deleteAccountMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin flex-shrink-0" />
                    Deleting Account...
                  </>
                ) : !isPasswordCorrect ? (
                  <>
                    <Lock className="w-5 h-5 mr-2 flex-shrink-0" />
                    Enter Correct Password
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 mr-2 flex-shrink-0" />
                    Permanently Delete
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
