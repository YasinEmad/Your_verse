"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/features/cart";
import { availableStock, formatPrice } from "@/components/store/helpers";
import { ProductImage } from "@/components/store/ProductImage";
import { ApiError } from "@/lib/api/client";

export default function CartPage() {
  const params = useParams<{ worldSlug: string }>();
  const worldSlug = params.worldSlug;

  const { data: cart, isLoading, error } = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();

  const items = cart?.items ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your cart</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cash on delivery — nothing is charged until it arrives.</p>
        </div>
        <Link
          href={`/${worldSlug}/products`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Keep shopping
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Loading your cart…</p>
      ) : error ? (
        <p className="mt-10 text-destructive">Could not load the cart. {error.message}</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-foreground">Your cart is empty.</p>
          <Link
            href={`/${worldSlug}/products`}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Browse {worldSlug} products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <ul className="space-y-4">
            {items.map((item) => {
              const max = item.variant ? availableStock(item.variant) : 0;
              return (
                <li
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  {item.product ? (
                    <Link
                      href={`/${worldSlug}/products/${item.product.slug}`}
                      className="shrink-0"
                    >
                      <ProductImage
                        imageUrl={null}
                        alt={item.product.name}
                        className="size-20 rounded-xl"
                      />
                    </Link>
                  ) : (
                    <ProductImage imageUrl={null} className="size-20 rounded-xl" />
                  )}

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {item.product ? (
                          <Link
                            href={`/${worldSlug}/products/${item.product.slug}`}
                            className="line-clamp-1 font-medium text-foreground hover:underline"
                          >
                            {item.product.name}
                          </Link>
                        ) : (
                          <p className="font-medium text-foreground">
                            {item.variant?.sku ?? "Product"}
                          </p>
                        )}
                        {item.variant?.sku ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.variant.sku}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove from cart`}
                        onClick={() => remove.mutate({ itemId: item.id })}
                        disabled={remove.isPending}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                          disabled={item.quantity <= 1 || update.isPending}
                          className="grid size-8 place-items-center rounded-l-lg hover:bg-muted disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="min-w-9 text-center text-sm font-medium" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                          disabled={update.isPending || (max > 0 && item.quantity >= max)}
                          className="grid size-8 place-items-center rounded-r-lg hover:bg-muted disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatPrice((Number(item.variant?.price) || 0) * item.quantity, cart?.currency)}
                      </p>
                    </div>

                    {max > 0 && max < item.quantity ? (
                      <p className="mt-1 text-xs text-destructive">
                        Only {max} available — reduce the quantity.
                      </p>
                    ) : null}

                    {update.error instanceof ApiError ? (
                      <p className="mt-1 text-xs text-destructive" role="alert">
                        {update.error.message}
                      </p>
                    ) : null}
                    {remove.error instanceof ApiError ? (
                      <p className="mt-1 text-xs text-destructive" role="alert">
                        {remove.error.message}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Items</dt>
                <dd className="text-foreground">{cart?.itemCount ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium text-foreground">
                  {formatPrice(cart?.subtotal ?? 0, cart?.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="text-foreground">At the door (COD)</dd>
              </div>
            </dl>
            <Link
              href={`/${worldSlug}/checkout`}
              className="mt-6 block cursor-pointer rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Checkout
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}