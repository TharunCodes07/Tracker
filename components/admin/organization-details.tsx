"use client";

import Link from "next/link";
import { FormEvent, useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
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
import type {
  AdminUserListItem,
  CreatedAccountCredentials,
  OrganizationDetails as OrganizationDetailsModel,
} from "@/routes/admin/accounts";

interface CreateUserResponse {
  user: AdminUserListItem;
  credentials: CreatedAccountCredentials;
  message: string;
}

interface UpdateOrganizationResponse {
  organization: OrganizationDetailsModel;
  message: string;
}

interface DeleteOrganizationResponse {
  organizationId: string;
  message: string;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function roleLabel(role: string) {
  return role === "ADMIN" ? "Admin" : "User";
}

export function OrganizationDetails({
  initialOrganization,
}: {
  initialOrganization: OrganizationDetailsModel;
}) {
  const router = useRouter();
  const [organization, setOrganization] = useState(initialOrganization);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [editName, setEditName] = useState(initialOrganization.name);
  const [editSlug, setEditSlug] = useState(initialOrganization.slug);
  const [pending, setPending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [lastCredentials, setLastCredentials] = useState<CreatedAccountCredentials | null>(null);

  const searchText = useCallback(
    (managedUser: AdminUserListItem) =>
      [
        managedUser.name,
        managedUser.email,
        roleLabel(managedUser.role),
        managedUser.status,
        managedUser.mustChangePassword ? "password pending" : "",
      ].join(" "),
    []
  );

  const table = usePaginatedTableData({
    rows: organization.users,
    searchText,
    initialPageSize: 10,
  });

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
    ],
    []
  );

  function resetForm() {
    setName("");
    setEmail("");
    setRole("USER");
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
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
          role,
          organizationId: organization.id,
        }),
      });

      setOrganization((current) => ({
        ...current,
        adminEmail: payload.user.role === "ADMIN" ? payload.user.email : current.adminEmail,
        memberCount: current.memberCount + 1,
        users: [payload.user, ...current.users],
      }));
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

  function openEditDialog() {
    setEditName(organization.name);
    setEditSlug(organization.slug);
    setEditOpen(true);
  }

  async function handleUpdateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPending) {
      return;
    }

    setEditPending(true);

    try {
      const payload = await requestJson<UpdateOrganizationResponse>(
        `/api/admin/organizations/${organization.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: editName,
            slug: editSlug,
          }),
        }
      );

      setOrganization(payload.organization);
      setEditOpen(false);
      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update organization.");
    } finally {
      setEditPending(false);
    }
  }

  async function handleDeleteOrganization() {
    if (deletePending) {
      return;
    }

    setDeletePending(true);

    try {
      const payload = await requestJson<DeleteOrganizationResponse>(
        `/api/admin/organizations/${organization.id}`,
        { method: "DELETE" }
      );

      toast.success(payload.message);
      router.replace("/admin/organizations");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete organization.");
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="w-fit px-0 hover:bg-transparent">
            <Link href="/admin/organizations">
              <ArrowLeft className="h-4 w-4" />
              Organizations
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{organization.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {organization.slug} - Created {formatDate(organization.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={openEditDialog}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add user
          </Button>
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <TemporaryCredentialsBanner credentials={lastCredentials} title="Temporary credentials" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Users", organization.memberCount],
          ["Teams", organization.teamCount],
          ["Projects", organization.projectCount],
          ["Issues", organization.issueCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card/80 p-4 shadow-sm">
            <div className="text-xs uppercase text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Organization users</h2>
          <p className="text-sm text-muted-foreground">
            Click a user to open the user detail page.
          </p>
        </div>

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
          emptyMessage="No users are assigned to this organization."
          showColumnViewControl={false}
          onRowClick={(managedUser) => router.push(`/admin/users/${managedUser.id}`)}
          paginationPageSizes={[5, 10, 20, 50]}
        />
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user to organization</DialogTitle>
            <DialogDescription>Create an account in {organization.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="organization-user-name">Full name</FieldLabel>
                <Input
                  id="organization-user-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Cooper"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="organization-user-email">Email</FieldLabel>
                <Input
                  id="organization-user-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jane@company.com"
                />
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select value={role} onValueChange={(value) => setRole(value as "ADMIN" | "USER")}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={pending} type="submit">
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
            <DialogTitle>Edit organization</DialogTitle>
            <DialogDescription>Update the organization name and slug.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateOrganization}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="detail-edit-organization-name">Name</FieldLabel>
                <Input
                  id="detail-edit-organization-name"
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="detail-edit-organization-slug">Slug</FieldLabel>
                <Input
                  id="detail-edit-organization-slug"
                  required
                  value={editSlug}
                  onChange={(event) => setEditSlug(slugify(event.target.value))}
                />
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
            <AlertDialogTitle>Delete organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {organization.name}, its managed users, and tenant data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteOrganization();
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
