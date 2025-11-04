import * as React from "react";

import { Icon } from "$app/components/Icons";
import { Popover, PopoverContent, PopoverTrigger } from "$app/components/Popover";

type BaseUser = { name?: string | null; email?: string | null };
type User = BaseUser & ({ avatarUrl: string; avatar_url?: never } | { avatar_url: string; avatarUrl?: never });

export const DashboardNavProfilePopover = ({ children, user }: { children: React.ReactNode; user: User | null }) => (
  <Popover>
    <PopoverTrigger className="group flex items-center justify-between overflow-hidden border-y border-t-white/50 border-b-transparent px-6 py-4 hover:text-accent dark:border-t-foreground/50">
      <div className="flex-1 truncate">
        <img className="user-avatar" src={user?.avatarUrl || user?.avatar_url} alt="Your avatar" />
        {user?.name || user?.email}
      </div>
      <Icon name="outline-cheveron-down" className="group-data-[state=open]:rotate-180" />
    </PopoverTrigger>
    <PopoverContent collisionPadding={0} side="top" className="border-0 p-0 shadow-none" usePortal={false}>
      {children}
    </PopoverContent>
  </Popover>
);
