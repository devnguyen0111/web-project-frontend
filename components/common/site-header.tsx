"use client";

import { m, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  Coins,
  Menu,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, buttonVariants } from "@/components/ui";
import {
  getMyNotificationUnreadCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { getAccessToken } from "@/lib/api/token-store";
import { getMyWalletSummary } from "@/lib/api/wallet";
import { formatWalletCoinBalance, getWalletCoinBalance } from "@/lib/format/coin";
import {
  getHeaderNavModel,
  getRoleBadgeVariant,
  getRoleDashboardHref,
} from "@/lib/rbac";
import { connectNotificationsSocket } from "@/lib/realtime/notifications-socket";
import type { AuthUser, NotificationItem, WalletSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function getInitials(name?: string) {
  if (!name?.trim()) return "U";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeHrefPath(href: string) {
  return href.split("?")[0].split("#")[0];
}

function isPathActive(pathname: string, href: string) {
  const normalized = normalizeHrefPath(href);
  if (normalized === "/") return pathname === "/";
  return pathname === normalized || pathname.startsWith(`${normalized}/`);
}

function resolveNotificationId(item: NotificationItem) {
  return item.id ?? item._id ?? "";
}

function roleDashboardLabel(user?: AuthUser | null) {
  if (!user) return "Dashboard";
  if (user.role === "admin") return "Admin Center";
  if (user.role === "staff") return "Staff Workspace";
  return "Dashboard";
}

function MobileSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 h-full w-[min(90vw,24rem)] border-l border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
          <button
            type="button"
            aria-label="Close panel"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-9 w-9 min-h-9",
            )}
            onClick={onClose}
          >
            <X className="h-5 w-5 stroke-[2]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function HeaderNotificationsPanel({
  loading,
  error,
  items,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onOpenAll,
}: {
  loading: boolean;
  error: string;
  items: NotificationItem[];
  unreadCount: number;
  onMarkRead: (notificationId: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onOpenAll: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Notification Center</p>
          <p className="text-xs text-[var(--text-muted)]">{unreadCount} unread</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void onMarkAllRead()}
          disabled={unreadCount === 0}
          className="h-9 min-h-9 px-2.5 text-xs"
        >
          Mark all read
        </Button>
      </div>

      {loading ? <p className="text-sm text-[var(--text-muted)]">Loading notifications...</p> : null}
      {error ? (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
          {error}
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-3 py-5 text-center text-sm text-[var(--text-secondary)]">
          No new notifications.
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="flex max-h-[22rem] flex-col gap-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const id = resolveNotificationId(item);
            const unread = !item.readAt;

            return (
              <div
                key={id}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  unread
                    ? "border-[var(--info)] bg-[var(--info-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)]",
                )}
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                  {item.message}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {unread ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--primary)] transition-colors duration-150 hover:text-[var(--primary-hover)]"
                      onClick={() => void onMarkRead(id)}
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--success)]">Read</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Link
        href="/notifications"
        onClick={onOpenAll}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mt-1 h-9 min-h-9 w-full justify-center text-xs font-semibold",
        )}
      >
        View all notifications
      </Link>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { user, logout, initializing } = useAuth();
  const navModel = useMemo(() => getHeaderNavModel(user?.role), [user?.role]);
  const roleBadge = useMemo(() => getRoleBadgeVariant(user?.role), [user?.role]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isDesktopBlogMenuOpen, setIsDesktopBlogMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileNotificationOpen, setIsMobileNotificationOpen] = useState(false);

  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const blogMenuRef = useRef<HTMLDivElement | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

  const desktopItems = navModel.desktopItems;
  const createActions = navModel.createActions;
  const dashboardHref = getRoleDashboardHref(user?.role);
  const logoHref = user ? dashboardHref : "/";
  const walletBalance = getWalletCoinBalance(walletSummary);
  const walletTone =
    walletBalance > 10000 ? "text-[var(--success)]" : "text-[var(--text-secondary)]";
  const showAuthenticatedActions = Boolean(user);
  const hoverMotion = shouldReduceMotion ? undefined : { y: -1 };
  const tapMotion = shouldReduceMotion ? undefined : { scale: 0.98 };

  const closeDesktopMenus = useCallback(() => {
    setIsDesktopBlogMenuOpen(false);
    setIsCreateMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsNotificationPopoverOpen(false);
  }, []);

  const refreshWalletSummary = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const summary = await getMyWalletSummary();
      setWalletSummary(summary);
    } catch {
      setWalletSummary(null);
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const [listResult, unreadResult] = await Promise.all([
        listMyNotifications({ page: 1, limit: 8 }),
        getMyNotificationUnreadCount(),
      ]);
      setNotifications(listResult.data);
      setUnreadCount(unreadResult.unreadCount);
    } catch (error) {
      setNotificationsError(
        error instanceof Error ? error.message : "Unable to load notifications",
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 4);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setWalletSummary(null);
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsError("");
      return;
    }

    void refreshWalletSummary();
    void refreshNotifications();
  }, [refreshNotifications, refreshWalletSummary, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      try {
        cleanup = await connectNotificationsSocket({
          getToken: () => getAccessToken(),
          onReady: (payload) => {
            if (!disposed) {
              setUnreadCount(payload.unreadCount);
            }
          },
          onUnreadCount: (payload) => {
            if (!disposed) {
              setUnreadCount(payload.unreadCount);
            }
          },
          onNew: (payload) => {
            if (disposed) {
              return;
            }

            const normalized = {
              ...payload.notification,
              id: payload.notification.id ?? payload.notification._id,
              _id: payload.notification._id ?? payload.notification.id ?? "",
            };

            setNotifications((prev) => {
              const key = resolveNotificationId(normalized);
              if (prev.some((item) => resolveNotificationId(item) === key)) {
                return prev;
              }
              return [normalized, ...prev.slice(0, 7)];
            });
            setUnreadCount((prev) => prev + 1);
          },
          onRead: (payload) => {
            if (disposed) {
              return;
            }
            setNotifications((prev) =>
              prev.map((item) =>
                resolveNotificationId(item) === payload.id
                  ? { ...item, readAt: payload.readAt }
                  : item,
              ),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
          },
          onReadAll: (payload) => {
            if (disposed) {
              return;
            }
            setNotifications((prev) =>
              prev.map((item) =>
                item.readAt ? item : { ...item, readAt: payload.readAt },
              ),
            );
            setUnreadCount(0);
          },
          onError: (payload) => {
            if (!disposed) {
              setNotificationsError(payload.message || "Realtime failed");
            }
          },
        });
      } catch {
        if (!disposed) {
          setNotificationsError("Unable to connect to realtime notifications");
        }
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [user]);

  useEffect(() => {
    closeDesktopMenus();
    setIsMobileMenuOpen(false);
    setIsMobileNotificationOpen(false);
  }, [closeDesktopMenus, pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        isDesktopBlogMenuOpen &&
        blogMenuRef.current &&
        !blogMenuRef.current.contains(target)
      ) {
        setIsDesktopBlogMenuOpen(false);
      }

      if (
        isCreateMenuOpen &&
        createMenuRef.current &&
        !createMenuRef.current.contains(target)
      ) {
        setIsCreateMenuOpen(false);
      }

      if (
        isUserMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }

      if (
        isNotificationPopoverOpen &&
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(target)
      ) {
        setIsNotificationPopoverOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [
    isCreateMenuOpen,
    isDesktopBlogMenuOpen,
    isNotificationPopoverOpen,
    isUserMenuOpen,
  ]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDesktopMenus();
      }
    }

    document.addEventListener("keydown", handleKeyboard);
    return () => {
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, [closeDesktopMenus]);

  useEffect(() => {
    if (!isMobileMenuOpen && !isMobileNotificationOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen, isMobileNotificationOpen]);

  const desktopBlogItem = desktopItems.find((item) => item.children?.length);
  const desktopPrimaryItems = desktopItems.filter((item) => !item.children?.length);
  const isDesktopBlogActive = Boolean(
    desktopBlogItem?.children?.some((child) => isPathActive(pathname, child.href)),
  );
  const isNotificationActive = isPathActive(pathname, "/notifications");

  const mobileMenuItems = useMemo(() => {
    const entries: Array<{ label: string; href: string; description?: string }> = [];

    desktopItems.forEach((item) => {
      if (item.children?.length) {
        item.children.forEach((child) => {
          entries.push({
            label: `${item.label} - ${child.label}`,
            href: child.href,
            description: child.description,
          });
        });
      } else if (item.href) {
        entries.push({ label: item.label, href: item.href });
      }
    });

    return entries;
  }, [desktopItems]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      closeDesktopMenus();
      setIsMobileMenuOpen(false);
      router.push("/");
    }
  }

  async function handleMarkNotificationRead(notificationId: string) {
    const timestamp = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((item) =>
        resolveNotificationId(item) === notificationId && !item.readAt
          ? { ...item, readAt: timestamp }
          : item,
      ),
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));

    try {
      await markNotificationRead(notificationId);
    } catch {
      await refreshNotifications();
    }
  }

  async function handleMarkAllNotificationsRead() {
    const timestamp = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((item) => (item.readAt ? item : { ...item, readAt: timestamp })),
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      await refreshNotifications();
    }
  }


  return (
    <>
      <m.header
        className={cn(
          "sticky top-0 z-50 w-full border-b border-[var(--border)] bg-background/95 backdrop-blur-md transition-shadow duration-200",
          isScrolled ? "shadow-sm" : "",
        )}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0.12 : 0.22,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="section-shell flex h-[60px] items-center justify-between gap-3 md:h-[68px] md:gap-4">
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <Link href={logoHref} className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)] text-sm font-bold text-white">
                WP
              </span>
              <span
                className="hidden text-[26px] font-bold leading-none text-[var(--primary)] sm:inline"
                style={{
                  fontFamily:
                    "var(--font-manrope), var(--font-inter), Inter, sans-serif",
                }}
              >
                Vua Project
              </span>
              <span
                className="text-xl font-bold leading-none text-[var(--primary)] sm:hidden"
                style={{
                  fontFamily:
                    "var(--font-manrope), var(--font-inter), Inter, sans-serif",
                }}
              >
                VP
              </span>
            </Link>

            <nav className="hidden items-center gap-1 text-sm font-medium text-[var(--text-secondary)] md:flex">
              {desktopBlogItem ? (
                <div className="relative" ref={blogMenuRef}>
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-10 min-h-10 rounded-md px-3 text-sm font-medium",
                      isDesktopBlogActive
                        ? "bg-[var(--surface-muted)] text-[var(--text-primary)]"
                        : "",
                    )}
                    onClick={() => setIsDesktopBlogMenuOpen((prev) => !prev)}
                  >
                    {desktopBlogItem.label}
                    <ChevronDown className="h-5 w-5 stroke-[2]" />
                  </button>

                  {isDesktopBlogMenuOpen ? (
                    <div className="absolute left-0 top-[calc(100%+0.4rem)] z-[60] w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-sm">
                      {desktopBlogItem.children?.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsDesktopBlogMenuOpen(false)}
                          className={cn(
                            "block rounded-md px-3 py-2 transition-colors duration-150 hover:bg-[var(--surface-muted)]",
                            isPathActive(pathname, item.href)
                              ? "bg-[var(--surface-muted)]"
                              : "",
                          )}
                        >
                          <span className="block text-sm font-semibold text-[var(--text-primary)]">
                            {item.label}
                          </span>
                          {item.description ? (
                            <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                              {item.description}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {desktopPrimaryItems.map((item) => {
                if (!item.href) {
                  return null;
                }

                const active = isPathActive(pathname, item.href);
                return (
                  <m.div key={item.href} whileHover={hoverMotion} whileTap={tapMotion}>
                    <Link
                      href={item.href}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "h-10 min-h-10 rounded-md px-3 text-sm font-medium",
                        active
                          ? "bg-[var(--surface-muted)] text-[var(--text-primary)]"
                          : "",
                      )}
                    >
                      {item.label}
                    </Link>
                  </m.div>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {initializing ? (
              <span className="hidden text-xs text-[var(--text-muted)] md:inline">
                Loading...
              </span>
            ) : showAuthenticatedActions ? (
              <>
                <div className="relative hidden md:block" ref={notificationMenuRef}>
                  <button
                    type="button"
                    aria-label="Notifications"
                    onClick={() => {
                      setIsNotificationPopoverOpen((prev) => !prev);
                      if (!isNotificationPopoverOpen) {
                        void refreshNotifications();
                      }
                    }}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "relative h-10 w-10 min-h-10 rounded-md",
                      isNotificationActive
                        ? "bg-[var(--surface-muted)] text-[var(--text-primary)]"
                        : "",
                    )}
                  >
                    <Bell className="h-5 w-5 stroke-[2]" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </button>

                  {isNotificationPopoverOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[60] w-[min(92vw,24rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
                      <HeaderNotificationsPanel
                        loading={notificationsLoading}
                        error={notificationsError}
                        items={notifications}
                        unreadCount={unreadCount}
                        onMarkRead={handleMarkNotificationRead}
                        onMarkAllRead={handleMarkAllNotificationsRead}
                        onOpenAll={() => setIsNotificationPopoverOpen(false)}
                      />
                    </div>
                  ) : null}
                </div>

                <Link
                  href="/dashboard/wallet"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "hidden h-10 min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold md:inline-flex",
                    walletTone,
                  )}
                >
                  <Coins className="h-5 w-5 stroke-[2]" />
                  {formatWalletCoinBalance(walletSummary)} coin
                </Link>

                {createActions.length > 0 ? (
                  <div className="relative hidden md:block" ref={createMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsCreateMenuOpen((prev) => !prev)}
                      className={cn(
                        buttonVariants({ variant: "primary", size: "sm" }),
                        "h-10 min-h-10 rounded-md px-3 text-sm font-semibold",
                      )}
                    >
                      <Plus className="h-5 w-5 stroke-[2]" />
                      Create New
                      <ChevronDown className="h-5 w-5 stroke-[2]" />
                    </button>
                    {isCreateMenuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[60] w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-sm">
                        {createActions.map((action) => (
                          <Link
                            key={action.href}
                            href={action.href}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              "h-10 min-h-10 w-full justify-start rounded-md px-2 text-sm font-medium",
                            )}
                            onClick={() => setIsCreateMenuOpen(false)}
                          >
                            {action.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button
                    type="button"
                    aria-label="Open account menu"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-10 min-h-10 gap-2 rounded-md px-2",
                    )}
                  >
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user?.avatarUrl}
                        alt={user?.fullName || "User"}
                        className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-primary)]">
                        {getInitials(user?.fullName)}
                      </span>
                    )}
                    <span className="hidden max-w-28 truncate text-sm font-semibold text-[var(--text-primary)] lg:block">
                      {user?.fullName}
                    </span>
                    <ChevronDown className="h-5 w-5 stroke-[2]" />
                  </button>

                  {isUserMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[60] w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm">
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {user?.fullName}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {user?.email}
                        </p>
                        <Badge className={cn("mt-2", roleBadge.className)}>
                          {roleBadge.label}
                        </Badge>
                      </div>

                      <div className="mt-2 space-y-1">
                        <Link
                          href="/dashboard/profile"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-9 min-h-9 w-full justify-start rounded-md px-2 text-sm font-medium",
                          )}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          href={dashboardHref}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-9 min-h-9 w-full justify-start rounded-md px-2 text-sm font-medium",
                          )}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          {roleDashboardLabel(user)}
                        </Link>
                        <Link
                          href="/tickets"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-9 min-h-9 w-full justify-start rounded-md px-2 text-sm font-medium",
                          )}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Tickets
                        </Link>
                        <Link
                          href="/settings/subscription"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-9 min-h-9 w-full justify-start rounded-md px-2 text-sm font-medium",
                          )}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Subscription & Perks
                        </Link>
                        <Link
                          href="/dashboard/wallet"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-9 min-h-9 w-full justify-start rounded-md px-2 text-sm font-medium",
                          )}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Wallet
                        </Link>
                        <Link
                          href="/settings/security"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-9 min-h-9 w-full justify-start rounded-md px-2 text-sm font-medium",
                          )}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Settings
                        </Link>
                      </div>

                      <div className="mt-2 border-t border-[var(--border)] pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-9 min-h-9 w-full justify-center"
                          onClick={() => void handleLogout()}
                        >
                          Logout
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                >
                  Register
                </Link>
              </div>
            )}

            <div className="flex items-center gap-1 md:hidden">
              {showAuthenticatedActions ? (
                <>
                  <button
                    type="button"
                    aria-label="Open notifications"
                    onClick={() => {
                      setIsMobileNotificationOpen(true);
                      void refreshNotifications();
                    }}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "relative h-9 w-9 min-h-9",
                    )}
                  >
                    <Bell className="h-5 w-5 stroke-[2]" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-label="Open account menu"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "h-9 w-9 min-h-9",
                    )}
                  >
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user?.avatarUrl}
                        alt={user?.fullName || "User"}
                        className="h-7 w-7 rounded-full border border-[var(--border)] object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-primary)]">
                        {getInitials(user?.fullName)}
                      </span>
                    )}
                  </button>
                </>
              ) : null}

              <button
                type="button"
                aria-label="Open menu"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "h-9 w-9 min-h-9",
                )}
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5 stroke-[2]" />
              </button>
            </div>
          </div>
        </div>
      </m.header>


      <MobileSheet
        open={isMobileMenuOpen}
        title="Menu"
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className="space-y-5">
          <div className="space-y-1">
            {mobileMenuItems.map((item) => (
              <Link
                key={`${item.label}:${item.href}`}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10 min-h-10 w-full justify-start rounded-md px-2 text-left text-sm font-medium",
                  isPathActive(pathname, item.href)
                    ? "bg-[var(--surface-muted)] text-[var(--text-primary)]"
                    : "",
                )}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>

          {showAuthenticatedActions && createActions.length > 0 ? (
            <div className="space-y-2 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Create New
              </p>
              {createActions.map((action) => (
                <Link
                  key={`mobile:${action.href}`}
                  href={action.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "h-10 min-h-10 w-full justify-start rounded-md px-3 text-sm font-medium",
                  )}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}

          {showAuthenticatedActions ? (
            <div className="space-y-2 border-t border-[var(--border)] pt-4">
              <div className="mb-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {user?.fullName}
                </p>
                <Badge className={cn("mt-1", roleBadge.className)}>
                  {roleBadge.label}
                </Badge>
              </div>
              <Link
                href="/dashboard/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10 min-h-10 w-full justify-start rounded-md px-2 text-sm font-medium",
                )}
              >
                Profile
              </Link>
              <Link
                href={dashboardHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10 min-h-10 w-full justify-start rounded-md px-2 text-sm font-medium",
                )}
              >
                {roleDashboardLabel(user)}
              </Link>
              <Link
                href="/tickets"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10 min-h-10 w-full justify-start rounded-md px-2 text-sm font-medium",
                )}
              >
                Tickets
              </Link>
              <Link
                href="/settings/subscription"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10 min-h-10 w-full justify-start rounded-md px-2 text-sm font-medium",
                )}
              >
                Subscription & Perks
              </Link>
              <Link
                href="/dashboard/wallet"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10 min-h-10 w-full justify-start rounded-md px-2 text-sm font-semibold",
                )}
              >
                <Wallet className="h-5 w-5 stroke-[2]" />
                {formatWalletCoinBalance(walletSummary)} coin
              </Link>
              <Link
                href="/settings/security"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10 min-h-10 w-full justify-start rounded-md px-2 text-sm font-medium",
                )}
              >
                Settings
              </Link>
              <Button
                variant="secondary"
                size="sm"
                className="h-10 min-h-10 w-full rounded-md"
                onClick={() => void handleLogout()}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </MobileSheet>

      <MobileSheet
        open={isMobileNotificationOpen}
        title="Notifications"
        onClose={() => setIsMobileNotificationOpen(false)}
      >
        <HeaderNotificationsPanel
          loading={notificationsLoading}
          error={notificationsError}
          items={notifications}
          unreadCount={unreadCount}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onOpenAll={() => setIsMobileNotificationOpen(false)}
        />
      </MobileSheet>
    </>
  );
}

