"use client";

import { useQuery } from "@tanstack/react-query";
import { getStorageStats } from "@/lib/api";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Home, Star, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type CloudSidebarProps = {
  currentFolderId: string | null;
  view: 'home' | 'favorites' | 'trash';
  onRefresh: () => void;
  onNavigateHome: () => void;
  onNavigateFavorites: () => void;
  onNavigateTrash: () => void;
};

export function CloudSidebar({
  currentFolderId,
  view,
  onRefresh,
  onNavigateHome,
  onNavigateFavorites,
  onNavigateTrash,
}: CloudSidebarProps) {
  const { data: storageStats } = useQuery({
    queryKey: ["storage-stats"],
    queryFn: getStorageStats,
    refetchInterval: 30000, // Refresh every 30s
  });

  const usedGB = storageStats ? (storageStats.used / (1024 ** 3)).toFixed(2) : "0";
  const totalGB = storageStats ? (storageStats.limit / (1024 ** 3)).toFixed(0) : "50";
  const usagePercent = storageStats?.usage_percent || 0;

  return (
    <Sidebar className="overflow-x-hidden">
      <SidebarHeader className="border-b overflow-hidden">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold truncate">My Cloud</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 overflow-x-hidden">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onNavigateHome}
              isActive={view === 'home'}
            >
              <Home className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onNavigateFavorites}
              isActive={view === 'favorites'}
            >
              <Star className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Favorites</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onNavigateTrash}
              isActive={view === 'trash'}
            >
              <Trash2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Trash</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="my-4" />

        <div className="px-2 overflow-hidden">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground min-w-0">
              <span className="whitespace-nowrap flex-shrink-0">Storage</span>
              <span className="whitespace-nowrap truncate min-w-0">{usedGB} / {totalGB} GB</span>
            </div>
            <Progress value={usagePercent} className="w-full" />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
