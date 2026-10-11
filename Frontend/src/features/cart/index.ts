/**
 * features/cart barrel — the guest-aware cart for the storefront (§6 backend,
 * Phase 6 frontend). Exposes the TanStack Query hooks and the wire types; the
 * cart's authoritative state lives in the `["cart"]` query, so every surface
 * (Navbar badge, product cards, cart page, checkout) reads the same key.
 */
export {
  cartQueryKeys,
  useCart,
  useAddToCart,
  useUpdateCartItem,
  useRemoveCartItem,
} from "./hooks";

export {
  cartSchema,
  cartItemSchema,
  type Cart,
  type CartItem,
} from "./api";

export { getCart, addCartItem, updateCartItem, removeCartItem } from "./api";