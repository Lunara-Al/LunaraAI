import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Loader2, LogIn, Moon, User, Lock, Eye, EyeOff } from "lucide-react";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  // Theme-aware login page (no longer force dark mode)

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usernameOrEmail: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to Lunara AI",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      if (error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          form.setError(field as any, { message: String(message) });
        });
      } else {
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/20 dark:from-background dark:via-slate-950 dark:to-slate-900 transition-colors duration-300 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-25 dark:opacity-20">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/20 dark:bg-primary/15 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-secondary/20 dark:bg-secondary/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md space-y-6 animate-fade-in-up relative z-10">
        <div className="text-center space-y-3">
          <div className="flex justify-center animate-fade-in-scale">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 dark:from-primary/20 dark:to-secondary/20 moon-glow transition-all duration-300 shadow-lg">
              <Moon className="w-12 h-12 text-primary animate-float-slow" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent" style={{ backgroundSize: '200% 200%' }}>
            Welcome Back
          </h1>
          <p className="text-sm md:text-base text-muted-foreground" style={{ animationDelay: '150ms' }}>Sign in to continue your cosmic journey</p>
        </div>

        <Card className="glass-card hover-shadow transition-all duration-300 animate-fade-in-scale" style={{ animationDelay: '200ms' }}>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usernameOrEmail" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username or Email
                </Label>
                <Input
                  id="usernameOrEmail"
                  placeholder="cosmic_dreamer or you@example.com"
                  data-testid="input-username-email"
                  {...form.register("usernameOrEmail")}
                />
                {form.formState.errors.usernameOrEmail && (
                  <p className="text-sm text-destructive">{form.formState.errors.usernameOrEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    data-testid="input-password"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary moon-glow transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ripple"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Sign In
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-replit-login"
              >
                <Moon className="w-4 h-4 mr-2" />
                Sign in with Replit
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
