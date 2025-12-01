import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  MoonStar,
  Lock,
  Crown,
} from "lucide-react";
import {
  SiTiktok,
  SiYoutube,
  SiInstagram,
  SiFacebook,
  SiX,
} from "react-icons/si";
import type { IconType } from "react-icons";
import type { FrontendUser } from "@shared/schema";

/**
 * ============================================
 * CONTENT PLAN DATA STRUCTURE
 * ============================================
 *
 * HOW TO MODIFY THIS DATA:
 * - Each entry has: date (YYYY-MM-DD), idea (content title), platform, and optional description
 * - Add new entries by adding objects to the array
 * - Remove entries by deleting objects from the array
 * - The calendar will automatically display entries on the correct dates
 *
 * SUPPORTED PLATFORMS:
 * - "TikTok", "YouTube Shorts", "Instagram", "Facebook", "Twitter/X", "Other"
 */
const contentPlan: ContentEntry[] = [
  {
    date: "2025-12-01",
    idea: "Cosmic Watermelon Slice",
    platform: "TikTok",
    description:
      "Satisfying ASMR of slicing a galaxy-themed watermelon with cosmic sound effects",
  },
  {
    date: "2025-12-02",
    idea: "Galaxy Gem Cutting",
    platform: "YouTube Shorts",
    description:
      "Cutting and polishing gems with space visuals and crystal sounds",
  },
  {
    date: "2025-12-03",
    idea: "Nebula Soap Cutting",
    platform: "TikTok",
    description:
      "Soft soap cutting with purple/pink nebula patterns",
  },
  {
    date: "2025-12-05",
    idea: "Stardust Slime",
    platform: "Instagram",
    description:
      "Glittery slime with cosmic sparkles and whispered narration",
  },
  {
    date: "2025-12-07",
    idea: "Moon Rock Crushing",
    platform: "TikTok",
    description:
      "Crushing crystallized moon rocks with satisfying crumbles",
  },
  {
    date: "2025-12-10",
    idea: "Aurora Kinetic Sand",
    platform: "YouTube Shorts",
    description:
      "Northern lights themed kinetic sand with color-shifting effects",
  },
  {
    date: "2025-12-12",
    idea: "Black Hole Slime",
    platform: "TikTok",
    description:
      "Dark purple slime that absorbs everything with cosmic sounds",
  },
  {
    date: "2025-12-14",
    idea: "Comet Trail Candles",
    platform: "Instagram",
    description:
      "Lighting cosmic-themed candles with crackling sounds",
  },
  {
    date: "2025-12-16",
    idea: "Star Cluster Beads",
    platform: "TikTok",
    description:
      "Arranging and clicking cosmic glass beads",
  },
  {
    date: "2025-12-18",
    idea: "Solar Flare Wax",
    platform: "YouTube Shorts",
    description:
      "Melting orange-red cosmic wax with sizzle sounds",
  },
  {
    date: "2025-12-20",
    idea: "Milky Way Chocolate",
    platform: "TikTok",
    description:
      "Galaxy-decorated chocolate breaking with crisp sounds",
  },
  {
    date: "2025-12-22",
    idea: "Planet Surface Texture",
    platform: "Instagram",
    description:
      "ASMR textures inspired by different planet surfaces",
  },
  {
    date: "2025-12-25",
    idea: "Cosmic Christmas Special",
    platform: "TikTok",
    description:
      "Holiday-themed cosmic ASMR with sparkles and bells",
  },
  {
    date: "2025-12-28",
    idea: "Meteor Shower Rain",
    platform: "YouTube Shorts",
    description:
      "Rain-like sounds with meteor visual effects",
  },
  {
    date: "2025-12-31",
    idea: "New Year Countdown",
    platform: "TikTok",
    description:
      "Cosmic celebration with firework sounds and stardust",
  },
];

/**
 * ============================================
 * CONFIGURATION OPTIONS
 * ============================================
 *
 * DAYS_TO_SHOW: Change this to show more or fewer days
 * - 7  = one week
 * - 14 = two weeks
 * - 30 = one month (default)
 * - 60 = two months
 */
const DAYS_TO_SHOW = 30;

interface ContentEntry {
  date: string; // YYYY-MM-DD
  idea: string;
  platform: string;
  description?: string;
}

interface SelectedEntry extends ContentEntry {
  dayNumber: number;
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  content: ContentEntry | null;
  isToday: boolean;
}

/**
 * Platform styling (icon + colors)
 * Tailwind classes are used so it stays on-brand with your existing design.
 */
interface PlatformStyle {
  icon: IconType;
  color: string;
  bg: string;
}

const platformStyles: Record<string, PlatformStyle> = {
  TikTok: {
    icon: SiTiktok,
    color: "text-pink-400",
    bg: "bg-pink-500/20",
  },
  "YouTube Shorts": {
    icon: SiYoutube,
    color: "text-red-400",
    bg: "bg-red-500/20",
  },
  Instagram: {
    icon: SiInstagram,
    color: "text-purple-400",
    bg: "bg-purple-500/20",
  },
  Facebook: {
    icon: SiFacebook,
    color: "text-blue-400",
    bg: "bg-blue-500/20",
  },
  "Twitter/X": {
    icon: SiX,
    color: "text-sky-400",
    bg: "bg-sky-500/20",
  },
  Other: {
    icon: SiTiktok,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
};

/**
 * Utility: normalize a Date into a YYYY-MM-DD string in local time.
 */
const formatDateKey = (date: Date): string =>
  date.toLocaleDateString("en-CA"); // YYYY-MM-DD

/**
 * Utility: create a new Date set to midnight local time.
 */
const createMidnightDate = (base?: Date): Date => {
  const d = base ? new Date(base) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

interface ContentCalendarProps {
  user?: FrontendUser | null;
}

export function ContentCalendar({ user }: ContentCalendarProps) {
  const isPremium = user?.membershipTier === "premium";
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => createMidnightDate());

  /**
   * Pre-index content by date key for O(1) access.
   * This scales better if you end up with big calendars.
   */
  const contentByDate = useMemo(() => {
    const map = new Map<string, ContentEntry[]>();
    for (const entry of contentPlan) {
      const key = entry.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, []);

  /**
   * Build the list of calendar days starting from `startDate`
   * for the configured DAYS_TO_SHOW.
   */
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const days: CalendarDay[] = [];

    const today = createMidnightDate();
    const todayKey = formatDateKey(today);

    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const date = createMidnightDate(startDate);
      date.setDate(startDate.getDate() + i);

      const dateKey = formatDateKey(date);
      const entries = contentByDate.get(dateKey);
      const firstEntry = entries ? entries[0] : null;

      days.push({
        date,
        dateKey,
        dayNumber: date.getDate(),
        content: firstEntry,
        isToday: dateKey === todayKey,
      });
    }

    return days;
  }, [startDate, contentByDate]);

  /**
   * Month/year header label
   * Shows either a single month or a range like "Nov – Dec 2025".
   */
  const headerLabel = useMemo(() => {
    const endDate = createMidnightDate(startDate);
    endDate.setDate(startDate.getDate() + DAYS_TO_SHOW - 1);

    const startMonthLabel = startDate.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    const endMonthLabel = endDate.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    if (startMonthLabel === endMonthLabel) {
      return startMonthLabel;
    }

    return `${startDate.toLocaleString("en-US", {
      month: "short",
    })} – ${endDate.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    })}`;
  }, [startDate]);

  // Navigation handlers (one week at a time)
  const goToPrevious = () => {
    if (!isPremium) return;
    setSelectedEntry(null);
    const newDate = createMidnightDate(startDate);
    newDate.setDate(startDate.getDate() - 7);
    setStartDate(newDate);
  };

  const goToNext = () => {
    if (!isPremium) return;
    setSelectedEntry(null);
    const newDate = createMidnightDate(startDate);
    newDate.setDate(startDate.getDate() + 7);
    setStartDate(newDate);
  };

  const goToToday = () => {
    if (!isPremium) return;
    setSelectedEntry(null);
    setStartDate(createMidnightDate());
  };

  // Handle clicking on a day cell
  const handleDayClick = (day: CalendarDay) => {
    if (!isPremium) return;
    if (!day.content) {
      setSelectedEntry(null);
      return;
    }

    setSelectedEntry({
      ...day.content,
      dayNumber: day.dayNumber,
    });
  };

  const getPlatformStyle = (platform: string): PlatformStyle =>
    platformStyles[platform] ?? platformStyles["Other"];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Align the first row by the weekday of the first displayed date
  const firstDayOfWeek = startDate.getDay();

  return (
    <Card className="relative p-6 md:p-8 bg-gradient-to-br from-[#0B0320] via-[#080016] to-[#150035] border border-card-border/70 hover:border-primary/60 shadow-[0_0_40px_rgba(168,85,247,0.35)] rounded-3xl hover:shadow-[0_0_60px_rgba(236,72,153,0.55)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden" style={!isPremium ? { opacity: 0.85 } : {}}>
      {/* Soft glow overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.12),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_55%)] opacity-90" />
      
      {/* Premium Lock Overlay */}
      {!isPremium && (
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-sm rounded-3xl flex items-center justify-center z-50 flex-col gap-4 p-6 text-center">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 p-[2px] shadow-[0_0_32px_rgba(168,85,247,0.9)]">
              <div className="rounded-full bg-[#080016] p-4">
                <Lock className="w-8 h-8 text-purple-300" />
              </div>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Premium Feature</h3>
              <p className="text-sm md:text-base text-gray-300 mb-4">
                Content Calendar is exclusively for Premium members
              </p>
              <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/40">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Upgrade to Premium</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10" style={!isPremium ? { pointerEvents: "none", opacity: 0.6 } : {}}>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent mb-1">
              Content Calendar
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Your next <span className="font-semibold">{DAYS_TO_SHOW}</span>{" "}
              days of cosmic ASMR content
            </p>
          </div>

          {/* Lunar badge top-right (purely visual / on-brand) */}
          <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 p-[2px] shadow-[0_0_24px_rgba(168,85,247,0.8)]">
            <div className="rounded-full bg-[#080016] p-2">
              <MoonStar className="w-5 h-5 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={goToPrevious}
              data-testid="button-calendar-prev"
              aria-label="Previous week"
              className="border-border/60 bg-background/40 hover:bg-background/70"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={goToNext}
              data-testid="button-calendar-next"
              aria-label="Next week"
              className="border-border/60 bg-background/40 hover:bg-background/70"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <h3
            className="text-lg font-semibold text-foreground tracking-wide"
            data-testid="text-calendar-header"
          >
            {headerLabel}
          </h3>

          <Button
            size="sm"
            variant="outline"
            onClick={goToToday}
            data-testid="button-calendar-today"
            className="border-primary/70 bg-primary/10 text-primary hover:bg-primary/20"
          >
            Today
          </Button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-xs md:text-sm">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center font-medium text-muted-foreground py-2 uppercase tracking-wide"
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
          {calendarDays.map((day) => {
            const style = day.content ? getPlatformStyle(day.content.platform) : null;
            const PlatformIcon = style?.icon;

            const isSelected =
              selectedEntry && selectedEntry.date === day.content?.date;

            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`
                  aspect-square p-1 md:p-2 rounded-2xl border transition-all duration-200
                  flex flex-col items-center justify-start gap-0.5 md:gap-1
                  text-left relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-secondary
                  ${
                    day.isToday
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : ""
                  }
                  ${
                    day.content
                      ? `${style?.bg} border-primary/40 hover:border-primary/70 hover:scale-[1.04] cursor-pointer`
                      : "border-border/30 hover:border-border/60 bg-background/10 hover:bg-background/30"
                  }
                  ${isSelected ? "ring-2 ring-secondary ring-offset-1 ring-offset-background scale-[1.03]" : ""}
                `}
                data-testid={`calendar-day-${day.dateKey}`}
                aria-label={
                  day.content
                    ? `${day.dayNumber}: ${day.content.idea} on ${day.content.platform}`
                    : `${day.dayNumber}: no content planned`
                }
              >
                {/* Day number */}
                <span
                  className={`
                  text-xs md:text-sm font-semibold
                  ${day.isToday ? "text-primary" : "text-foreground"}
                `}
                >
                  {day.dayNumber}
                </span>

                {/* Content indicator */}
                {day.content && (
                  <>
                    {/* Platform icon */}
                    {PlatformIcon && (
                      <PlatformIcon
                        className={`w-3 h-3 md:w-4 md:h-4 ${style?.color}`}
                      />
                    )}

                    {/* Content preview - hidden on small screens */}
                    <span className="hidden md:block text-[10px] leading-tight text-center text-muted-foreground line-clamp-2 px-0.5">
                      {day.content.idea.length > 20
                        ? day.content.idea.slice(0, 18) + "..."
                        : day.content.idea}
                    </span>

                    {/* Sparkle indicator for mobile */}
                    <Sparkles className="w-2 h-2 text-primary/70 md:hidden" />
                  </>
                )}

                {/* Hover glow effect */}
                {day.content && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/15 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Entry Details */}
        {selectedEntry && (
          <div
            className="mt-6 p-4 md:p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-background/90 to-secondary/10 border border-primary/25 animate-in fade-in slide-in-from-bottom-2 duration-300"
            data-testid="calendar-entry-details"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Title */}
                <h4 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {selectedEntry.idea}
                </h4>

                {/* Platform + Day badge */}
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const style = getPlatformStyle(selectedEntry.platform);
                    const PlatformIcon = style.icon;
                    return (
                      <Badge
                        variant="outline"
                        className={`${style.bg} border-none ${style.color} font-medium flex items-center`}
                      >
                        <PlatformIcon className="w-3 h-3 mr-1" />
                        {selectedEntry.platform}
                      </Badge>
                    );
                  })()}

                  <Badge variant="outline" className="bg-background/60">
                    Day {selectedEntry.dayNumber}
                  </Badge>
                </div>

                {/* Description */}
                {selectedEntry.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedEntry.description}
                  </p>
                )}

                {/* Full date */}
                <p className="text-xs text-muted-foreground/70">
                  Scheduled for:{" "}
                  {new Date(selectedEntry.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Close button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedEntry(null)}
                className="shrink-0 hover:bg-background/40"
                data-testid="button-close-details"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-3">Platforms:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(platformStyles)
              .slice(0, 5)
              .map(([platform, style]) => {
                const PlatformIcon = style.icon;
                return (
                  <Badge
                    key={platform}
                    variant="outline"
                    className={`${style.bg} border-none ${style.color} text-xs flex items-center`}
                  >
                    <PlatformIcon className="w-3 h-3 mr-1" />
                    {platform}
                  </Badge>
                );
              })}
          </div>
        </div>
      </div>
    </Card>
  );
}
