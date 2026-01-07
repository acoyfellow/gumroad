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

interface ArticleCategory {
  title: string;
  slug: string;
  url: string;
}

interface Article {
  title: string;
  slug: string;
  content: string;
  category: ArticleCategory;
}

interface Meta {
  title: string;
  description: string;
  canonical_url: string;
}

interface Props {
  article: Article;
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

export default function HelpCenterArticle() {
  const { article, sidebar_categories, meta } = cast<Props>(usePage().props);

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
        <CategorySidebar categories={sidebar_categories} activeSlug={article.category.slug} />
        <div className="flex-1 grow rounded-sm border border-[rgb(var(--parent-color)/var(--border-alpha))] bg-[rgb(var(--filled))] p-8">
          <h2 className="mb-6 text-3xl font-bold">{article.title}</h2>
          <div
            className="scoped-tailwind-preflight prose dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>
    </HelpCenterLayout>
  );
}
