import { User, Mail, Calendar as CalendarIcon, LogOut, Crown, Trash2, Upload, Edit2, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
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
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
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

  const handleDeleteAccount = () => {
    if (deletePassword) {
      deleteAccountMutation.mutate(deletePassword);
      setIsDeleteDialogOpen(false);
      setDeletePassword("");
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
    <div className="min-h-screen px-4 py-8 md:p-8 bg-gradient-to-br from-white via-white to-slate-50 dark:from-black dark:via-black dark:to-slate-950">
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
      
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="text-center space-y-2 md:space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Your cosmic account information</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 md:p-8 space-y-8 hover-elevate transition-all duration-300">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative animate-in fade-in zoom-in duration-500 group" style={{ animationDelay: '100ms' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPicture}
                className="relative cursor-pointer transition-all duration-200 hover-elevate rounded-full"
                data-testid="button-upload-profile-picture"
              >
                <Avatar className="w-24 h-24 md:w-32 md:h-32 ring-2 ring-primary/20">
                  <AvatarImage src={user.profileImageUrl || ""} alt={displayName} />
                  <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  {isUploadingPicture ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-white" />
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
            <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{displayName}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">Click avatar to change profile picture</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/30">
                  {user.membershipTier} Plan
                </Badge>
                {user.membershipTier !== "free" && (
                  <Crown className="w-5 h-5 text-primary animate-pulse" />
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="mt-2"
                data-testid="button-edit-profile"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 border border-transparent hover:border-primary/10">
              <User className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">User ID</h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">{user.id}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 border border-transparent hover:border-primary/10">
              <Mail className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Email</h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">{user.email || 'No email provided'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 border border-transparent hover:border-primary/10">
              <CalendarIcon className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Member Since</h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">{createdDate}</p>
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

      {/* Content Calendar Section */}
      <div className="max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
        <ContentCalendar user={user} />
      </div>

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

      {/* Delete Account Dialog - Password Verification */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
          setDeletePassword("");
          setDeleteConfirmation("");
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            {/* Warning Section */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="text-destructive text-xl mt-0.5">⚠️</div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-destructive text-sm">This action is permanent</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>All your videos will be deleted forever</li>
                    <li>Your profile and account data will be erased</li>
                    <li>You cannot undo this action</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="delete-password" className="text-sm font-semibold block">
                Enter your password to delete your account
              </label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-delete-password"
                autoFocus
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeletePassword("")}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleDeleteAccount}
              disabled={!deletePassword || deleteAccountMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
