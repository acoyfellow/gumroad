export type Collaborator = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string;
  percent_commission: number | null;
  setup_incomplete: boolean;
  products: CollaboratorProduct[];
  invitation_accepted: boolean;
};

type CollaboratorProduct = {
  id: string;
  name: string;
  percent_commission: number | null;
};

export type CollaboratorsData = {
  collaborators: Collaborator[];
  collaborators_disabled_reason: string | null;
  has_incoming_collaborators: boolean;
};

export type CollaboratorFormProduct = {
  id: string;
  name: string;
  has_another_collaborator: boolean;
  has_affiliates: boolean;
  published: boolean;
  enabled: boolean;
  percent_commission: number | null;
  dont_show_as_co_creator: boolean;
};

export type NewCollaboratorFormData = {
  products: CollaboratorFormProduct[];
  collaborators_disabled_reason: string | null;
};

export type EditCollaboratorFormData = NewCollaboratorFormData & {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  apply_to_all_products: boolean;
  dont_show_as_co_creator: boolean;
  percent_commission: number | null;
  setup_incomplete: boolean;
};

export type CollaboratorFormData = NewCollaboratorFormData | EditCollaboratorFormData;
