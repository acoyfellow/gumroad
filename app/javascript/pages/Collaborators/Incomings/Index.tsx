import { router, usePage } from "@inertiajs/react";
import * as React from "react";

import { classNames } from "$app/utils/classNames";

import { Button } from "$app/components/Button";
import { Layout } from "$app/components/Collaborators/Layout";
import { Icon } from "$app/components/Icons";
import { LoadingSpinner } from "$app/components/LoadingSpinner";
import { useLoggedInUser } from "$app/components/LoggedInUser";
import { NavigationButtonInertia } from "$app/components/NavigationButton";
import { showAlert } from "$app/components/server-components/Alert";
import Placeholder from "$app/components/ui/Placeholder";
import { Sheet, SheetHeader } from "$app/components/ui/Sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$app/components/ui/Table";
import { WithTooltip } from "$app/components/WithTooltip";

import placeholder from "$assets/images/placeholders/collaborators.png";

type IncomingCollaborator = {
  id: string;
  seller_email: string;
  seller_name: string;
  seller_avatar_url: string;
  apply_to_all_products: boolean;
  affiliate_percentage: number;
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

type Props = {
  collaborators: IncomingCollaborator[];
  collaborators_disabled_reason: string | null;
};

const formatProductNames = (incomingCollaborator: IncomingCollaborator) => {
  if (incomingCollaborator.products.length === 0) {
    return "None";
  } else if (incomingCollaborator.products.length === 1 && incomingCollaborator.products[0]) {
    return incomingCollaborator.products[0].name;
  }
  return `${incomingCollaborator.products.length.toLocaleString()} products`;
};

const formatAsPercent = (commission: number) => (commission / 100).toLocaleString([], { style: "percent" });

const formatCommission = (incomingCollaborator: IncomingCollaborator) => {
  const sortedCommissions = incomingCollaborator.products
    .map((product) => product.affiliate_percentage)
    .filter(Number)
    .sort((a, b) => a - b);
  const commissions = [...new Set(sortedCommissions)]; // remove duplicates

  if (commissions.length === 0) {
    return formatAsPercent(incomingCollaborator.affiliate_percentage);
  } else if (commissions.length === 1 && commissions[0] !== undefined) {
    return formatAsPercent(commissions[0]);
  } else if (commissions.length > 1) {
    const lowestCommission = commissions[0];
    const highestCommission = commissions[commissions.length - 1];
    if (lowestCommission && highestCommission) {
      return `${formatAsPercent(lowestCommission)} - ${formatAsPercent(highestCommission)}`;
    }
  }

  return formatAsPercent(incomingCollaborator.affiliate_percentage);
};

const IncomingCollaboratorDetails = ({
  selected,
  onClose,
  onAccept,
  onReject,
  onRemove,
  disabled,
}: {
  selected: IncomingCollaborator;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onRemove: () => void;
  disabled: boolean;
}) => (
  <Sheet open onOpenChange={onClose}>
    <SheetHeader>{selected.seller_name}</SheetHeader>
    <section className="stack">
      <h3>Email</h3>
      <div>
        <span>{selected.seller_email}</span>
      </div>
    </section>

    <section className="stack">
      <h3>Products</h3>
      {selected.products.map((product) => (
        <section key={product.id}>
          <a href={product.url} target="_blank" rel="noreferrer">
            {product.name}
          </a>
          <div>{formatAsPercent(product.affiliate_percentage)}</div>
        </section>
      ))}
    </section>

    <section className="mt-auto flex gap-4">
      {selected.invitation_accepted ? (
        <Button className="flex-1" aria-label="Remove" color="danger" disabled={disabled} onClick={onRemove}>
          Remove
        </Button>
      ) : (
        <>
          <Button className="flex-1" aria-label="Accept" onClick={onAccept} disabled={disabled}>
            Accept
          </Button>
          <Button className="flex-1" color="danger" aria-label="Decline" onClick={onReject} disabled={disabled}>
            Decline
          </Button>
        </>
      )}
    </section>
  </Sheet>
);

const IncomingCollaboratorsTableRow = ({
  incomingCollaborator,
  isSelected,
  onSelect,
  onAccept,
  onReject,
  disabled,
}: {
  incomingCollaborator: IncomingCollaborator;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
  disabled: boolean;
}) => (
  <TableRow key={incomingCollaborator.id} selected={isSelected} onClick={onSelect}>
    <TableCell>
      <div className="flex items-center gap-4">
        <img
          className="user-avatar w-8!"
          src={incomingCollaborator.seller_avatar_url}
          alt={`Avatar of ${incomingCollaborator.seller_name || "Collaborator"}`}
        />
        <div>
          <span className="whitespace-nowrap">{incomingCollaborator.seller_name || "Collaborator"}</span>
          <small className="line-clamp-1">{incomingCollaborator.seller_email}</small>
        </div>
      </div>
    </TableCell>
    <TableCell>
      <span className="line-clamp-2">{formatProductNames(incomingCollaborator)}</span>
    </TableCell>
    <TableCell className="whitespace-nowrap">{formatCommission(incomingCollaborator)}</TableCell>
    <TableCell className="whitespace-nowrap">
      {incomingCollaborator.invitation_accepted ? <>Accepted</> : <>Pending</>}
    </TableCell>
    <TableCell>
      {incomingCollaborator.invitation_accepted ? null : (
        <div className="flex flex-wrap gap-3 lg:justify-end" onClick={(e) => e.stopPropagation()}>
          <Button type="submit" aria-label="Accept" onClick={onAccept} disabled={disabled}>
            <Icon name="outline-check" />
          </Button>
          <Button type="submit" color="danger" aria-label="Decline" onClick={onReject} disabled={disabled}>
            <Icon name="x" />
          </Button>
        </div>
      )}
    </TableCell>
  </TableRow>
);

const TableRowLoadingSpinner = () => (
  <TableRow>
    <TableCell colSpan={5}>
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner className="size-8" />
      </div>
    </TableCell>
  </TableRow>
);

const EmptyState = () => (
  <section className="p-4 md:p-8">
    <Placeholder>
      <figure>
        <img src={placeholder} />
      </figure>
      <h2>No collaborations yet</h2>
      <h4>Creators who have invited you to collaborate on their products will appear here.</h4>
      <a href="/help/article/341-collaborations" target="_blank" rel="noreferrer">
        Learn more about collaborations
      </a>
    </Placeholder>
  </section>
);

const IncomingCollaboratorsTable = ({
  incomingCollaborators,
  selected,
  processing,
  loading,
  disabled,
  onSelect,
  onAccept,
  onReject,
  onRemove,
}: {
  incomingCollaborators: IncomingCollaborator[];
  selected: IncomingCollaborator | null;
  processing: Set<string>;
  loading: boolean;
  disabled: boolean;
  onSelect: (collaborator: IncomingCollaborator | null) => void;
  onAccept: (collaborator: IncomingCollaborator) => void;
  onReject: (collaborator: IncomingCollaborator) => void;
  onRemove: (collaborator: IncomingCollaborator) => void;
}) => (
  <section className="p-4 md:p-8">
    <Table aria-live="polite" className={classNames((loading || disabled) && "pointer-events-none opacity-50")}>
      <TableHeader>
        <TableRow>
          <TableHead>From</TableHead>
          <TableHead>Products</TableHead>
          <TableHead>Your cut</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading ? (
          <TableRowLoadingSpinner />
        ) : (
          incomingCollaborators.map((incomingCollaborator) => (
            <IncomingCollaboratorsTableRow
              key={incomingCollaborator.id}
              incomingCollaborator={incomingCollaborator}
              isSelected={incomingCollaborator.id === selected?.id}
              onSelect={() => onSelect(incomingCollaborator)}
              onAccept={() => onAccept(incomingCollaborator)}
              onReject={() => onReject(incomingCollaborator)}
              disabled={processing.has(incomingCollaborator.id) || disabled}
            />
          ))
        )}
      </TableBody>
    </Table>
    {selected ? (
      <IncomingCollaboratorDetails
        selected={selected}
        onClose={() => onSelect(null)}
        onAccept={() => onAccept(selected)}
        onReject={() => onReject(selected)}
        onRemove={() => onRemove(selected)}
        disabled={processing.has(selected.id) || disabled}
      />
    ) : null}
  </section>
);

const pendingCollaboratorsFirst = (a: IncomingCollaborator, b: IncomingCollaborator) => {
  const aPriority = a.invitation_accepted ? 0 : 1;
  const bPriority = b.invitation_accepted ? 0 : 1;
  if (aPriority !== bPriority) {
    return bPriority - aPriority;
  }
  return 0;
};

export default function IncomingsIndex() {
  const props = usePage<Props>().props;
  const loggedInUser = useLoggedInUser();
  const { collaborators: initialCollaborators, collaborators_disabled_reason } = props;

  // We rely on Inertia props updates, but for immediate UI feedback on sorting/filtering
  // we might maintain local state or just let the server sort.
  // The original component used local state for sorting pending first.
  const [incomingCollaborators, setIncomingCollaborators] = React.useState<IncomingCollaborator[]>(
    [...initialCollaborators].sort(pendingCollaboratorsFirst),
  );

  // Update state when props change
  React.useEffect(() => {
    setIncomingCollaborators([...initialCollaborators].sort(pendingCollaboratorsFirst));
  }, [initialCollaborators]);

  const [processing, setProcessing] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<IncomingCollaborator | null>(null);
  const loading = false; // Managed by Inertia router usually
  const isDisabled = processing.size > 0;

  const startProcessing = (incomingCollaborator: IncomingCollaborator) => {
    setProcessing((prev) => {
      const newSet = new Set(prev);
      newSet.add(incomingCollaborator.id);
      return newSet;
    });
  };

  const finishProcessing = (incomingCollaborator: IncomingCollaborator) => {
    setProcessing((prev) => {
      const newSet = new Set(prev);
      newSet.delete(incomingCollaborator.id);
      return newSet;
    });
  };

  const acceptInvitation = (incomingCollaborator: IncomingCollaborator) => {
    startProcessing(incomingCollaborator);
    router.post(
      Routes.internal_collaborator_invitation_acceptances_path(incomingCollaborator.id),
      {},
      {
        onSuccess: () => {
          showAlert("Invitation accepted", "success");
          setSelected(null);
        },
        onError: () => {
          showAlert("Sorry, something went wrong. Please try again.", "error");
        },
        onFinish: () => {
          finishProcessing(incomingCollaborator);
        },
      },
    );
  };

  const declineInvitation = (incomingCollaborator: IncomingCollaborator) => {
    startProcessing(incomingCollaborator);
    router.post(
      Routes.internal_collaborator_invitation_declines_path(incomingCollaborator.id),
      {},
      {
        onSuccess: () => {
          showAlert("Invitation declined", "success");
          setSelected(null);
        },
        onError: () => {
          showAlert("Sorry, something went wrong. Please try again.", "error");
        },
        onFinish: () => {
          finishProcessing(incomingCollaborator);
        },
      },
    );
  };

  const removeIncomingCollaborator = (incomingCollaborator: IncomingCollaborator) => {
    startProcessing(incomingCollaborator);
    router.delete(Routes.internal_collaborator_path(incomingCollaborator.id), {
      onSuccess: () => {
        showAlert("Collaborator removed", "success");
        setSelected(null);
      },
      onError: () => {
        showAlert("Sorry, something went wrong. Please try again.", "error");
      },
      onFinish: () => {
        finishProcessing(incomingCollaborator);
      },
    });
  };

  return (
    <Layout
      title="Collaborators"
      selectedTab="collaborations"
      showTabs
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
      {incomingCollaborators.length === 0 ? (
        <EmptyState />
      ) : (
        <IncomingCollaboratorsTable
          incomingCollaborators={incomingCollaborators}
          selected={selected}
          processing={processing}
          loading={loading}
          disabled={isDisabled}
          onSelect={(collaborator) => setSelected(collaborator)}
          onAccept={(collaborator) => acceptInvitation(collaborator)}
          onReject={(collaborator) => declineInvitation(collaborator)}
          onRemove={(collaborator) => removeIncomingCollaborator(collaborator)}
        />
      )}
    </Layout>
  );
}
