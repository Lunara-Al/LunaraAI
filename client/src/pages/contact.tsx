import { Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MoonMenu from "@/components/moon-menu";

export default function Contact() {
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
          <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                Send a Message
              </h2>
              <p className="text-sm text-muted-foreground">
                Fill out the form and we'll get back to you within 24 hours
              </p>
            </div>

            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="Your name" 
                  data-testid="input-contact-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  data-testid="input-contact-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="How can we help you?" 
                  rows={5}
                  data-testid="input-contact-message"
                />
              </div>

              <Button className="w-full bg-gradient-to-r from-primary to-secondary" data-testid="button-send-message">
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Get in Touch</h2>
                <p className="text-sm text-muted-foreground">
                  We're here to help and answer any questions you might have
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Email</h3>
                    <p className="text-sm text-muted-foreground">support@lunara.ai</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Our Discord</h3>
                    <p className="text-sm text-muted-foreground">Join our community for real-time support</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-6 space-y-2">
              <h3 className="font-semibold">Need Quick Help?</h3>
              <p className="text-sm text-muted-foreground">
                Check out our documentation and FAQ section for instant answers to common questions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
