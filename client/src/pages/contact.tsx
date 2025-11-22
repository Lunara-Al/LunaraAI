import { Mail, MessageSquare, Send, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import MoonMenu from "@/components/moon-menu";

export default function Contact() {
  const [isDiscordOpen, setIsDiscordOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = (name: string, email: string, message: string) => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!message.trim()) {
      newErrors.message = "Message is required";
    } else if (message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; message: string }) => {
      return apiRequest("POST", "/api/contact/send-message", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      setErrors({});
      if (formRef.current) {
        formRef.current.reset();
      }
      toast({ 
        title: "Message sent!", 
        description: "Thank you for reaching out. We'll get back to you soon.",
        duration: 4000
      });
      setTimeout(() => setIsSubmitted(false), 4000);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to send message. Please try again.", 
        variant: "destructive",
        duration: 4000
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (!validateForm(name, email, message)) {
      return;
    }

    sendMessageMutation.mutate({ name, email, message });
  };
  return (
    <div className="min-h-screen px-4 py-8 md:p-8 bg-gradient-to-br from-background via-background to-card">
      <MoonMenu />
      
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-muted-foreground">Get in touch with the Lunara AI team</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Form */}
          <div className="glass-card rounded-3xl p-8 space-y-6 moon-glow">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                Send a Message
              </h2>
              <p className="text-sm text-muted-foreground">
                Fill out the form and we'll get back to you within 24 hours
              </p>
            </div>

            {isSubmitted && (
              <div className="glass rounded-2xl p-4 flex items-start gap-3 border border-primary/30 bg-primary/5 dark:bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-primary">Message sent successfully!</h3>
                  <p className="text-sm text-muted-foreground">Thank you for reaching out. We'll get back to you soon.</p>
                </div>
              </div>
            )}

            <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <div className="relative">
                  <Input 
                    id="name"
                    name="name"
                    placeholder="Your name" 
                    className={`glass-button rounded-xl transition-all ${
                      errors.name 
                        ? "border-destructive/50 focus-visible:ring-destructive/50" 
                        : "focus-visible:ring-primary/50"
                    }`}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                    data-testid="input-contact-name"
                  />
                </div>
                {errors.name && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Input 
                    id="email"
                    name="email"
                    type="email" 
                    placeholder="your@email.com"
                    className={`glass-button rounded-xl transition-all ${
                      errors.email 
                        ? "border-destructive/50 focus-visible:ring-destructive/50" 
                        : "focus-visible:ring-primary/50"
                    }`}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    data-testid="input-contact-email"
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">Message</Label>
                <div className="relative">
                  <Textarea 
                    id="message"
                    name="message"
                    placeholder="How can we help you?" 
                    rows={5}
                    className={`glass-button rounded-xl transition-all resize-none ${
                      errors.message 
                        ? "border-destructive/50 focus-visible:ring-destructive/50" 
                        : "focus-visible:ring-primary/50"
                    }`}
                    onFocus={() => setFocusedField("message")}
                    onBlur={() => setFocusedField(null)}
                    data-testid="input-contact-message"
                  />
                </div>
                {errors.message && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {errors.message}
                  </div>
                )}
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-primary to-secondary rounded-xl" 
                data-testid="button-send-message"
                disabled={sendMessageMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-8 space-y-6 moon-glow">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Get in Touch</h2>
                <p className="text-sm text-muted-foreground">
                  We're here to help and answer any questions you might have
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 glass rounded-xl">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    <p className="text-sm text-muted-foreground">support@lunara.ai</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 glass rounded-xl flex-col">
                  <div className="flex items-start gap-3 w-full">
                    <SiDiscord className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold">Our Discord</h3>
                      <p className="text-sm text-muted-foreground mb-2">Join our community for real-time support</p>
                      <button
                        onClick={() => setIsDiscordOpen(true)}
                        className="text-sm text-primary hover:text-primary/80 underline cursor-pointer transition-colors hover-elevate"
                        data-testid="button-join-discord"
                      >
                        https://discord.gg/PerbbtKM6F
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-8 space-y-3 moon-glow border border-primary/20">
              <h3 className="font-semibold text-lg">Need Quick Help?</h3>
              <p className="text-sm text-muted-foreground">
                Check out our documentation and FAQ section for instant answers to common questions.
              </p>
            </div>
          </div>
        </div>

        <Dialog open={isDiscordOpen} onOpenChange={setIsDiscordOpen}>
          <DialogContent className="sm:max-w-md glass-card border-primary/30 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <SiDiscord className="w-5 h-5 text-primary" />
                Join Our Discord Community
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Connect with our community for real-time support, updates, and discussions
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-center justify-center p-4 glass rounded-xl border border-primary/20">
                <span className="text-sm font-mono text-muted-foreground break-all">
                  https://discord.gg/PerbbtKM6F
                </span>
              </div>
              <Button
                onClick={() => window.open("https://discord.gg/PerbbtKM6F", "_blank")}
                className="w-full bg-gradient-to-r from-primary to-secondary rounded-xl"
                data-testid="button-open-discord"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Discord
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText("https://discord.gg/PerbbtKM6F");
                  setIsDiscordOpen(false);
                }}
                className="rounded-xl hover-elevate"
                data-testid="button-copy-discord-link"
              >
                Copy Invite Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
