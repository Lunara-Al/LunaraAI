// App routing with Replit Auth integration
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { ErrorBoundary } from "@/components/error-boundary";
import Landing from "@/pages/landing";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Gallery from "@/pages/gallery";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import Membership from "@/pages/membership";
import Contact from "@/pages/contact";
import UserProfile from "@/pages/user-profile";
import SharePage from "@/pages/share";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/register">{isAuthenticated ? <Home /> : <Register />}</Route>
      <Route path="/login">{isAuthenticated ? <Home /> : <Login />}</Route>
      <Route path="/contact" component={Contact} />
      <Route path="/s/:token" component={SharePage} />
      <Route path="/gallery">{isAuthenticated ? <Gallery /> : <Landing />}</Route>
      <Route path="/settings">{isAuthenticated ? <Settings /> : <Landing />}</Route>
      <Route path="/profile">{isAuthenticated ? <Profile /> : <Landing />}</Route>
      <Route path="/membership">{isAuthenticated ? <Membership /> : <Landing />}</Route>
      <Route path="/user/:username" component={UserProfile} />
      <Route path="/">{isAuthenticated ? <Home /> : <Landing />}</Route>
      <Route>{isAuthenticated ? <NotFound /> : <Landing />}</Route>
    </Switch>
  );
}

function SyncProvider() {
  // Initialize real-time sync
  useRealtimeSync();
  return <Router />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <SyncProvider />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
