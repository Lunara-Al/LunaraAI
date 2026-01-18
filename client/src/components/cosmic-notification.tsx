import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CosmicNotificationProps {
  show: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onAction?: () => void;
  actionText?: string;
}

export function CosmicNotification({ show, onClose, title, description, onAction, actionText }: CosmicNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 8000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
          className="fixed bottom-6 right-6 z-[200] w-full max-w-sm"
        >
          <div className="relative group">
            {/* Ambient background glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-[2rem] blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            
            <div className="relative flex flex-col gap-4 p-6 bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">
              {/* Animated star field background inside notification */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-2 left-10 w-1 h-1 bg-white rounded-full animate-ping" />
                <div className="absolute bottom-4 right-20 w-1 h-1 bg-primary rounded-full animate-pulse" />
              </div>

              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center shadow-lg moon-glow">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <motion.div 
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <Check className="w-2 h-2 text-white" />
                  </motion.div>
                </div>

                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {title}
                    <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {description}
                  </p>
                </div>

                <button 
                  onClick={onClose}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {onAction && (
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClose}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Dismiss
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      onAction();
                      onClose();
                    }}
                    className="bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:shadow-primary/30 transition-all active-elevate-2"
                  >
                    {actionText || "View Creation"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
