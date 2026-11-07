import { AccessLevel } from "@/__generated__/graphql";
import { DeleteDialog } from "@/components/delete-dialog";
import { UserAvatar } from "@/features/user-avatar";
import { accessLevelLabel } from "@/lib/plans";
import { useMutation } from "@apollo/client/react";
import { Button } from "@heroui/react";
import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  RevokePlanGrantDocument,
  SetPlanGrantDocument,
  type PlanGrantsFragment,
} from "./__generated__/management.generated";
import { LevelSelect } from "./level-select";

type Person = PlanGrantsFragment["owner"];
type Grant = PlanGrantsFragment["grants"][number];

function displayName(person: { name: string | null; email: string }) {
  return person.name ?? person.email;
}

function PersonRow({
  person,
  children,
  footer = null,
}: {
  person: Person | Grant["user"];
  children: ReactNode;
  /** Shown beneath the row, such as an error about it. */
  footer?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-xs">
      <div className="flex items-center gap-sm">
        <UserAvatar user={person} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{displayName(person)}</span>
          {person.name ? (
            <span className="truncate text-xs text-muted">{person.email}</span>
          ) : null}
        </span>
        {children}
      </div>
      {footer}
    </li>
  );
}

function GrantRow({
  planId,
  grant,
  canAdminister,
  isDisabled,
  onLeave,
}: {
  planId: string;
  grant: Grant;
  canAdminister: boolean;
  isDisabled: boolean;
  onLeave: () => void;
}) {
  const [setGrant] = useMutation(SetPlanGrantDocument);
  const [revokeGrant] = useMutation(RevokePlanGrantDocument);
  const [pendingLevel, setPendingLevel] = useState<AccessLevel | null>(null);
  const [confirmLevel, setConfirmLevel] = useState<AccessLevel | null>(null);
  const [removing, setRemoving] = useState(false);
  const [failed, setFailed] = useState(false);
  const name = displayName(grant.user);
  const self = grant.user.me;

  if (!canAdminister) {
    return (
      <PersonRow person={grant.user}>
        <span className="text-sm">{accessLevelLabel(grant.level)}</span>
      </PersonRow>
    );
  }

  async function saveLevel(level: AccessLevel) {
    const result = await setGrant({
      variables: { planId, userId: grant.user.id, level },
    });
    if (result.data?.planner.setGrant.id !== planId)
      throw new Error("Missing grant result");
  }

  function changeLevel(level: AccessLevel) {
    if (level === grant.level || pendingLevel) return;
    setFailed(false);
    if (self) {
      setConfirmLevel(level);
      return;
    }
    setPendingLevel(level);
    saveLevel(level)
      .catch(() => setFailed(true))
      .finally(() => setPendingLevel(null));
  }

  async function remove() {
    const result = await revokeGrant({
      variables: { planId, userId: grant.user.id },
      update(cache, result) {
        if (!self) return;
        if (result.data?.planner.revokeGrant.id !== planId)
          throw new Error("Missing revocation result");
        // Evict within the mutation so query updates precede navigation.
        cache.evict({ id: cache.identify({ __typename: "Plan", id: planId }) });
        cache.gc();
      },
    });
    if (result.data?.planner.revokeGrant.id !== planId)
      throw new Error("Missing revocation result");
    if (self) onLeave();
  }

  const busy = isDisabled || pendingLevel !== null;
  return (
    <PersonRow
      person={grant.user}
      footer={
        failed ? (
          <p role="alert" className="text-xs text-danger">
            Couldn’t change {name}’s access. Try again.
          </p>
        ) : null
      }
    >
      <LevelSelect
        label={`Access for ${name}`}
        value={pendingLevel ?? grant.level}
        isDisabled={busy}
        onChange={changeLevel}
      />
      <Button
        aria-label={`Remove ${name}`}
        isDisabled={busy}
        isIconOnly
        variant="ghost"
        onPress={() => {
          setFailed(false);
          setRemoving(true);
        }}
      >
        <X aria-hidden="true" />
      </Button>
      <DeleteDialog
        heading="Change your access?"
        confirmLabel="Change my access"
        pendingLabel="Changing your access"
        pendingText="Changing…"
        failureTitle="Your access could not be changed"
        failureDescription="Your access is unchanged. Try again."
        isOpen={confirmLevel !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmLevel(null);
        }}
        onDelete={async () => {
          if (confirmLevel === null) return;
          await saveLevel(confirmLevel);
          onLeave();
        }}
      >
        <p>
          You’ll have {accessLevelLabel(confirmLevel ?? grant.level)} access,
          and won’t be able to manage who this plan is shared with.
        </p>
      </DeleteDialog>
      <DeleteDialog
        heading={`Remove ${name}?`}
        confirmLabel="Remove"
        pendingLabel={`Removing ${name}`}
        pendingText="Removing…"
        failureTitle={`${name} could not be removed`}
        failureDescription={
          self
            ? "You still have access. Try again."
            : "They still have access. Try again."
        }
        isOpen={removing}
        onOpenChange={setRemoving}
        onDelete={remove}
      >
        <p>
          {self
            ? "You’ll lose access to this plan, and your assignments on it will be cleared."
            : `${name} will lose access to this plan, and their assignments on it will be cleared.`}
        </p>
      </DeleteDialog>
    </PersonRow>
  );
}

/** I list who a plan belongs to and who it's shared with. */
export function GrantList({
  planId,
  owner,
  grants,
  canAdminister,
  isDisabled,
  onLeave,
}: {
  planId: string;
  owner: Person;
  grants: readonly Grant[];
  canAdminister: boolean;
  isDisabled: boolean;
  onLeave: () => void;
}) {
  return (
    <>
      <ul aria-label="People with access" className="flex flex-col gap-sm">
        <PersonRow person={owner}>
          <span className="text-sm">Owner</span>
        </PersonRow>
        {grants.map((grant) => (
          <GrantRow
            key={grant.user.id}
            planId={planId}
            grant={grant}
            canAdminister={canAdminister}
            isDisabled={isDisabled}
            onLeave={onLeave}
          />
        ))}
      </ul>
      {grants.length === 0 ? (
        <p className="text-sm text-muted">Not shared with anyone yet.</p>
      ) : null}
    </>
  );
}
