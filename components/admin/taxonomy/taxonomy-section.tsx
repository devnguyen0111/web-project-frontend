"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, Spinner } from "@/components/ui";
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  listAllCategoriesAdmin,
  listAllTagsAdmin,
  updateCategory,
  updateTag,
} from "@/lib/api/blog";
import type { Category, CategoryScope, Tag } from "@/lib/types";
import { useTaxonomyMotion } from "./hooks/use-taxonomy-motion";

const CATEGORY_SCOPES: CategoryScope[] = ["blog", "store", "wiki", "all"];

type CategoryForm = {
  name: string;
  description: string;
  scope: CategoryScope;
  order: string;
  color: string;
  isActive: "true" | "false";
};

type TagForm = {
  name: string;
  description: string;
  isApproved: "true" | "false";
};

function normalizeCategoryPayload(form: CategoryForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    scope: form.scope,
    order: form.order ? Number(form.order) : 0,
    color: form.color.trim() || undefined,
    isActive: form.isActive === "true",
  };
}

function normalizeTagPayload(form: TagForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    isApproved: form.isApproved === "true",
  };
}

function toCategoryForm(item?: Category): CategoryForm {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    scope: item?.scope ?? "blog",
    order: typeof item?.order === "number" ? String(item.order) : "0",
    color: item?.color ?? "",
    isActive: item?.isActive === false ? "false" : "true",
  };
}

function toTagForm(item?: Tag): TagForm {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    isApproved: item?.isApproved === false ? "false" : "true",
  };
}

function TaxonomyContent() {
  const smoothEase = useTaxonomyMotion();
  const pathname = usePathname();
  const isStaffView = pathname.startsWith("/staff");
  const backHref = isStaffView ? "/staff" : "/admin";
  const backLabel = isStaffView ? "Back to staff workspace" : "Back to admin center";
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categoryCreateForm, setCategoryCreateForm] = useState<CategoryForm>(
    toCategoryForm(),
  );
  const [tagCreateForm, setTagCreateForm] = useState<TagForm>(toTagForm());
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    form: CategoryForm;
  } | null>(null);
  const [editingTag, setEditingTag] = useState<{
    id: string;
    form: TagForm;
  } | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingTag, setSavingTag] = useState(false);

  const categoryNameExists = useMemo(
    () =>
      new Set(categories.map((item) => item.name.trim().toLowerCase())),
    [categories],
  );
  const tagNameExists = useMemo(
    () => new Set(tags.map((item) => item.name.trim().toLowerCase())),
    [tags],
  );

  const loadTaxonomy = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryItems, tagItems] = await Promise.all([
        listAllCategoriesAdmin(),
        listAllTagsAdmin(),
      ]);

      setCategories(categoryItems);
      setTags(tagItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load taxonomy data");
      setCategories([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTaxonomy();
  }, [loadTaxonomy]);

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const payload = normalizeCategoryPayload(categoryCreateForm);
    if (!payload.name) {
      setError("Category name is required");
      return;
    }

    if (categoryNameExists.has(payload.name.toLowerCase())) {
      setError("Category name already exists");
      return;
    }

    setSavingCategory(true);
    try {
      await createCategory(payload);
      setCategoryCreateForm(toCategoryForm());
      await loadTaxonomy();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSaveCategoryEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCategory) {
      return;
    }

    setError("");
    const payload = normalizeCategoryPayload(editingCategory.form);
    if (!payload.name) {
      setError("Category name is required");
      return;
    }

    setSavingCategory(true);
    try {
      await updateCategory(editingCategory.id, payload);
      setEditingCategory(null);
      await loadTaxonomy();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!window.confirm("Delete this category?")) {
      return;
    }

    setError("");
    setSavingCategory(true);
    try {
      await deleteCategory(categoryId);
      if (editingCategory?.id === categoryId) {
        setEditingCategory(null);
      }
      await loadTaxonomy();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const payload = normalizeTagPayload(tagCreateForm);
    if (!payload.name) {
      setError("Tag name is required");
      return;
    }

    if (tagNameExists.has(payload.name.toLowerCase())) {
      setError("Tag name already exists");
      return;
    }

    setSavingTag(true);
    try {
      await createTag(payload);
      setTagCreateForm(toTagForm());
      await loadTaxonomy();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setSavingTag(false);
    }
  }

  async function handleSaveTagEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTag) {
      return;
    }

    setError("");
    const payload = normalizeTagPayload(editingTag.form);
    if (!payload.name) {
      setError("Tag name is required");
      return;
    }

    setSavingTag(true);
    try {
      await updateTag(editingTag.id, payload);
      setEditingTag(null);
      await loadTaxonomy();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tag");
    } finally {
      setSavingTag(false);
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!window.confirm("Delete this tag?")) {
      return;
    }

    setError("");
    setSavingTag(true);
    try {
      await deleteTag(tagId);
      if (editingTag?.id === tagId) {
        setEditingTag(null);
      }
      await loadTaxonomy();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag");
    } finally {
      setSavingTag(false);
    }
  }

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <Badge className="w-fit">Taxonomy</Badge>
              <CardTitle>Category & tag management</CardTitle>
              <CardDescription>
                CRUD for categories and tags (staff/admin).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href={backHref}
                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {backLabel}
              </Link>
            </CardContent>
          </Card>
        </MotionDiv>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading taxonomy" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Create, update, and delete categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreateCategory}>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="new-category-name">Name</Label>
                  <Input
                    id="new-category-name"
                    value={categoryCreateForm.name}
                    onChange={(event) =>
                      setCategoryCreateForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Backend"
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="new-category-description">Description</Label>
                  <Input
                    id="new-category-description"
                    value={categoryCreateForm.description}
                    onChange={(event) =>
                      setCategoryCreateForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Category description"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-category-scope">Scope</Label>
                  <Select
                    id="new-category-scope"
                    value={categoryCreateForm.scope}
                    onChange={(event) =>
                      setCategoryCreateForm((prev) => ({
                        ...prev,
                        scope: event.target.value as CategoryScope,
                      }))
                    }
                  >
                    {CATEGORY_SCOPES.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-category-order">Order</Label>
                  <Input
                    id="new-category-order"
                    type="number"
                    min={0}
                    value={categoryCreateForm.order}
                    onChange={(event) =>
                      setCategoryCreateForm((prev) => ({
                        ...prev,
                        order: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-category-color">Color</Label>
                  <Input
                    id="new-category-color"
                    value={categoryCreateForm.color}
                    onChange={(event) =>
                      setCategoryCreateForm((prev) => ({
                        ...prev,
                        color: event.target.value,
                      }))
                    }
                    placeholder="#0ea5e9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-category-active">Active</Label>
                  <Select
                    id="new-category-active"
                    value={categoryCreateForm.isActive}
                    onChange={(event) =>
                      setCategoryCreateForm((prev) => ({
                        ...prev,
                        isActive: event.target.value as "true" | "false",
                      }))
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={savingCategory}>
                    {savingCategory ? "Creating..." : "Create category"}
                  </Button>
                </div>
              </form>

              <div className="space-y-3">
                {categories.map((item) => (
                  <div key={item._id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.slug} - scope: {item.scope} - order: {item.order}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{item.isActive ? "active" : "inactive"}</Badge>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            setEditingCategory({
                              id: item._id,
                              form: toCategoryForm(item),
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          onClick={() => handleDeleteCategory(item._id)}
                          disabled={savingCategory}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-500">No categories.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Create, update, and delete tags.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreateTag}>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="new-tag-name">Name</Label>
                  <Input
                    id="new-tag-name"
                    value={tagCreateForm.name}
                    onChange={(event) =>
                      setTagCreateForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="nestjs"
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="new-tag-description">Description</Label>
                  <Input
                    id="new-tag-description"
                    value={tagCreateForm.description}
                    onChange={(event) =>
                      setTagCreateForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Tag description"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-tag-approved">Approved</Label>
                  <Select
                    id="new-tag-approved"
                    value={tagCreateForm.isApproved}
                    onChange={(event) =>
                      setTagCreateForm((prev) => ({
                        ...prev,
                        isApproved: event.target.value as "true" | "false",
                      }))
                    }
                  >
                    <option value="true">Approved</option>
                    <option value="false">Pending</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={savingTag}>
                    {savingTag ? "Creating..." : "Create tag"}
                  </Button>
                </div>
              </form>

              <div className="space-y-3">
                {tags.map((item) => (
                  <div key={item._id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.slug} - usage: {item.usageCount}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{item.isApproved ? "approved" : "pending"}</Badge>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            setEditingTag({
                              id: item._id,
                              form: toTagForm(item),
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          onClick={() => handleDeleteTag(item._id)}
                          disabled={savingTag}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {tags.length === 0 ? (
                  <p className="text-sm text-slate-500">No tags.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {editingCategory ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit category</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSaveCategoryEdit}>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-category-name">Name</Label>
                  <Input
                    id="edit-category-name"
                    value={editingCategory.form.name}
                    onChange={(event) =>
                      setEditingCategory((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: { ...prev.form, name: event.target.value },
                            }
                          : prev,
                      )
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-category-description">Description</Label>
                  <Input
                    id="edit-category-description"
                    value={editingCategory.form.description}
                    onChange={(event) =>
                      setEditingCategory((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: { ...prev.form, description: event.target.value },
                            }
                          : prev,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category-scope">Scope</Label>
                  <Select
                    id="edit-category-scope"
                    value={editingCategory.form.scope}
                    onChange={(event) =>
                      setEditingCategory((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: { ...prev.form, scope: event.target.value as CategoryScope },
                            }
                          : prev,
                      )
                    }
                  >
                    {CATEGORY_SCOPES.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category-order">Order</Label>
                  <Input
                    id="edit-category-order"
                    type="number"
                    min={0}
                    value={editingCategory.form.order}
                    onChange={(event) =>
                      setEditingCategory((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: { ...prev.form, order: event.target.value },
                            }
                          : prev,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category-color">Color</Label>
                  <Input
                    id="edit-category-color"
                    value={editingCategory.form.color}
                    onChange={(event) =>
                      setEditingCategory((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: { ...prev.form, color: event.target.value },
                            }
                          : prev,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category-active">Active</Label>
                  <Select
                    id="edit-category-active"
                    value={editingCategory.form.isActive}
                    onChange={(event) =>
                      setEditingCategory((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: {
                                ...prev.form,
                                isActive: event.target.value as "true" | "false",
                              },
                            }
                          : prev,
                      )
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button type="submit" disabled={savingCategory}>
                    {savingCategory ? "Saving..." : "Save category"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCategory(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {editingTag ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit tag</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSaveTagEdit}>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-tag-name">Name</Label>
                  <Input
                    id="edit-tag-name"
                    value={editingTag.form.name}
                    onChange={(event) =>
                      setEditingTag((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: { ...prev.form, name: event.target.value },
                            }
                          : prev,
                      )
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-tag-description">Description</Label>
                  <Input
                    id="edit-tag-description"
                    value={editingTag.form.description}
                    onChange={(event) =>
                      setEditingTag((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: { ...prev.form, description: event.target.value },
                            }
                          : prev,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-tag-approved">Approved</Label>
                  <Select
                    id="edit-tag-approved"
                    value={editingTag.form.isApproved}
                    onChange={(event) =>
                      setEditingTag((prev) =>
                        prev
                          ? {
                              ...prev,
                              form: {
                                ...prev.form,
                                isApproved: event.target.value as "true" | "false",
                              },
                            }
                          : prev,
                      )
                    }
                  >
                    <option value="true">Approved</option>
                    <option value="false">Pending</option>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button type="submit" disabled={savingTag}>
                    {savingTag ? "Saving..." : "Save tag"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingTag(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </MotionSection>
    </main>
  );
}

export function TaxonomySection() {
  return <TaxonomyContent />;
}
