import { User, Mail, Calendar as CalendarIcon, LogOut, Crown, Trash2, Upload, Edit2, Eye, EyeOff, Lock, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { useConditionalToast } from "@/hooks/useConditionalToast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useConditionalToast();
  const [, setLocation] = useLocation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imagePreviewForCropper, setImagePreviewForCropper] = useState<string | null>(null);

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      username: user?.username || "",
    },
  });

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
      setIsCropperOpen(false);
      setImagePreviewForCropper(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploadingPicture(false);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateProfileSchema>) => {
      return await apiRequest("PATCH", "/api/profile/update", data);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      const fieldErrors = error.errors;
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, message]) => {
          form.setError(field as any, { message: message as string });
        });
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [deletePasswordVerification, setDeletePasswordVerification] = useState<"verifying" | "correct" | "incorrect" | null>(null);
  const [deletePasswordFocused, setDeletePasswordFocused] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Debounce timer for password verification
  const verifyPasswordTimeoutRef = useRef<NodeJS.Timeout>();

  // Verify password as user types
  const verifyPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      return await apiRequest("POST", "/api/auth/verify-delete-password", { password });
    },
    onSuccess: (data: any) => {
      if (data.isCorrect) {
        setDeletePasswordVerification("correct");
      } else {
        setDeletePasswordVerification("incorrect");
      }
    },
    onError: () => {
      setDeletePasswordVerification("incorrect");
    },
  });

  // Handle password input with debouncing
  const handleDeletePasswordChange = (value: string) => {
    setDeletePassword(value);

    // Clear previous timeout
    if (verifyPasswordTimeoutRef.current) {
      clearTimeout(verifyPasswordTimeoutRef.current);
    }

    if (!value.trim()) {
      setDeletePasswordVerification(null);
      return;
    }

    // Set verifying state immediately
    setDeletePasswordVerification("verifying");

    // Debounce the verification request (500ms)
    verifyPasswordTimeoutRef.current = setTimeout(() => {
      verifyPasswordMutation.mutate(value);
    }, 500);
  };

  // Cleanup on unmount
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
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to delete account. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setImagePreviewForCropper(preview);
      setIsCropperOpen(true);
    } catch (error) {
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
      // Convert data URL to blob
      const response = await fetch(croppedBase64);
      const blob = await response.blob();
      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      
      // Compress the cropped image
      const compressedBase64 = await compressProfileImage(file);
      uploadPictureMutation.mutate(compressedBase64);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process cropped image.",
        variant: "destructive",
      });
      setIsUploadingPicture(false);
      setIsCropperOpen(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only allow deletion if password is verified as correct
    if (!isPasswordCorrect) {
      toast({
        title: "Error",
        description: "Please enter the correct password to delete your account.",
        variant: "destructive",
      });
      return;
    }

    deleteAccountMutation.mutate(deletePassword);
    setIsDeleteDialogOpen(false);
    setDeletePassword("");
    setDeletePasswordVerification(null);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletePassword("");
    setDeletePasswordVerification(null);
    setDeletePasswordFocused(false);
    setDeleteConfirmation("");
    setShowDeletePassword(false);

    // Clear any pending verification timeout
    if (verifyPasswordTimeoutRef.current) {
      clearTimeout(verifyPasswordTimeoutRef.current);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-white to-slate-50 dark:from-black dark:via-black dark:to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'LU';
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Lunara User';
  const createdDate = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-black dark:to-slate-900">
      <MoonMenu />

      {/* Image Cropper Modal */}
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
      
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 space-y-8 animate-in fade-in duration-500">
        {/* Hero Header */}
        <div className="text-center space-y-3 md:space-y-4 pb-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent drop-shadow-sm">
            Profile
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium">Manage your cosmic account</p>
        </div>

        {/* Premium Profile Card */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-8 md:p-12 space-y-8 shadow-2xl dark:shadow-2xl">
            
            {/* Profile Header Section */}
            <div className="flex flex-col items-center space-y-6 animate-in zoom-in duration-500" style={{ animationDelay: '100ms' }}>
              {/* Avatar with Premium Glow */}
              <div className="relative group/avatar">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur-2xl opacity-30 group-hover/avatar:opacity-60 transition-all duration-500" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPicture}
                  className="relative cursor-pointer transition-all duration-300 hover-elevate"
                  data-testid="button-upload-profile-picture"
                >
                  <Avatar className="w-28 h-28 md:w-36 md:h-36 ring-4 ring-primary/40 shadow-2xl">
                    <AvatarImage src={user.profileImageUrl || ""} alt={displayName} />
                    <AvatarFallback className="text-4xl md:text-5xl bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 flex items-center justify-center">
                    {isUploadingPicture ? (
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-white" />
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
              <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{displayName}</h2>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">@{user.username || 'user'}</p>
                </div>
                
                {/* Membership Badge */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Badge className="px-4 py-2 bg-gradient-to-r from-primary/20 to-secondary/20 text-primary dark:text-secondary border-primary/40 font-semibold capitalize text-xs md:text-sm">
                    <Crown className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    {user.membershipTier} Member
                  </Badge>
                </div>

                {/* Edit Button */}
                <Button
                  onClick={() => setIsEditDialogOpen(true)}
                  className="mt-4 px-6 py-2 h-auto text-sm font-semibold bg-gradient-to-r from-primary via-purple-500 to-secondary text-primary-foreground hover:shadow-xl hover:shadow-primary/40 dark:hover:shadow-primary/30 transition-all duration-300 hover-elevate rounded-lg"
                  data-testid="button-edit-profile"
                >
                  <Edit2 className="w-4 h-4 mr-2 flex-shrink-0" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
              {/* User ID */}
              <div className="group/card p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 hover:from-primary/5 hover:to-secondary/5 dark:hover:from-primary/10 dark:hover:to-secondary/10 transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50 hover:border-primary/30 dark:hover:border-primary/20 hover-elevate">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/15 text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">User ID</p>
                    <p className="text-sm font-mono text-slate-900 dark:text-white truncate mt-1">{user.id}</p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="group/card p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 hover:from-primary/5 hover:to-secondary/5 dark:hover:from-primary/10 dark:hover:to-secondary/10 transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50 hover:border-primary/30 dark:hover:border-primary/20 hover-elevate">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/15 text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-slate-900 dark:text-white truncate mt-1">{user.email || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Member Since */}
              <div className="group/card p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 hover:from-primary/5 hover:to-secondary/5 dark:hover:from-primary/10 dark:hover:to-secondary/10 transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50 hover:border-primary/30 dark:hover:border-primary/20 hover-elevate">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/15 text-primary">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Member Since</p>
                    <p className="text-sm text-slate-900 dark:text-white mt-1">{createdDate}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3 flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => setIsSignOutDialogOpen(true)}
                disabled={isSigningOut}
                className="flex-1 px-6 py-2.5 h-auto text-sm font-semibold bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white hover:shadow-lg hover:shadow-slate-600/20 transition-all duration-300 hover-elevate rounded-lg"
                data-testid="button-logout"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex-1 px-6 py-2.5 h-auto text-sm font-semibold bg-gradient-to-r from-destructive to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:shadow-lg hover:shadow-destructive/20 transition-all duration-300 hover-elevate rounded-lg"
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Calendar Section */}
      <div className="max-w-4xl mx-auto px-4 mt-20 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
        <ContentCalendar user={user} />
      </div>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to log back in to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              You will be logged out from this device
            </p>
            <ul className="text-xs text-amber-800 dark:text-amber-300/90 space-y-1.5 ml-6">
              <li>• Your videos and data will remain safe</li>
              <li>• You can sign back in anytime</li>
            </ul>
          </div>

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel
              disabled={isSigningOut}
              data-testid="button-cancel-signout"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={async () => {
                setIsSigningOut(true);
                try {
                  window.location.href = '/api/logout';
                } catch {
                  setIsSigningOut(false);
                  toast({
                    title: "Error",
                    description: "Failed to sign out. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={isSigningOut}
              variant="outline"
              className="border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
              data-testid="button-confirm-signout"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
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
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Edit Profile
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Update your personal information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit((data) => {
                const cleanData: Record<string, string> = {};
                
                // Only include fields that have changed from current values
                const trimmedFirstName = data.firstName?.trim();
                const trimmedLastName = data.lastName?.trim();
                const trimmedEmail = data.email?.trim();
                const trimmedUsername = data.username?.trim();
                
                if (trimmedFirstName && trimmedFirstName !== (user?.firstName || '')) {
                  cleanData.firstName = trimmedFirstName;
                }
                if (trimmedLastName && trimmedLastName !== (user?.lastName || '')) {
                  cleanData.lastName = trimmedLastName;
                }
                if (trimmedEmail && trimmedEmail !== (user?.email || '')) {
                  cleanData.email = trimmedEmail;
                }
                if (trimmedUsername && trimmedUsername !== (user?.username || '')) {
                  cleanData.username = trimmedUsername;
                }
                
                // Only include password fields if both are provided
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
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="First name" 
                            {...field} 
                            data-testid="input-edit-firstName"
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Last name" 
                            {...field}
                            data-testid="input-edit-lastName"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Account Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                  <Mail className="w-4 h-4" />
                  Account Information
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="your@email.com" 
                          {...field}
                          data-testid="input-edit-email"
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
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="username" 
                          {...field}
                          data-testid="input-edit-username"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Letters, numbers, and underscores only
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Password Section - Only for local auth users */}
              {user?.hasPassword && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep your current password
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter current password" 
                              {...field}
                              data-testid="input-edit-currentPassword"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              tabIndex={-1}
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
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter new password" 
                              {...field}
                              data-testid="input-edit-newPassword"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          At least 8 characters with uppercase, lowercase, and number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
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
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog - Single Step with Password Verification */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDeleteDialog();
        else setIsDeleteDialogOpen(true);
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Enter your password to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            {/* Warning Section */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h4 className="font-semibold text-destructive text-sm mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                This action is permanent
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1.5 ml-6">
                <li>• All your videos will be deleted forever</li>
                <li>• Your profile and account data will be erased</li>
                <li>• You cannot undo this action</li>
              </ul>
            </div>

            {/* Password Input Field */}
            <div className="space-y-2">
              <label htmlFor="delete-password" className="text-sm font-semibold block">
                Enter your password to confirm
              </label>

              <div className="relative">
                <Input
                  id="delete-password"
                  type={showDeletePassword ? "text" : "password"}
                  value={deletePassword}
                  onChange={(e) => handleDeletePasswordChange(e.target.value)}
                  onFocus={() => setDeletePasswordFocused(true)}
                  onBlur={() => setDeletePasswordFocused(false)}
                  placeholder="••••••••"
                  disabled={deleteAccountMutation.isPending}
                  aria-label="Password for account deletion"
                  aria-invalid={deletePasswordVerification === "incorrect"}
                  data-testid="input-delete-password"
                  autoFocus
                  className={`pl-11 pr-10 transition-colors ${
                    deletePasswordVerification === "incorrect"
                      ? "border-destructive focus:border-destructive"
                      : deletePasswordVerification === "correct"
                      ? "border-green-500 focus:border-green-500"
                      : ""
                  }`}
                />

                {/* Password Visibility Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
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

                {/* Status Icon */}
                {deletePasswordVerification === "verifying" && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin flex-shrink-0 pointer-events-none" />
                )}
                {deletePasswordVerification === "incorrect" && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive flex-shrink-0 pointer-events-none" />
                )}
                {deletePasswordVerification === "correct" && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 flex-shrink-0 pointer-events-none" />
                )}
              </div>

              {/* Verifying State */}
              {deletePasswordVerification === "verifying" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                  Verifying password...
                </p>
              )}

              {/* Incorrect Password State */}
              {deletePasswordVerification === "incorrect" && (
                <p className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Incorrect password. Try again.
                </p>
              )}

              {/* Correct Password State */}
              {deletePasswordVerification === "correct" && (
                <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Password verified. Ready to delete.
                </p>
              )}
            </div>

            {/* Footer */}
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel
                onClick={handleCloseDeleteDialog}
                disabled={deleteAccountMutation.isPending}
                data-testid="button-cancel-delete"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={!isPasswordCorrect || deleteAccountMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-confirm-delete"
              >
                {deleteAccountMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting Account...
                  </>
                ) : !isPasswordCorrect ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Enter Correct Password
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
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
