import { useForm, usePage } from "@inertiajs/react";
import * as React from "react";

import { classNames } from "$app/utils/classNames";

import { Button } from "$app/components/Button";
import { Layout } from "$app/components/Collaborators/Layout";
import { Icon } from "$app/components/Icons";
import { useLoggedInUser } from "$app/components/LoggedInUser";
import { NavigationButtonInertia } from "$app/components/NavigationButton";
import { Placeholder, PlaceholderImage } from "$app/components/ui/Placeholder";
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
          <Button aria-label="Accept" onClick={onAccept} disabled={disabled}>
            <Icon name="outline-check" />
          </Button>
          <Button color="danger" aria-label="Decline" onClick={onReject} disabled={disabled}>
            <Icon name="x" />
          </Button>
        </div>
      )}
    </TableCell>
  </TableRow>
);

const EmptyState = () => (
  <section className="p-4 md:p-8">
    <Placeholder>
      <PlaceholderImage src={placeholder} />
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
  disabled,
  onSelect,
  onAccept,
  onReject,
  onRemove,
}: {
  incomingCollaborators: IncomingCollaborator[];
  selected: IncomingCollaborator | null;
  disabled: boolean;
  onSelect: (collaborator: IncomingCollaborator | null) => void;
  onAccept: (collaborator: IncomingCollaborator) => void;
  onReject: (collaborator: IncomingCollaborator) => void;
  onRemove: (collaborator: IncomingCollaborator) => void;
}) => (
  <section className="p-4 md:p-8">
    <Table aria-live="polite" className={classNames(disabled && "pointer-events-none opacity-50")}>
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
        {incomingCollaborators.map((incomingCollaborator) => (
          <IncomingCollaboratorsTableRow
            key={incomingCollaborator.id}
            incomingCollaborator={incomingCollaborator}
            isSelected={incomingCollaborator.id === selected?.id}
            onSelect={() => onSelect(incomingCollaborator)}
            onAccept={() => onAccept(incomingCollaborator)}
            onReject={() => onReject(incomingCollaborator)}
            disabled={disabled}
          />
        ))}
      </TableBody>
    </Table>
    {selected ? (
      <IncomingCollaboratorDetails
        selected={selected}
        onClose={() => onSelect(null)}
        onAccept={() => onAccept(selected)}
        onReject={() => onReject(selected)}
        onRemove={() => onRemove(selected)}
        disabled={disabled}
      />
    ) : null}
  </section>
);

export default function IncomingsIndex() {
  const props = usePage<Props>().props;
  const loggedInUser = useLoggedInUser();
  const { collaborators: incomingCollaborators, collaborators_disabled_reason } = props;

  const [selected, setSelected] = React.useState<IncomingCollaborator | null>(null);

  const acceptForm = useForm({});
  const declineForm = useForm({});
  const removeForm = useForm({});

  const isDisabled = acceptForm.processing || declineForm.processing || removeForm.processing;

  const acceptInvitation = (incomingCollaborator: IncomingCollaborator) => {
    acceptForm.post(Routes.accept_collaborators_incoming_path(incomingCollaborator.id), {
      onSuccess: () => setSelected(null),
    });
  };

  const declineInvitation = (incomingCollaborator: IncomingCollaborator) => {
    declineForm.post(Routes.decline_collaborators_incoming_path(incomingCollaborator.id), {
      onSuccess: () => setSelected(null),
    });
  };

  const removeIncomingCollaborator = (incomingCollaborator: IncomingCollaborator) => {
    removeForm.delete(Routes.collaborators_incoming_path(incomingCollaborator.id), {
      onSuccess: () => setSelected(null),
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
