"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaginationControls } from "@/components/common/pagination-controls";
import { MotionDiv, MotionSection } from "@/components/motion";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  Select,
  Spinner,
} from "@/components/ui";
import {
  listUsers,
  updateUserByAdmin,
  updateUserRole,
  updateUserStatus,
} from "@/lib/api/users";
import type { AuthUser, Role } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useAdminUsersMotion } from "./hooks/use-admin-users-motion";

const PAGE_SIZE = 10;
const ASSIGNABLE_ROLES: Role[] = ["author", "staff", "admin"];

type UserActionType = "update-role" | "disable-user" | "edit-user";
type ModalStep = "details" | "action";

const ACTION_OPTIONS: Array<{ value: UserActionType; label: string }> = [
  { value: "update-role", label: "Up role / Change role" },
  { value: "disable-user", label: "Disable / Enable user" },
  { value: "edit-user", label: "Edit user" },
];

interface ActionFeedback {
  type: "success" | "error";
  message: string;
}

interface EditUserDraft {
  fullName: string;
  email: string;
  isEmailVerified: boolean;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function isUserActive(user: AuthUser) {
  return user.isActive !== false;
}

function getInitials(fullName: string) {
  const tokens = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "U";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

function AdminUsersContent() {
  const smoothEase = useAdminUsersMotion();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>("details");
  const [selectedAction, setSelectedAction] = useState<UserActionType>("update-role");
  const [selectedRole, setSelectedRole] = useState<Role>("author");
  const [targetActive, setTargetActive] = useState(true);
  const [avatarPreviewError, setAvatarPreviewError] = useState(false);
  const [editDraft, setEditDraft] = useState<EditUserDraft>({
    fullName: "",
    email: "",
    isEmailVerified: false,
  });

  const hasPendingUpdate = Boolean(updatingUserId);
  const actionUser = users.find((item) => item.id === actionUserId) ?? null;
  const isSelfTarget = Boolean(actionUser && currentUser?.id === actionUser.id);

  const roleChanged = Boolean(actionUser && selectedRole !== actionUser.role);
  const statusChanged = Boolean(actionUser && targetActive !== isUserActive(actionUser));

  const normalizedName = editDraft.fullName.trim();
  const normalizedEmail = editDraft.email.trim().toLowerCase();
  const editChanged = Boolean(
    actionUser &&
      (normalizedName !== actionUser.fullName.trim() ||
        normalizedEmail !== actionUser.email.toLowerCase() ||
        editDraft.isEmailVerified !== actionUser.isEmailVerified),
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      setActionFeedback(null);
      setActionUserId(null);

      try {
        const result = await listUsers(page, PAGE_SIZE);
        if (!active) {
          return;
        }

        setUsers(result.data);
        setPage(result.page);
        setPageInfo({
          total: result.total,
          totalPages: Math.max(1, result.totalPages),
        });
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load users");
        setUsers([]);
        setPageInfo({ total: 0, totalPages: 1 });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [page]);

  function openActionModal(user: AuthUser) {
    setActionFeedback(null);
    setActionUserId(user.id);
    setModalStep("details");
    setSelectedAction("update-role");
    setSelectedRole(user.role);
    setTargetActive(isUserActive(user));
    setAvatarPreviewError(false);
    setEditDraft({
      fullName: user.fullName,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    });
  }

  function closeActionModal() {
    if (hasPendingUpdate) {
      return;
    }
    setActionUserId(null);
  }

  function updateUserInList(updatedUser: AuthUser) {
    setUsers((prev) =>
      prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
    );
  }

  async function handleConfirmAction() {
    if (!actionUser || hasPendingUpdate) {
      return;
    }

    setUpdatingUserId(actionUser.id);
    setActionFeedback(null);

    try {
      if (selectedAction === "update-role") {
        if (isSelfTarget) {
          throw new Error("You cannot change your own role.");
        }

        if (!roleChanged) {
          throw new Error("Please select a different role before applying.");
        }

        const updatedUser = await updateUserRole(actionUser.id, {
          role: selectedRole,
        });

        updateUserInList(updatedUser);
        setActionFeedback({
          type: "success",
          message: `Role for ${updatedUser.fullName} updated to ${updatedUser.role}.`,
        });
      }

      if (selectedAction === "disable-user") {
        if (isSelfTarget && !targetActive) {
          throw new Error("You cannot disable your own account.");
        }

        if (!statusChanged) {
          throw new Error("Please choose a different account status.");
        }

        const updatedUser = await updateUserStatus(actionUser.id, {
          isActive: targetActive,
        });

        updateUserInList(updatedUser);
        setActionFeedback({
          type: "success",
          message: `${updatedUser.fullName} has been ${isUserActive(updatedUser) ? "enabled" : "disabled"}.`,
        });
      }

      if (selectedAction === "edit-user") {
        if (!editChanged) {
          throw new Error("Please update at least one field before saving.");
        }

        if (normalizedName.length < 2) {
          throw new Error("Full name must be at least 2 characters.");
        }

        if (!normalizedEmail) {
          throw new Error("Email is required.");
        }

        const payload: {
          fullName?: string;
          email?: string;
          isEmailVerified?: boolean;
        } = {};

        if (normalizedName !== actionUser.fullName.trim()) {
          payload.fullName = normalizedName;
        }

        if (normalizedEmail !== actionUser.email.toLowerCase()) {
          payload.email = normalizedEmail;
        }

        if (editDraft.isEmailVerified !== actionUser.isEmailVerified) {
          payload.isEmailVerified = editDraft.isEmailVerified;
        }

        const updatedUser = await updateUserByAdmin(actionUser.id, payload);

        updateUserInList(updatedUser);
        setActionFeedback({
          type: "success",
          message: `Profile for ${updatedUser.fullName} updated successfully.`,
        });
      }

      setActionUserId(null);
    } catch (err) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to execute user action",
      });
    } finally {
      setUpdatingUserId(null);
    }
  }

  const confirmDisabled =
    hasPendingUpdate ||
    !actionUser ||
    (selectedAction === "update-role" && (isSelfTarget || !roleChanged)) ||
    (selectedAction === "disable-user" && (!statusChanged || (isSelfTarget && !targetActive))) ||
    (selectedAction === "edit-user" && !editChanged);

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <Badge className="w-fit">Admin</Badge>
              <CardTitle>User management</CardTitle>
              <CardDescription>
                Review users and manage role, account status, and profile updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-0">
              <Link
                href="/admin"
                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to admin center
              </Link>
            </CardContent>
          </Card>
        </MotionDiv>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading users" />
          </div>
        ) : null}

        {error ? (
          <MotionDiv
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: smoothEase }}
          >
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
            </Card>
          </MotionDiv>
        ) : null}

        {actionFeedback ? (
          <MotionDiv
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: smoothEase }}
          >
            <Card
              className={
                actionFeedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50/80"
                  : "border-rose-200 bg-rose-50/80"
              }
            >
              <CardContent
                className={
                  actionFeedback.type === "success"
                    ? "p-4 text-sm text-emerald-700"
                    : "p-4 text-sm text-rose-700"
                }
              >
                {actionFeedback.message}
              </CardContent>
            </Card>
          </MotionDiv>
        ) : null}

        {!error ? (
          <PaginationControls
            page={page}
            totalPages={pageInfo.totalPages}
            totalItems={pageInfo.total}
            itemLabel="users"
            onPageChange={setPage}
            disabled={loading}
          />
        ) : null}

        {!loading && users.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-500">No users found.</CardContent>
          </Card>
        ) : null}

        {users.length > 0 ? (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Full name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Verified</th>
                    <th className="px-4 py-3 font-semibold">Account</th>
                    <th className="px-4 py-3 font-semibold">Created at</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const active = isUserActive(user);
                    const isUpdating = updatingUserId === user.id;

                    return (
                      <tr key={user.id} className="bg-white text-slate-700">
                        <td className="px-4 py-3 font-semibold text-slate-900">{user.fullName}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">
                          <Badge>{user.role}</Badge>
                        </td>
                        <td className="px-4 py-3">{user.isEmailVerified ? "Verified" : "Pending"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={active ? "accent" : "destructive"}>
                            {active ? "active" : "disabled"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(user.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading || hasPendingUpdate}
                            onClick={() => openActionModal(user)}
                          >
                            {isUpdating ? "Updating..." : "Choose action"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}
      </MotionSection>

      {actionUser ? (
        <Modal
          open={Boolean(actionUser)}
          onOpenChange={(open) => {
            if (!open) {
              closeActionModal();
            }
          }}
          title={`Manage ${actionUser.fullName}`}
          description={
            modalStep === "details"
              ? "Review full user information before proceeding to actions."
              : `Choose an action for ${actionUser.email} and apply it.`
          }
          footer={
            <>
              <Button variant="secondary" onClick={closeActionModal} disabled={hasPendingUpdate}>
                Cancel
              </Button>
              {modalStep === "details" ? (
                <Button onClick={() => setModalStep("action")} disabled={hasPendingUpdate}>
                  Continue To Actions
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setModalStep("details")}
                    disabled={hasPendingUpdate}
                  >
                    Back To Details
                  </Button>
                  <Button onClick={() => void handleConfirmAction()} disabled={confirmDisabled}>
                    {updatingUserId === actionUser.id ? "Processing..." : "Apply action"}
                  </Button>
                </>
              )}
            </>
          }
          className="max-w-xl"
        >
          <div className="space-y-4">
            <Badge className="w-fit">User action</Badge>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  User Information
                </p>
                <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">ID</p>
                    <p className="break-all font-medium text-slate-900">{actionUser.id}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Full name</p>
                    <p className="font-medium text-slate-900">{actionUser.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Email</p>
                    <p className="break-all font-medium text-slate-900">{actionUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Role</p>
                    <p className="font-medium text-slate-900">{actionUser.role}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Verified</p>
                    <p className="font-medium text-slate-900">
                      {actionUser.isEmailVerified ? "verified" : "pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Account status</p>
                    <p className="font-medium text-slate-900">
                      {isUserActive(actionUser) ? "active" : "disabled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Created at</p>
                    <p className="font-medium text-slate-900">{formatDateTime(actionUser.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Updated at</p>
                    <p className="font-medium text-slate-900">{formatDateTime(actionUser.updatedAt)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Avatar</p>
                    <div className="mt-2 flex items-center gap-3">
                      {actionUser.avatarUrl && !avatarPreviewError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={actionUser.avatarUrl}
                          alt={`Avatar of ${actionUser.fullName}`}
                          className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                          onError={() => setAvatarPreviewError(true)}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600">
                          {getInitials(actionUser.fullName)}
                        </div>
                      )}
                      <p className="text-xs text-slate-500">
                        {actionUser.avatarUrl
                          ? "Preview from avatar URL."
                          : "No avatar uploaded, showing initials fallback."}
                      </p>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.06em] text-slate-500">Avatar URL</p>
                    <p className="break-all font-medium text-slate-900">{actionUser.avatarUrl ?? "-"}</p>
                  </div>
                </div>
              </div>

              {modalStep === "action" ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Action</p>
                    <Select
                      value={selectedAction}
                      onChange={(event) => setSelectedAction(event.target.value as UserActionType)}
                      disabled={hasPendingUpdate}
                      aria-label="Select action"
                    >
                      {ACTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {selectedAction === "update-role" ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Target role</p>
                      <Select
                        value={selectedRole}
                        onChange={(event) => setSelectedRole(event.target.value as Role)}
                        disabled={hasPendingUpdate}
                        aria-label={`Select role for ${actionUser.fullName}`}
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </Select>
                      {isSelfTarget ? (
                        <p className="text-xs text-rose-600">You cannot change your own role.</p>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedAction === "disable-user" ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Target account status</p>
                      <Select
                        value={targetActive ? "active" : "disabled"}
                        onChange={(event) => setTargetActive(event.target.value === "active")}
                        disabled={hasPendingUpdate}
                        aria-label={`Select account status for ${actionUser.fullName}`}
                      >
                        <option value="active">active</option>
                        <option value="disabled">disabled</option>
                      </Select>
                      {isSelfTarget && !targetActive ? (
                        <p className="text-xs text-rose-600">You cannot disable your own account.</p>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedAction === "edit-user" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Full name</p>
                        <Input
                          value={editDraft.fullName}
                          onChange={(event) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              fullName: event.target.value,
                            }))
                          }
                          disabled={hasPendingUpdate}
                          placeholder="Enter full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Email</p>
                        <Input
                          value={editDraft.email}
                          onChange={(event) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              email: event.target.value,
                            }))
                          }
                          disabled={hasPendingUpdate}
                          type="email"
                          placeholder="Enter email"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Verification state</p>
                        <Select
                          value={editDraft.isEmailVerified ? "verified" : "pending"}
                          onChange={(event) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              isEmailVerified: event.target.value === "verified",
                            }))
                          }
                          disabled={hasPendingUpdate}
                        >
                          <option value="verified">verified</option>
                          <option value="pending">pending</option>
                        </Select>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

export function AdminUsersSection() {
  return <AdminUsersContent />;
}

