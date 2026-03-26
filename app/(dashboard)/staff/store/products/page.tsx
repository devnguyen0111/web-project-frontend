"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StaffStoreNav } from "@/components/common/staff-store-nav";
import { listStoreCategories } from "@/lib/api/products";
import {
  archiveManagedProduct,
  approvePendingProduct,
  createManagedProduct,
  listManagedProducts,
  listPendingReviewProducts,
  rejectPendingProduct,
  submitManagedProductForReview,
  updateManagedProduct,
  uploadManagedProductFile,
} from "@/lib/api/store-management";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import type { Category, StoreProduct } from "@/lib/types";

type ProductType = "digital" | "custom_order";

function formatMoney(value: number, currency = "VND") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusVariant(status: string | undefined) {
  if (status === "active") {
    return "success" as const;
  }
  if (status === "pending_review") {
    return "warning" as const;
  }
  if (status === "rejected" || status === "archived") {
    return "danger" as const;
  }
  return "neutral" as const;
}

export default function StaffStoreProductsPage() {
  const searchParams = useSearchParams();
  const [managedProducts, setManagedProducts] = useState<StoreProduct[]>([]);
  const [pendingProducts, setPendingProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProductType>("digital");
  const [priceAmount, setPriceAmount] = useState("100000");
  const [currency, setCurrency] = useState("VND");
  const [stock, setStock] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [rejectReasonByProductId, setRejectReasonByProductId] = useState<Record<string, string>>({});
  const [fileByProductId, setFileByProductId] = useState<Record<string, File | null>>({});

  const editingProduct = useMemo(
    () => managedProducts.find((item) => item._id === editingId || item.id === editingId) ?? null,
    [editingId, managedProducts],
  );
  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category._id, category.name]));
  }, [categories]);

  async function loadData() {
    const [managed, pending, storeCategories] = await Promise.all([
      listManagedProducts(1, 30),
      listPendingReviewProducts(1, 30),
      listStoreCategories(),
    ]);
    setManagedProducts(managed.data);
    setPendingProducts(pending.data);
    setCategories(storeCategories);
    setCategoryId((current) => current || storeCategories[0]?._id || "");
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadData();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load products");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editingProduct) {
      return;
    }
    setName(editingProduct.name);
    setDescription(editingProduct.description ?? "");
    setType((editingProduct.type ?? "digital") as ProductType);
    setPriceAmount(String(editingProduct.priceAmount ?? 0));
    setCurrency(editingProduct.currency ?? "VND");
    setStock(String(editingProduct.stock ?? 0));
    setCategoryId(editingProduct.categoryId ?? "");
    setVipOnly(Boolean(editingProduct.vipOnly));
  }, [editingProduct]);

  useEffect(() => {
    const requestedType = searchParams.get("type");
    if (requestedType === "custom_order" || requestedType === "digital") {
      setType(requestedType);
    }
  }, [searchParams]);

  function resetForm() {
    setEditingId("");
    setName("");
    setDescription("");
    setType("digital");
    setPriceAmount("100000");
    setCurrency("VND");
    setStock("1");
    setCategoryId(categories[0]?._id ?? "");
    setVipOnly(false);
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        priceAmount: Number(priceAmount),
        currency: currency.trim().toUpperCase(),
        stock: Number(stock),
        categoryId: categoryId || undefined,
        vipOnly,
      };
      if (editingId) {
        await updateManagedProduct(editingId, payload);
        setMessage("Product updated.");
      } else {
        await createManagedProduct(payload);
        setMessage("Product created.");
      }
      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(productId: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await archiveManagedProduct(productId);
      await loadData();
      setMessage("Product archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive product");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview(productId: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await submitManagedProductForReview(productId);
      await loadData();
      setMessage("Product submitted for review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit product");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadAsset(productId: string) {
    const file = fileByProductId[productId];
    if (!file) {
      setError("Select file first.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await uploadManagedProductFile(productId, file);
      await loadData();
      setMessage("Product asset uploaded.");
      setFileByProductId((prev) => ({ ...prev, [productId]: null }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload asset");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(productId: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await approvePendingProduct(productId);
      await loadData();
      setMessage("Pending product approved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve product");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(productId: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await rejectPendingProduct(productId, {
        reason: rejectReasonByProductId[productId]?.trim() || undefined,
      });
      await loadData();
      setRejectReasonByProductId((prev) => ({ ...prev, [productId]: "" }));
      setMessage("Pending product rejected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Store Ops</Badge>
            <CardTitle>Product management</CardTitle>
            <CardDescription>
              Create, update, submit, and moderate store products in one workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffStoreNav />
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}
        {message ? (
          <Card className="border-[var(--success)] bg-[var(--success-soft)]">
            <CardContent className="p-4 text-sm text-[var(--success)]">{message}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Edit product" : "Create product"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={handleSaveProduct}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={4000}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Type</Label>
                    <Select id="type" value={type} onChange={(event) => setType(event.target.value as ProductType)}>
                      <option value="digital">digital</option>
                      <option value="custom_order">custom_order</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Currency</Label>
                    <Input id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="priceAmount">Price amount</Label>
                    <Input
                      id="priceAmount"
                      type="number"
                      min={1}
                      value={priceAmount}
                      onChange={(event) => setPriceAmount(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      min={0}
                      value={stock}
                      onChange={(event) => setStock(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="categoryId">Store category</Label>
                    <Select
                      id="categoryId"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={vipOnly}
                      onChange={(event) => setVipOnly(event.target.checked)}
                    />
                    VIP Only product
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" loading={saving}>
                    {editingId ? "Update product" : "Create product"}
                  </Button>
                  {editingId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending review queue</CardTitle>
              <CardDescription>Approve or reject products waiting for moderation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading queue...</p> : null}
              {!loading && pendingProducts.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No pending products.</p>
              ) : null}
              {pendingProducts.map((product) => (
                <div
                  key={product._id}
                  className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
                    <Badge variant={getStatusVariant(product.status)}>{product.status ?? "unknown"}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatMoney(product.priceAmount, product.currency)} | {product.type}
                  </p>
                  <Textarea
                    value={rejectReasonByProductId[product._id] ?? ""}
                    onChange={(event) =>
                      setRejectReasonByProductId((prev) => ({
                        ...prev,
                        [product._id]: event.target.value,
                      }))
                    }
                    maxLength={1000}
                    placeholder="Reject reason (optional)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void handleApprove(product._id)} loading={saving}>
                      Approve
                    </Button>
                    <Button variant="danger" onClick={() => void handleReject(product._id)} loading={saving}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Managed products</CardTitle>
            <CardDescription>All products available to your current role scope.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading products...</p> : null}
            {!loading && managedProducts.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No products yet.</p>
            ) : null}
            {managedProducts.map((product) => (
              <div
                key={product._id}
                className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{product.slug}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={getStatusVariant(product.status)}>{product.status ?? "draft"}</Badge>
                      <Badge variant="neutral">{product.type}</Badge>
                      <Badge variant="info">{formatMoney(product.priceAmount, product.currency)}</Badge>
                      <Badge variant="neutral">
                        {product.categoryId
                          ? categoryNameById.get(product.categoryId) ?? "Unknown category"
                          : "No category"}
                      </Badge>
                      {product.vipOnly ? <Badge variant="warning">VIP Only</Badge> : null}
                    </div>
                    {product.rejectionReason ? (
                      <p className="text-xs text-[var(--danger)]">Rejected: {product.rejectionReason}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setEditingId(product._id)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => void handleArchive(product._id)}
                      loading={saving}
                    >
                      Archive
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    type="file"
                    onChange={(event) =>
                      setFileByProductId((prev) => ({
                        ...prev,
                        [product._id]: event.target.files?.[0] ?? null,
                      }))
                    }
                  />
                  <Button
                    variant="secondary"
                    onClick={() => void handleUploadAsset(product._id)}
                    loading={saving}
                  >
                    Upload file
                  </Button>
                  <Button onClick={() => void handleSubmitForReview(product._id)} loading={saving}>
                    Submit review
                  </Button>
                </div>
                {product.digitalAsset ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Current asset: {product.digitalAsset.fileName}
                  </p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
