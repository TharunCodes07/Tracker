"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { requestJson } from "@/components/admin/admin-http";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminUserListItem, OrganizationListItem } from "@/routes/admin/accounts";

interface UpdateUserResponse {
  user: AdminUserListItem;
  message: string;
}

interface DeleteUserResponse {
  userId: string;
  message: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function roleLabel(role: string) {
  if (role === "ADMIN") {
    return "Admin";
  }

  if (role === "SUPER_ADMIN") {
    return "Super Admin";
  }

  return "User";
}

export function UserDetails({
  currentUserId,
  initialUser,
  isSuperAdmin,
  organizations,
}: {
  currentUserId: string;
  initialUser: AdminUserListItem;
  isSuperAdmin: boolean;
  organizations: OrganizationListItem[];
}) {
  const router = useRouter();
  const [managedUser, setManagedUser] = useState(initialUser);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editName, setEditName] = useState(initialUser.name);
  const [editEmail, setEditEmail] = useState(initialUser.email);
  const [editRole, setEditRole] = useState<"ADMIN" | "USER">(
    initialUser.role === "ADMIN" ? "ADMIN" : "USER"
  );
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">(
    initialUser.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"
  );
  const [editOrganizationId, setEditOrganizationId] = useState(
    initialUser.organizationId ?? organizations[0]?.id ?? ""
  );
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const availableRoles = useMemo(
    () => (isSuperAdmin ? (["ADMIN", "USER"] as const) : (["USER"] as const)),
    [isSuperAdmin]
  );
  const canManage = currentUserId !== managedUser.id && (isSuperAdmin || managedUser.role === "USER");

  function openEditDialog() {
    setEditName(managedUser.name);
    setEditEmail(managedUser.email);
    setEditRole(managedUser.role === "ADMIN" ? "ADMIN" : "USER");
    setEditStatus(managedUser.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setEditOrganizationId(managedUser.organizationId ?? organizations[0]?.id ?? "");
    setEditOpen(true);
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPending) {
      return;
    }

    setEditPending(true);

    try {
      const payload = await requestJson<UpdateUserResponse>(`/api/admin/users/${managedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          status: editStatus,
          organizationId: isSuperAdmin ? editOrganizationId : undefined,
        }),
      });

      setManagedUser(payload.user);
      setEditOpen(false);
      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user.");
    } finally {
      setEditPending(false);
    }
  }

  async function handleDeleteUser() {
    if (deletePending) {
      return;
    }

    setDeletePending(true);

    try {
      const payload = await requestJson<DeleteUserResponse>(`/api/admin/users/${managedUser.id}`, {
        method: "DELETE",
      });

      toast.success(payload.message);
      router.replace("/admin/users");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete user.");
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="w-fit px-0 hover:bg-transparent">
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
              Users
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{managedUser.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{managedUser.email}</p>
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openEditDialog}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card/80 p-4 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Role</div>
          <div className="mt-2">
            <Badge variant="secondary">{roleLabel(managedUser.role)}</Badge>
          </div>
        </div>
        <div className="rounded-xl border bg-card/80 p-4 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Status</div>
          <div className="mt-2">
            <Badge variant={managedUser.mustChangePassword ? "outline" : "secondary"}>
              {managedUser.mustChangePassword ? "Password change required" : managedUser.status}
            </Badge>
          </div>
        </div>
        <div className="rounded-xl border bg-card/80 p-4 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Organization</div>
          <div className="mt-2 font-medium text-foreground">
            {managedUser.organizationName ?? "Unassigned"}
          </div>
        </div>
        <div className="rounded-xl border bg-card/80 p-4 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Created</div>
          <div className="mt-2 font-medium text-foreground">
            {formatDate(managedUser.createdAt)}
          </div>
        </div>
      </section>

      {isSuperAdmin && managedUser.organizationId ? (
        <Button asChild variant="outline">
          <Link href={`/admin/organizations/${managedUser.organizationId}`}>Open organization</Link>
        </Button>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update account details and access state.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="detail-edit-user-name">Full name</FieldLabel>
                <Input
                  id="detail-edit-user-name"
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="detail-edit-user-email">Email</FieldLabel>
                <Input
                  id="detail-edit-user-email"
                  required
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                />
              </Field>
              {isSuperAdmin ? (
                <Field>
                  <FieldLabel>Organization</FieldLabel>
                  <Select value={editOrganizationId} onValueChange={setEditOrganizationId}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((organization) => (
                        <SelectItem key={organization.id} value={organization.id}>
                          {organization.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select
                  value={editRole}
                  onValueChange={(value) => setEditRole(value as "ADMIN" | "USER")}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((availableRole) => (
                      <SelectItem key={availableRole} value={availableRole}>
                        {roleLabel(availableRole)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={editStatus}
                  onValueChange={(value) => setEditStatus(value as "ACTIVE" | "INACTIVE")}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={editPending} type="submit">
                  {editPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {managedUser.name} and their login access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteUser();
              }}
            >
              {deletePending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
