'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, CheckSquare } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { UserMenu } from './UserMenu';
import { useUser, getUserId } from '@/services/user';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'CRM', href: '/leads', icon: Users },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    setUserId(getUserId());
  }, []);

  const { data: user, isError } = useUser(userId || 0);

  useEffect(() => {
    if (isError) {
      toast.error('Session expirée');
      router.push('/login');
    }
  }, [isError, router]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Image src="/logo.png" alt="Multimodal" width={28} height={28} className="shrink-0" />
          <span className="text-xl font-bold text-primary truncate group-data-[collapsible=icon]:hidden">
            Multimodal
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === href || (href !== '/dashboard' && pathname.startsWith(href))}
                tooltip={label}
              >
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 border-t">
        {user && (
          <div className="group-data-[collapsible=icon]:hidden">
            <UserMenu userName={user.name || ''} userEmail={user.email} />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
