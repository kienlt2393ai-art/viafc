import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "green" | "blue" | "red" | "yellow" | "purple";
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  green: {
    bg: "bg-green-900/30",
    icon: "bg-green-800/50 text-green-400",
    value: "text-green-400",
  },
  blue: {
    bg: "bg-blue-900/30",
    icon: "bg-blue-800/50 text-blue-400",
    value: "text-blue-400",
  },
  red: {
    bg: "bg-red-900/30",
    icon: "bg-red-800/50 text-red-400",
    value: "text-red-400",
  },
  yellow: {
    bg: "bg-yellow-900/30",
    icon: "bg-yellow-800/50 text-yellow-400",
    value: "text-yellow-400",
  },
  purple: {
    bg: "bg-purple-900/30",
    icon: "bg-purple-800/50 text-purple-400",
    value: "text-purple-400",
  },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "green",
  trend,
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        "rounded-xl p-5 border border-gray-800",
        colors.bg
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className={cn("text-2xl font-bold", colors.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs mt-1 font-medium",
                trend.positive ? "text-green-400" : "text-red-400"
              )}
            >
              {trend.positive ? "▲" : "▼"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg", colors.icon)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
