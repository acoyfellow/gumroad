import { usePage } from "@inertiajs/react";
import * as React from "react";

import type { EditCollaboratorFormData } from "$app/data/collaborators";

import CollaboratorForm from "$app/components/Collaborators/Form";

export default function CollaboratorsEdit() {
  const { collaborator } = usePage<{ collaborator: EditCollaboratorFormData }>().props;

  return <CollaboratorForm formData={collaborator} />;
}
