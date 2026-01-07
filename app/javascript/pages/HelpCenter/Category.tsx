import { Head, Link, usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { HelpCenterLayout } from "./Layout";

interface SidebarCategory {
  title: string;
  slug: string;
  url: string;
  is_active: boolean;
}

interface ArticleLink {
  title: string;
  url: string;
}

interface Category {
  title: string;
  slug: string;
  articles: ArticleLink[];
}

interface Meta {
  title: string;
  description: string;
  canonical_url: string;
}

interface Props {
  category: Category;
  sidebar_categories: SidebarCategory[];
  meta: Meta;
}

function CategorySidebar({ categories, activeSlug }: { categories: SidebarCategory[]; activeSlug: string }) {
  return (
    <div className="md:pt-8 md:pr-8">
      <h3 className="mb-4 font-semibold">Categories</h3>
      <ul className="list-none space-y-4 pl-0!">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link href={category.url} className={category.slug === activeSlug ? "font-bold" : ""}>
              {category.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ArticleIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export default function HelpCenterCategory() {
  const { category, sidebar_categories, meta } = cast<Props>(usePage().props);

  return (
    <HelpCenterLayout showSearchButton>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonical_url} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={meta.canonical_url} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
      </Head>
      <div className="flex max-w-7xl flex-col-reverse gap-8 md:flex-row md:gap-16">
        <CategorySidebar categories={sidebar_categories} activeSlug={category.slug} />
        <div className="flex-1 grow rounded-sm border border-[rgb(var(--parent-color)/var(--border-alpha))] bg-[rgb(var(--filled))] p-8">
          <h2 className="mb-6 text-3xl font-bold">{category.title}</h2>
          <div className="space-y-4">
            {category.articles.map((article) => (
              <div key={article.url} className="flex items-center space-x-3">
                <Link
                  href={article.url}
                  className="flex w-fit items-center gap-2 font-medium hover:text-blue-600 hover:underline"
                >
                  <ArticleIcon />
                  {article.title}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HelpCenterLayout>
  );
}
