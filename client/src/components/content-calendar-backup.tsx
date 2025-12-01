import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { SiTiktok, SiYoutube, SiInstagram, SiFacebook, SiX } from "react-icons/si";
import type { IconType } from "react-icons";

/**
 * ============================================
 * CONTENT PLAN DATA STRUCTURE
 * ============================================
 * 
 * HOW TO MODIFY THIS DATA:
 * - Each entry has: date (YYYY-MM-DD format), idea (content title), platform, and optional description
 * - Add new entries by adding objects to the array
 * - Remove entries by deleting objects from the array
 * - The calendar will automatically display entries on the correct dates
 * 
 * SUPPORTED PLATFORMS:
 * - "TikTok", "YouTube Shorts", "Instagram", "Facebook", "Twitter/X", "Other"
 */
const contentPlan = [
  { 
    date: "2025-12-01", 
    idea: "Cosmic Watermelon Slice", 
    platform: "TikTok",
    description: "Satisfying ASMR of slicing a galaxy-themed watermelon with cosmic sound effects"
  },
  { 
    date: "2025-12-02", 
    idea: "Galaxy Gem Cutting", 
    platform: "YouTube Shorts",
    description: "Cutting and polishing gems with space visuals and crystal sounds"
  },
  { 
    date: "2025-12-03", 
    idea: "Nebula Soap Cutting", 
    platform: "TikTok",
    description: "Soft soap cutting with purple/pink nebula patterns"
  },
  { 
    date: "2025-12-05", 
    idea: "Stardust Slime", 
    platform: "Instagram",
    description: "Glittery slime with cosmic sparkles and whispered narration"
  },
  { 
    date: "2025-12-07", 
    idea: "Moon Rock Crushing", 
    platform: "TikTok",
    description: "Crushing crystallized moon rocks with satisfying crumbles"
  },
  { 
    date: "2025-12-10", 
    idea: "Aurora Kinetic Sand", 
    platform: "YouTube Shorts",
    description: "Northern lights themed kinetic sand with color-shifting effects"
  },
  { 
    date: "2025-12-12", 
    idea: "Black Hole Slime", 
    platform: "TikTok",
    description: "Dark purple slime that absorbs everything with cosmic sounds"
  },
  { 
    date: "2025-12-14", 
    idea: "Comet Trail Candles", 
    platform: "Instagram",
    description: "Lighting cosmic-themed candles with crackling sounds"
  },
  { 
    date: "2025-12-16", 
    idea: "Star Cluster Beads", 
    platform: "TikTok",
    description: "Arranging and clicking cosmic glass beads"
  },
  { 
    date: "2025-12-18", 
    idea: "Solar Flare Wax", 
    platform: "YouTube Shorts",
    description: "Melting orange-red cosmic wax with sizzle sounds"
  },
  { 
    date: "2025-12-20", 
    idea: "Milky Way Chocolate", 
    platform: "TikTok",
    description: "Galaxy-decorated chocolate breaking with crisp sounds"
  },
  { 
    date: "2025-12-22", 
    idea: "Planet Surface Texture", 
    platform: "Instagram",
    description: "ASMR textures inspired by different planet surfaces"
  },
  { 
    date: "2025-12-25", 
    idea: "Cosmic Christmas Special", 
    platform: "TikTok",
    description: "Holiday-themed cosmic ASMR with sparkles and bells"
  },
  { 
    date: "2025-12-28", 
    idea: "Meteor Shower Rain", 
    platform: "YouTube Shorts",
    description: "Rain-like sounds with meteor visual effects"
  },
  { 
    date: "2025-12-31", 
    idea: "New Year Countdown", 
    platform: "TikTok",
    description: "Cosmic celebration with firework sounds and stardust"
  },
];

/**
 * ============================================
 * CONFIGURATION OPTIONS
 * ============================================
 * 
 * DAYS_TO_SHOW: Change this to show more or fewer days
 * - 7 = one week
 * - 14 = two weeks
 * - 30 = one month (default)
 * - 60 = two months
 */
const DAYS_TO_SHOW = 30;

// Platform icon and color mapping
const platformStyles: Record<string, { icon: IconType; color: string; bg: string }> = {
  "TikTok": { icon: SiTiktok, color: "text-pink-400", bg: "bg-pink-500/20" },
  "YouTube Shorts": { icon: SiYoutube, color: "text-red-400", bg: "bg-red-500/20" },
  "Instagram": { icon: SiInstagram, color: "text-purple-400", bg: "bg-purple-500/20" },
  "Facebook": { icon: SiFacebook, color: "text-blue-400", bg: "bg-blue-500/20" },
  "Twitter/X": { icon: SiX, color: "text-sky-400", bg: "bg-sky-500/20" },
  "Other": { icon: SiTiktok, color: "text-yellow-400", bg: "bg-yellow-500/20" },
};

interface ContentEntry {
  date: string;
  idea: string;
  platform: string;
  description?: string;
}

interface SelectedEntry extends ContentEntry {
  dayNumber: number;
}

export function ContentCalendar() {
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(null);
  const [startDate, setStartDate] = useState(() => new Date());

  /**
   * Timezone-safe date formatting
   * Uses 'en-CA' locale which produces YYYY-MM-DD format in local time
   */
  const formatDateKey = (date: Date): string => {
    return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in local timezone
  };

  // Generate calendar days starting from startDate
  const calendarDays = useMemo(() => {
    const days: { date: Date; dateKey: string; dayNumber: number; content: ContentEntry | null; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = formatDateKey(today);

    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dateKey = formatDateKey(date);
      const content = contentPlan.find(entry => entry.date === dateKey) || null;

      days.push({
        date,
        dateKey,
        dayNumber: date.getDate(),
        content,
        isToday: dateKey === todayKey,
      });
    }

    return days;
  }, [startDate]);

  // Get the month/year label for the header
  const headerLabel = useMemo(() => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + DAYS_TO_SHOW - 1);

    const startMonth = startDate.toLocaleString("en-US", { month: "long", year: "numeric" });
    const endMonth = endDate.toLocaleString("en-US", { month: "long", year: "numeric" });

    if (startMonth === endMonth) {
      return startMonth;
    }
    return `${startDate.toLocaleString("en-US", { month: "short" })} - ${endDate.toLocaleString("en-US", { month: "short", year: "numeric" })}`;
  }, [startDate]);

  // Navigation handlers
  const goToPrevious = () => {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() - 7);
    setStartDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + 7);
    setStartDate(newDate);
  };

  const goToToday = () => {
    setStartDate(new Date());
  };

  // Handle day click
  const handleDayClick = (day: typeof calendarDays[0]) => {
    if (day.content) {
      setSelectedEntry({
        ...day.content,
        dayNumber: day.dayNumber,
      });
    } else {
      setSelectedEntry(null);
    }
  };

  // Get platform style with fallback
  const getPlatformStyle = (platform: string) => {
    return platformStyles[platform] || platformStyles["Other"];
  };

  // Day of week headers
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get the first day's day-of-week to align the grid
  const firstDayOfWeek = startDate.getDay();

  return (
    <Card className="p-6 md:p-8 bg-card border border-card-border hover-elevate transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent mb-2">
          Content Calendar
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Your next {DAYS_TO_SHOW} days of cosmic ASMR content
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={goToPrevious}
            data-testid="button-calendar-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={goToNext}
            data-testid="button-calendar-next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <h3 className="text-lg font-semibold text-foreground" data-testid="text-calendar-header">
          {headerLabel}
        </h3>

        <Button
          size="sm"
          variant="outline"
          onClick={goToToday}
          data-testid="button-calendar-today"
        >
          Today
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {/* Empty cells for alignment */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {calendarDays.map((day, index) => {
          const style = day.content ? getPlatformStyle(day.content.platform) : null;
          const PlatformIcon = style?.icon;

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              className={`
                aspect-square p-1 md:p-2 rounded-lg border transition-all duration-200
                flex flex-col items-center justify-start gap-0.5 md:gap-1
                text-left relative overflow-hidden group
                ${day.isToday 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                  : ""
                }
                ${day.content 
                  ? `${style?.bg} border-primary/30 hover:border-primary/60 hover:scale-105 cursor-pointer` 
                  : "border-border/30 hover:border-border/60 bg-background/20 hover:bg-background/40"
                }
                ${selectedEntry?.date === day.content?.date 
                  ? "ring-2 ring-secondary ring-offset-1 ring-offset-background scale-105" 
                  : ""
                }
              `}
              data-testid={`calendar-day-${day.dateKey}`}
            >
              {/* Day number */}
              <span className={`
                text-xs md:text-sm font-semibold
                ${day.isToday ? "text-primary" : "text-foreground"}
              `}>
                {day.dayNumber}
              </span>

              {/* Content indicator */}
              {day.content && (
                <>
                  {/* Platform icon */}
                  {PlatformIcon && (
                    <PlatformIcon className={`w-3 h-3 md:w-4 md:h-4 ${style?.color}`} />
                  )}

                  {/* Content preview - hidden on mobile, shown on larger screens */}
                  <span className="hidden md:block text-[10px] leading-tight text-center text-muted-foreground line-clamp-2 px-0.5">
                    {day.content.idea.length > 20 
                      ? day.content.idea.slice(0, 18) + "..." 
                      : day.content.idea
                    }
                  </span>

                  {/* Sparkle indicator for mobile */}
                  <Sparkles className="w-2 h-2 text-primary/60 md:hidden" />
                </>
              )}

              {/* Hover glow effect */}
              {day.content && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Entry Details Popup */}
      {selectedEntry && (
        <div 
          className="mt-6 p-4 md:p-6 rounded-xl bg-gradient-to-br from-primary/10 via-background to-secondary/10 border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300"
          data-testid="calendar-entry-details"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {/* Title */}
              <h4 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {selectedEntry.idea}
              </h4>

              {/* Platform badge */}
              <div className="flex items-center gap-2">
                {(() => {
                  const style = getPlatformStyle(selectedEntry.platform);
                  const PlatformIcon = style.icon;
                  return (
                    <Badge 
                      variant="outline" 
                      className={`${style.bg} border-none ${style.color} font-medium`}
                    >
                      <PlatformIcon className="w-3 h-3 mr-1" />
                      {selectedEntry.platform}
                    </Badge>
                  );
                })()}
                <Badge variant="outline" className="bg-background/50">
                  Day {selectedEntry.dayNumber}
                </Badge>
              </div>

              {/* Description */}
              {selectedEntry.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedEntry.description}
                </p>
              )}

              {/* Date */}
              <p className="text-xs text-muted-foreground/70">
                Scheduled for: {new Date(selectedEntry.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>

            {/* Close button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSelectedEntry(null)}
              className="shrink-0"
              data-testid="button-close-details"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground mb-3">Platforms:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(platformStyles).slice(0, 5).map(([platform, style]) => {
            const PlatformIcon = style.icon;
            return (
              <Badge 
                key={platform}
                variant="outline" 
                className={`${style.bg} border-none ${style.color} text-xs`}
              >
                <PlatformIcon className="w-3 h-3 mr-1" />
                {platform}
              </Badge>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
