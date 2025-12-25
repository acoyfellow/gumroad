import { usePage } from "@inertiajs/react";
import * as React from "react";

import type { NewCollaboratorFormData } from "$app/data/collaborators";

import CollaboratorForm from "$app/components/Collaborators/Form";

export default function CollaboratorsNew() {
  const formData = usePage<NewCollaboratorFormData>().props;

  return <CollaboratorForm formData={formData} />;
}
