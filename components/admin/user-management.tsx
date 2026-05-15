"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

import { requestJson } from "@/components/admin/admin-http";
import { TemporaryCredentialsBanner } from "@/components/admin/temporary-credentials-banner";
import { usePaginatedTableData } from "@/components/admin/use-paginated-table-data";
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
import { DataTable } from "@/components/ui/data-table";
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
import { authClient } from "@/lib/auth-client";
import type {
  AdminUserListItem,
  CreatedAccountCredentials,
  OrganizationListItem,
} from "@/routes/admin/accounts";

interface UsersResponse {
  users: AdminUserListItem[];
  organizations: OrganizationListItem[];
}

interface CreateUserResponse {
  user: AdminUserListItem;
  credentials: CreatedAccountCredentials;
  message: string;
}

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

export function UserManagement() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "USER";
  const currentUserId = session?.user.id;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState<"ADMIN" | "USER">("USER");
  const [organizationId, setOrganizationId] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "USER">("USER");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editOrganizationId, setEditOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [lastCredentials, setLastCredentials] = useState<CreatedAccountCredentials | null>(null);

  const availableRoles = useMemo(
    () => (isSuperAdmin ? (["ADMIN", "USER"] as const) : (["USER"] as const)),
    [isSuperAdmin]
  );

  useEffect(() => {
    let active = true;

    requestJson<UsersResponse>("/api/admin/users")
      .then((payload) => {
        if (!active) {
          return;
        }

        setUsers(payload.users);
        setOrganizations(payload.organizations);
        setOrganizationId((current) => current || payload.organizations[0]?.id || "");
      })
      .catch((error) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Unable to load users.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const searchText = useCallback(
    (managedUser: AdminUserListItem) =>
      [
        managedUser.name,
        managedUser.email,
        roleLabel(managedUser.role),
        managedUser.organizationName ?? "",
        managedUser.status,
      ].join(" "),
    []
  );

  const table = usePaginatedTableData({
    rows: users,
    searchText,
    initialPageSize: 10,
  });

  const openEditUser = useCallback(
    (managedUser: AdminUserListItem) => {
      setEditingUser(managedUser);
      setEditName(managedUser.name);
      setEditEmail(managedUser.email);
      setEditRole(managedUser.role === "ADMIN" ? "ADMIN" : "USER");
      setEditStatus(managedUser.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
      setEditOrganizationId(managedUser.organizationId ?? organizations[0]?.id ?? "");
      setEditOpen(true);
    },
    [organizations]
  );

  const columns = useMemo<ColumnDef<AdminUserListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => (
          <div className="text-left">
            <div className="font-medium text-foreground">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        ),
        meta: { align: "left", textMode: "wrap" },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <Badge variant="secondary">{roleLabel(row.original.role)}</Badge>,
        meta: { align: "left" },
      },
      ...(isSuperAdmin
        ? [
            {
              accessorKey: "organizationName",
              header: "Organization",
              cell: ({ row }) => row.original.organizationName ?? "Unassigned",
              meta: { align: "left", textMode: "truncate" },
            } satisfies ColumnDef<AdminUserListItem>,
          ]
        : []),
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.mustChangePassword ? "outline" : "secondary"}>
            {row.original.mustChangePassword ? "Password pending" : row.original.status}
          </Badge>
        ),
        meta: { align: "left" },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
        meta: { align: "left", textMode: "truncate" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          row.original.id !== currentUserId && (isSuperAdmin || row.original.role === "USER") ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Edit user"
                onClick={(event) => {
                  event.stopPropagation();
                  openEditUser(row.original);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                aria-label="Delete user"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteTarget(row.original);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null
        ),
        meta: { align: "right" },
      },
    ],
    [currentUserId, isSuperAdmin, openEditUser]
  );

  function resetForm() {
    setName("");
    setEmail("");
    setUserRole("USER");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setLastCredentials(null);

    try {
      const payload = await requestJson<CreateUserResponse>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          role: userRole,
          organizationId: isSuperAdmin ? organizationId : undefined,
        }),
      });

      setUsers((current) => [payload.user, ...current]);
      setLastCredentials(payload.credentials);
      resetForm();
      setCreateOpen(false);
      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create user.");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPending || !editingUser) {
      return;
    }

    setEditPending(true);

    try {
      const payload = await requestJson<UpdateUserResponse>(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          status: editStatus,
          organizationId: isSuperAdmin ? editOrganizationId : undefined,
        }),
      });

      setUsers((current) =>
        current.map((managedUser) =>
          managedUser.id === payload.user.id ? payload.user : managedUser
        )
      );
      setEditOpen(false);
      setEditingUser(null);
      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user.");
    } finally {
      setEditPending(false);
    }
  }

  async function handleDeleteUser() {
    if (deletePending || !deleteTarget) {
      return;
    }

    setDeletePending(true);

    try {
      const payload = await requestJson<DeleteUserResponse>(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      setUsers((current) => current.filter((managedUser) => managedUser.id !== payload.userId));
      setDeleteTarget(null);
      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete user.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Badge variant="outline" className="w-fit">
          <UserCog className="h-3.5 w-3.5 text-emerald-500" />
          User administration
        </Badge>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Create managed accounts and review their organization assignment.
          </p>
        </div>
      </section>

      <TemporaryCredentialsBanner credentials={lastCredentials} title="Temporary credentials" />

      <DataTable
        columns={columns}
        data={table.pagedRows}
        filterColumn="name"
        filterPlaceholder="Search users..."
        filterValue={table.filterValue}
        onFilterChange={table.setFilterValue}
        pageCount={table.pageCount}
        pageIndex={table.pageIndex}
        pageSize={table.pageSize}
        onPageIndexChange={table.setPageIndex}
        onPageSizeChange={table.setPageSize}
        isLoading={loading}
        skeletonRowCount={8}
        emptyMessage="No managed users yet."
        showColumnViewControl={false}
        onRowClick={(managedUser) => router.push(`/admin/users/${managedUser.id}`)}
        toolbarEndExtras={
          <div className="ml-auto">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New user
            </Button>
          </div>
        }
        paginationPageSizes={[5, 10, 20, 50]}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
            <DialogDescription>
              {isSuperAdmin
                ? "Choose an organization and role for the account."
                : "Admins can create user accounts inside their own organization."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="managed-user-name">Full name</FieldLabel>
                <Input
                  id="managed-user-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Cooper"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="managed-user-email">Email</FieldLabel>
                <Input
                  id="managed-user-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jane@company.com"
                />
              </Field>
              {isSuperAdmin ? (
                <Field>
                  <FieldLabel>Organization</FieldLabel>
                  <Select value={organizationId} onValueChange={setOrganizationId}>
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
                  value={userRole}
                  onValueChange={(value) => setUserRole(value as "ADMIN" | "USER")}
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
              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={pending || (isSuperAdmin && !organizationId)} type="submit">
                  {pending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update account details and access state.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-managed-user-name">Full name</FieldLabel>
                <Input
                  id="edit-managed-user-name"
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-managed-user-email">Email</FieldLabel>
                <Input
                  id="edit-managed-user-email"
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
                <Button disabled={editPending || !editingUser} type="submit">
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

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.name ?? "this user"} and their login access.
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
