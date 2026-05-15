"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Building2, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
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
import type { CreatedAccountCredentials, OrganizationListItem } from "@/routes/admin/accounts";

interface OrganizationResponse {
  organizations: OrganizationListItem[];
}

interface CreateOrganizationResponse {
  organization: OrganizationListItem;
  adminCredentials: CreatedAccountCredentials;
  message: string;
}

interface UpdateOrganizationResponse {
  organization: OrganizationListItem;
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

export function OrganizationManagement() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<OrganizationListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationListItem | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [pending, setPending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [lastCredentials, setLastCredentials] = useState<CreatedAccountCredentials | null>(null);

  const derivedSlug = useMemo(() => slugify(name), [name]);

  useEffect(() => {
    let active = true;

    requestJson<OrganizationResponse>("/api/admin/organizations")
      .then((payload) => {
        if (active) {
          setOrganizations(payload.organizations);
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Unable to load organizations.");
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
    (organization: OrganizationListItem) =>
      [
        organization.name,
        organization.slug,
        organization.adminEmail ?? "",
        String(organization.memberCount),
        String(organization.teamCount),
      ].join(" "),
    []
  );

  const table = usePaginatedTableData({
    rows: organizations,
    searchText,
    initialPageSize: 10,
  });

  const columns = useMemo<ColumnDef<OrganizationListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Organization",
        cell: ({ row }) => (
          <div className="text-left">
            <div className="font-medium text-foreground">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.slug}</div>
          </div>
        ),
        meta: { align: "left", textMode: "wrap" },
      },
      {
        accessorKey: "adminEmail",
        header: "Admin",
        cell: ({ row }) => row.original.adminEmail ?? "Not assigned",
        meta: { align: "left", textMode: "truncate" },
      },
      {
        accessorKey: "memberCount",
        header: "Users",
        cell: ({ row }) => row.original.memberCount,
        meta: { align: "right" },
      },
      {
        accessorKey: "teamCount",
        header: "Teams",
        cell: ({ row }) => row.original.teamCount,
        meta: { align: "right" },
      },
      {
        accessorKey: "projectCount",
        header: "Projects",
        cell: ({ row }) => row.original.projectCount,
        meta: { align: "right" },
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
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Edit organization"
              onClick={(event) => {
                event.stopPropagation();
                openEditOrganization(row.original);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label="Delete organization"
              onClick={(event) => {
                event.stopPropagation();
                setDeleteTarget(row.original);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        meta: { align: "right" },
      },
    ],
    []
  );

  function handleNameChange(value: string) {
    setName(value);
    setSlug((current) => (current ? current : slugify(value)));
  }

  function openEditOrganization(organization: OrganizationListItem) {
    setEditingOrganization(organization);
    setEditName(organization.name);
    setEditSlug(organization.slug);
    setEditOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setLastCredentials(null);

    try {
      const payload = await requestJson<CreateOrganizationResponse>("/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug: slug || derivedSlug,
        }),
      });

      setOrganizations((current) => [payload.organization, ...current]);
      setLastCredentials(payload.adminCredentials);
      setName("");
      setSlug("");
      setCreateOpen(false);
      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create organization.");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPending || !editingOrganization) {
      return;
    }

    setEditPending(true);

    try {
      const payload = await requestJson<UpdateOrganizationResponse>(
        `/api/admin/organizations/${editingOrganization.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: editName,
            slug: editSlug,
          }),
        }
      );

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === payload.organization.id ? payload.organization : organization
        )
      );
      setEditOpen(false);
      setEditingOrganization(null);
      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update organization.");
    } finally {
      setEditPending(false);
    }
  }

  async function handleDeleteOrganization() {
    if (deletePending || !deleteTarget) {
      return;
    }

    setDeletePending(true);

    try {
      const payload = await requestJson<DeleteOrganizationResponse>(
        `/api/admin/organizations/${deleteTarget.id}`,
        { method: "DELETE" }
      );

      setOrganizations((current) =>
        current.filter((organization) => organization.id !== payload.organizationId)
      );
      setDeleteTarget(null);
      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete organization.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Super admin
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Organizations</h1>
            <p className="text-sm text-muted-foreground">
              Manage tenant workspaces without joining them as the super admin.
            </p>
          </div>
        </div>
      </section>

      <TemporaryCredentialsBanner
        credentials={lastCredentials}
        title="Temporary account credentials"
      />

      <DataTable
        columns={columns}
        data={table.pagedRows}
        filterColumn="name"
        filterPlaceholder="Search organizations..."
        filterValue={table.filterValue}
        onFilterChange={table.setFilterValue}
        pageCount={table.pageCount}
        pageIndex={table.pageIndex}
        pageSize={table.pageSize}
        onPageIndexChange={table.setPageIndex}
        onPageSizeChange={table.setPageSize}
        isLoading={loading}
        skeletonRowCount={8}
        emptyMessage="No organizations yet."
        showColumnViewControl={false}
        onRowClick={(organization) => router.push(`/admin/organizations/${organization.id}`)}
        toolbarEndExtras={
          <div className="ml-auto">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New organization
            </Button>
          </div>
        }
        paginationPageSizes={[5, 10, 20, 50]}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              New organization
            </DialogTitle>
            <DialogDescription>
              A dummy admin account is created automatically and must change its password on first
              login.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="organization-name">Name</FieldLabel>
                <Input
                  id="organization-name"
                  required
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Acme Operations"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="organization-slug">Slug</FieldLabel>
                <Input
                  id="organization-slug"
                  required
                  value={slug || derivedSlug}
                  onChange={(event) => setSlug(slugify(event.target.value))}
                  placeholder="acme-operations"
                />
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
                <FieldLabel htmlFor="edit-organization-name">Name</FieldLabel>
                <Input
                  id="edit-organization-name"
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-organization-slug">Slug</FieldLabel>
                <Input
                  id="edit-organization-slug"
                  required
                  value={editSlug}
                  onChange={(event) => setEditSlug(slugify(event.target.value))}
                />
              </Field>
              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={editPending || !editingOrganization} type="submit">
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
            <AlertDialogTitle>Delete organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.name ?? "this organization"}, its managed users, and
              tenant data.
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
