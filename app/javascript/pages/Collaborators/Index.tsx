import { router, usePage } from "@inertiajs/react";
import * as React from "react";

import { Collaborator, CollaboratorsData } from "$app/data/collaborators";

import { Button } from "$app/components/Button";
import { Layout } from "$app/components/Collaborators/Layout";
import { Icon } from "$app/components/Icons";
import { useLoggedInUser } from "$app/components/LoggedInUser";
import { NavigationButtonInertia } from "$app/components/NavigationButton";
import Placeholder from "$app/components/ui/Placeholder";
import { Sheet, SheetHeader } from "$app/components/ui/Sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$app/components/ui/Table";
import { WithTooltip } from "$app/components/WithTooltip";

import placeholder from "$assets/images/placeholders/collaborators.png";

const formatProductNames = (collaborator: Collaborator) => {
  if (collaborator.products.length === 0) {
    return "None";
  } else if (collaborator.products.length === 1 && collaborator.products[0]) {
    return collaborator.products[0].name;
  }
  const count = collaborator.products.length;
  return count === 1 ? "1 product" : `${count.toLocaleString()} products`;
};

const formatAsPercent = (commission: number) => (commission / 100).toLocaleString([], { style: "percent" });

const formatCommission = (collaborator: Collaborator) => {
  if (collaborator.products.length > 0) {
    const sortedCommissions = collaborator.products
      .map((product) => product.percent_commission)
      .filter(Number)
      .sort((a, b) => (a === null || b === null ? -1 : a - b));
    const commissions = [...new Set(sortedCommissions)]; // remove duplicates
    if (commissions.length === 0 && collaborator.percent_commission !== null) {
      return formatAsPercent(collaborator.percent_commission);
    } else if (commissions.length === 1 && commissions[0]) {
      return formatAsPercent(commissions[0]);
    } else if (commissions.length > 1) {
      const lowestCommission = commissions[0];
      const highestCommission = commissions[commissions.length - 1];
      if (lowestCommission && highestCommission) {
        return `${formatAsPercent(lowestCommission)} - ${formatAsPercent(highestCommission)}`;
      }
    }
  }
  return collaborator.percent_commission !== null ? formatAsPercent(collaborator.percent_commission) : "";
};

const CollaboratorDetails = ({
  selectedCollaborator,
  onClose,
  onRemove,
  isRemoving,
}: {
  selectedCollaborator: Collaborator;
  onClose: () => void;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}) => {
  const loggedInUser = useLoggedInUser();

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetHeader>{selectedCollaborator.name}</SheetHeader>
      {selectedCollaborator.setup_incomplete ? (
        <div role="alert" className="warning">
          Collaborators won't receive their cut until they set up a payout account in their Gumroad settings.
        </div>
      ) : null}

      <section className="stack">
        <h3>Email</h3>
        <div>
          <span>{selectedCollaborator.email}</span>
        </div>
      </section>

      <section className="stack">
        <h3>Products</h3>
        {selectedCollaborator.products.map((product) => (
          <section key={product.id}>
            <div>{product.name}</div>
            <div>{formatAsPercent(product.percent_commission || selectedCollaborator.percent_commission || 0)}</div>
          </section>
        ))}
      </section>

      <section className="mt-auto flex gap-4">
        <NavigationButtonInertia
          href={Routes.edit_collaborator_path(selectedCollaborator.id)}
          className="flex-1"
          aria-label="Edit"
          disabled={!loggedInUser?.policies.collaborator.update}
        >
          Edit
        </NavigationButtonInertia>
        <Button
          className="flex-1"
          color="danger"
          aria-label="Delete"
          onClick={() => onRemove(selectedCollaborator.id)}
          disabled={!loggedInUser?.policies.collaborator.update || isRemoving}
        >
          {isRemoving ? "Removing..." : "Remove"}
        </Button>
      </section>
    </Sheet>
  );
};

export default function CollaboratorsIndex() {
  const props = usePage<CollaboratorsData>().props;
  const loggedInUser = useLoggedInUser();
  const { collaborators, collaborators_disabled_reason, has_incoming_collaborators } = props;
  const [selectedCollaborator, setSelectedCollaborator] = React.useState<Collaborator | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);

  const remove = (collaboratorId: string) => {
    router.delete(Routes.collaborator_path(collaboratorId), {
      onStart: () => setIsRemoving(true),
      onSuccess: () => setSelectedCollaborator(null),
      onFinish: () => setIsRemoving(false),
    });
  };

  return (
    <Layout
      title="Collaborators"
      selectedTab="collaborators"
      showTabs={has_incoming_collaborators}
      headerActions={
        <WithTooltip position="bottom" tip={collaborators_disabled_reason}>
          <NavigationButtonInertia
            href={Routes.new_collaborator_path()}
            color="accent"
            disabled={!loggedInUser?.policies.collaborator.create || collaborators_disabled_reason !== null}
          >
            Add collaborator
          </NavigationButtonInertia>
        </WithTooltip>
      }
    >
      {collaborators.length > 0 ? (
        <>
          <section className="p-4 md:p-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Cut</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {collaborators.map((collaborator) => (
                  <TableRow
                    key={collaborator.id}
                    selected={collaborator.id === selectedCollaborator?.id}
                    onClick={() => setSelectedCollaborator(collaborator)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <img
                          className="user-avatar"
                          src={collaborator.avatar_url}
                          style={{ width: "var(--spacer-6)" }}
                          alt={`Avatar of ${collaborator.name || "Collaborator"}`}
                        />
                        <div>
                          <span className="whitespace-nowrap">{collaborator.name || "Collaborator"}</span>
                          <small className="line-clamp-1">{collaborator.email}</small>
                        </div>
                        {collaborator.setup_incomplete ? (
                          <WithTooltip tip="Not receiving payouts" position="top">
                            <Icon
                              name="solid-shield-exclamation"
                              style={{ color: "rgb(var(--warning))" }}
                              aria-label="Not receiving payouts"
                            />
                          </WithTooltip>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-2">{formatProductNames(collaborator)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatCommission(collaborator)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {collaborator.invitation_accepted ? <>Accepted</> : <>Pending</>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-3 lg:justify-end">
                        <NavigationButtonInertia
                          href={Routes.edit_collaborator_path(collaborator.id)}
                          aria-label="Edit"
                          disabled={!loggedInUser?.policies.collaborator.update}
                        >
                          <Icon name="pencil" />
                        </NavigationButtonInertia>

                        <Button
                          type="submit"
                          color="danger"
                          onClick={() => remove(collaborator.id)}
                          aria-label="Delete"
                          disabled={!loggedInUser?.policies.collaborator.update || isRemoving}
                        >
                          <Icon name="trash2" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
          {selectedCollaborator ? (
            <CollaboratorDetails
              selectedCollaborator={selectedCollaborator}
              onClose={() => setSelectedCollaborator(null)}
              onRemove={remove}
              isRemoving={isRemoving}
            />
          ) : null}
        </>
      ) : (
        <section className="p-4 md:p-8">
          <Placeholder>
            <figure>
              <img src={placeholder} />
            </figure>
            <h2>No collaborators yet</h2>
            <h4>Share your revenue with the people who helped create your products.</h4>
            <a href="/help/article/341-collaborations" target="_blank" rel="noreferrer">
              Learn more about collaborators
            </a>
          </Placeholder>
        </section>
      )}
    </Layout>
  );
}
