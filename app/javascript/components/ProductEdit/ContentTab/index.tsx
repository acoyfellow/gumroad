import { Node as TiptapNode } from "@tiptap/core";

import { FileEmbed } from "./FileEmbed";
import { FileEmbedGroup } from "./FileEmbedGroup";
import { ExternalMediaFileEmbed } from "$app/components/TiptapExtensions/MediaEmbed";
import { Posts } from "$app/components/TiptapExtensions/Posts";
import { LicenseKey } from "$app/components/TiptapExtensions/LicenseKey";
import { ShortAnswer } from "$app/components/TiptapExtensions/ShortAnswer";
import { LongAnswer } from "$app/components/TiptapExtensions/LongAnswer";
import { FileUpload } from "$app/components/TiptapExtensions/FileUpload";
import { MoveNode } from "$app/components/TiptapExtensions/MoveNode";
import { UpsellCard } from "$app/components/TiptapExtensions/UpsellCard";
import { MoreLikeThis } from "$app/components/TiptapExtensions/MoreLikeThis";

export const extensions = (productId: string, extraExtensions: TiptapNode[] = []) => [
  ...extraExtensions,
  ...[
    FileEmbed,
    FileEmbedGroup,
    ExternalMediaFileEmbed,
    Posts,
    LicenseKey,
    ShortAnswer,
    LongAnswer,
    FileUpload,
    MoveNode,
    UpsellCard,
    MoreLikeThis.configure({ productId }),
  ].filter((ext) => !extraExtensions.some((existing) => existing.name === ext.name)),
];
