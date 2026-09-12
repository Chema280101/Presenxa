"use client";

import React, { useState, useEffect } from "react";
import { 
  Sunrise, 
  Sun, 
  MoonStar, 
  Sparkles, 
  Clock, 
  Building2, 
  MapPin, 
  Calendar,
} from "lucide-react";

export interface DashboardGreetingHeaderProps {
  userName?: string;
  userRole?: string;
  organizationName?: string;
  locationName?: string;
}

export function DashboardGreetingHeader({
  userName = "Administrador",
  userRole = "Administrador",
  organizationName = "Presenxa Enterprise",
  locationName = "Sede Principal",
}: DashboardGreetingHeaderProps) {
  const [greeting, setGreeting] = useState<string>("Hola");
  const [greetingIcon, setGreetingIcon] = useState<React.ReactNode>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [currentDateStr, setCurrentDateStr] = useState<string>("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= 5 && hour < 12) {
        setGreeting("Buenos días");
        setGreetingIcon(<Sunrise className="w-4 h-4 text-amber-500" />);
      } else if (hour >= 12 && hour < 19) {
        setGreeting("Buenas tardes");
        setGreetingIcon(<Sun className="w-4 h-4 text-amber-500" />);
      } else {
        setGreeting("Buenas noches");
        setGreetingIcon(<MoonStar className="w-4 h-4 text-indigo-400" />);
      }

      setCurrentTimeStr(
        now.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );

      const formattedDate = now.toLocaleDateString("es-PE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      setCurrentDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-7 shadow-sm transition-all animate-fade-in-up">
      {/* Decorative Brand Accent Glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-gradient-to-tr from-cyan-500/5 to-transparent blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        {/* Left Side: Dynamic Greeting & User Context */}
        <div className="space-y-2">
          {/* Context Badge Row */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/50 border border-primary-200/60 dark:border-primary-800/40">
              {greetingIcon || <Sunrise className="w-3.5 h-3.5 text-amber-500" />}
              <span>{greeting}</span>
              <span className="normal-case text-sm inline-block">👋</span>
            </span>
            <span className="text-surface-300 dark:text-surface-700 hidden sm:inline">·</span>
            <span className="text-surface-500 dark:text-surface-400 normal-case font-medium flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-surface-400" />
              <span>{currentDateStr || "Cargando fecha..."}</span>
            </span>
          </div>

          {/* Main Personalized Greeting Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight flex items-center gap-3 flex-wrap">
            <span>
              {greeting},{" "}
              <span className="bg-gradient-to-r from-surface-900 via-primary-700 to-primary-600 dark:from-white dark:via-primary-300 dark:to-primary-400 bg-clip-text text-transparent">
                {userName}
              </span>
            </span>
            {userRole && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700">
                <Sparkles className="w-3 h-3 text-primary-500" />
                {userRole}
              </span>
            )}
          </h1>

          {/* Subtitle with Organization & Location context */}
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 flex items-center gap-2 flex-wrap pt-0.5">
            <span>Panel de control de</span>
            <span className="inline-flex items-center gap-1 font-semibold text-surface-800 dark:text-surface-200">
              <Building2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              {organizationName}
            </span>
            <span className="text-surface-300 dark:text-surface-700">·</span>
            <span className="inline-flex items-center gap-1 text-surface-600 dark:text-surface-300">
              <MapPin className="w-3.5 h-3.5 text-surface-400" />
              {locationName}
            </span>
          </p>
        </div>

        {/* Right Side: Live Clock & Real-time Indicator */}
        <div className="flex items-center pt-2 lg:pt-0">
          {/* Digital Clock with Live Pulse */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 font-mono text-surface-700 dark:text-surface-300 text-xs shadow-inner">
            <Clock className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="font-bold text-surface-900 dark:text-white font-tabular tracking-wide text-xs">
              {currentTimeStr || "--:--:--"}
            </span>
            <span className="text-[10px] text-primary-700 dark:text-primary-300 font-bold bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800/40 flex items-center gap-1.5 ml-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              EN VIVO
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
