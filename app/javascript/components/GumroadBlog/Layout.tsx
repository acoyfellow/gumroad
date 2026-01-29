import React from "react";

import { BlogFooter } from "$app/components/GumroadBlog/Footer";
import { BlogNav } from "$app/components/GumroadBlog/Nav";

type Props = {
  children: React.ReactNode;
};

export function BlogLayout({ children }: Props) {
  return (
    <div className="flex-1 flex flex-col bg-white text-black font-['ABC_Favorit'] text-base font-normal leading-relaxed tracking-tight">
      <BlogNav />
      <div className="flex-1 overflow-hidden">{children}</div>
      <BlogFooter />
    </div>
  );
}
