"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCart } from "@/features/cart";
import { useCreateOrder } from "@/features/orders";
import { useSession } from "@/features/auth";
import { formatPrice } from "@/components/store/helpers";

const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2, "Enter the recipient's name.").max(200),
  recipientPhone: z.string().trim().min(4, "Enter a phone number for the courier.").max(40),
  line1: z.string().trim().min(2, "Street address is required.").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required.").max(100),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().min(2, "Country is required.").max(100),
});

type CheckoutValues = z.input<typeof checkoutSchema>;

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring";
const labelClass = "block text-sm font-medium text-foreground";

export default function CheckoutPage() {
  const params = useParams<{ worldSlug: string }>();
  const worldSlug = params.worldSlug;
  const router = useRouter();

  const { user, isAuthenticated, isLoading } = useSession();
  const { data: cart } = useCart();
  const create = useCreateOrder();

  // One key per checkout *intent* — reused verbatim on any retry so the backend
  // replays the original order instead of charging twice (§20 frontend mirror).
  const checkoutKey = useRef<string | null>(null);

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      recipientName: "",
      recipientPhone: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
    },
  });

  const items = cart?.items ?? [];

  const onSubmit = handleSubmit((values) => {
    if (submitted) {
      return;
    }
    setSubmitted(true);
    checkoutKey.current ??= crypto.randomUUID();
    create.mutate(
      {
        idempotencyKey: checkoutKey.current,
        details: {
          recipientName: values.recipientName,
          recipientPhone: values.recipientPhone,
          shippingAddress: {
            line1: values.line1,
            line2: values.line2 || null,
            city: values.city,
            region: values.region || null,
            postalCode: values.postalCode || null,
            country: values.country,
          },
        },
      },
      {
        onSuccess: (order) => {
          checkoutKey.current = null;
          router.push(`/${worldSlug}/orders/${order.id}`);
        },
        onError: () => setSubmitted(false),
      },
    );
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8">
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8">
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign in to check out</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Orders are linked to an account so you can track them here. Your cart
            stays saved while you sign in.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
          <div className="mt-4">
            <Link
              href={`/${worldSlug}/cart`}
              className="text-sm text-muted-foreground hover:underline"
            >
              Back to cart
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cash on delivery — you pay the courier when the parcel arrives.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Delivery details</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Recipient name
              <input type="text" autoComplete="name" {...register("recipientName")} className={inputClass} />
              {errors.recipientName && <span className="mt-1 block text-xs text-destructive">{errors.recipientName.message}</span>}
            </label>
            <label className={labelClass}>
              Phone
              <input type="tel" autoComplete="tel" {...register("recipientPhone")} className={inputClass} />
              {errors.recipientPhone && <span className="mt-1 block text-xs text-destructive">{errors.recipientPhone.message}</span>}
            </label>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Street address
              <input type="text" autoComplete="address-line1" {...register("line1")} className={inputClass} />
              {errors.line1 && <span className="mt-1 block text-xs text-destructive">{errors.line1.message}</span>}
            </label>
            <label className="block text-sm font-medium text-foreground">
              Apartment, suite, etc. <span className="text-muted-foreground">(optional)</span>
              <input type="text" autoComplete="address-line2" {...register("line2")} className={inputClass} />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium text-foreground">
                City
                <input type="text" autoComplete="address-level2" {...register("city")} className={inputClass} />
                {errors.city && <span className="mt-1 block text-xs text-destructive">{errors.city.message}</span>}
              </label>
              <label className="block text-sm font-medium text-foreground">
                Region <span className="text-muted-foreground">(optional)</span>
                <input type="text" autoComplete="address-level1" {...register("region")} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Postal code <span className="text-muted-foreground">(optional)</span>
                <input type="text" autoComplete="postal-code" {...register("postalCode")} className={inputClass} />
              </label>
            </div>
            <label className="block text-sm font-medium text-foreground">
              Country
              <input type="text" autoComplete="country-name" {...register("country")} className={inputClass} />
              {errors.country && <span className="mt-1 block text-xs text-destructive">{errors.country.message}</span>}
            </label>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Order summary</h2>

          {items.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Your cart is empty.{" "}
              <Link href={`/${worldSlug}/products`} className="text-primary hover:underline">
                Browse products
              </Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {item.product?.name ?? item.variant?.sku ?? "Item"}
                    <span className="ms-2 text-xs text-muted-foreground/70">× {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {formatPrice((Number(item.variant?.price) || 0) * item.quantity, cart?.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
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
            <div className="flex justify-between text-base">
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="font-semibold text-foreground">
                {formatPrice(cart?.subtotal ?? 0, cart?.currency)}
              </dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitted || items.length === 0 || create.isPending}
            className="mt-6 w-full cursor-pointer rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? "Placing order…" : "Place order"}
          </button>

          {create.error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {create.error.message}
            </p>
          ) : null}
        </aside>
      </form>
    </main>
  );
}