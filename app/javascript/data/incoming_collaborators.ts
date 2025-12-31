import type { CollaboratorPagesSharedProps } from "./collaborators";

export type IncomingCollaborator = {
  id: string;
  seller_email: string;
  seller_name: string;
  seller_avatar_url: string;
  apply_to_all_products: boolean;
  affiliate_percentage: number | null;
  dont_show_as_co_creator: boolean;
  invitation_accepted: boolean;
  products: {
    id: string;
    url: string;
    name: string;
    affiliate_percentage: number;
    dont_show_as_co_creator: boolean;
  }[];
};

export type IncomingCollaboratorsPageProps = {
  collaborators: IncomingCollaborator[];
} & CollaboratorPagesSharedProps;
