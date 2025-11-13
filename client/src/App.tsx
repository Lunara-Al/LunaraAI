// App routing with Replit Auth integration
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Gallery from "@/pages/gallery";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import Membership from "@/pages/membership";
import Contact from "@/pages/contact";
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
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/register" component={Register} />
          <Route path="/login" component={Login} />
          <Route component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/gallery" component={Gallery} />
          <Route path="/settings" component={Settings} />
          <Route path="/profile" component={Profile} />
          <Route path="/membership" component={Membership} />
          <Route path="/contact" component={Contact} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
