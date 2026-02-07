import { Head } from "@inertiajs/react";

export function CustomStyles({ styles }: { styles?: string | null }) {
  if (!styles) return null;
  return (
    <Head>
      <style>{styles}</style>
    </Head>
  );
}
