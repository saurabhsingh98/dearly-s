"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { productById } from "@/data/products";
import { coupons, freeShippingThreshold, shippingMethods, taxRate } from "@/data/site";
import type { CartLine, CartLineView, OrderSummary, Product } from "@/lib/types";

const STORAGE_KEY = "dearlys.cart.v1";

type State = {
  lines: CartLine[];
  couponCode: string | null;
  shippingMethodId: string;
};

type Action =
  | { type: "add"; line: CartLine }
  | { type: "setQty"; productId: string; variantId?: string; quantity: number; customization?: CartLine["customization"] }
  | { type: "remove"; productId: string; variantId?: string; customization?: CartLine["customization"] }
  | { type: "note"; productId: string; variantId?: string; giftNote: string; customization?: CartLine["customization"] }
  | { type: "coupon"; code: string | null }
  | { type: "shipping"; id: string }
  | { type: "clear" };

const initialState: State = {
  lines: [],
  couponCode: null,
  shippingMethodId: shippingMethods[0].id,
};

const sameLine = (
  a: CartLine,
  productId: string,
  variantId?: string,
  customization?: CartLine["customization"],
) => {
  const customKey = JSON.stringify(customization ?? []);
  const lineKey = JSON.stringify(a.customization ?? []);
  return (
    a.productId === productId &&
    (a.variantId ?? null) === (variantId ?? null) &&
    lineKey === customKey
  );
};

export function cartLineKey(line: Pick<CartLine, "productId" | "variantId" | "customization">) {
  return `${line.productId}:${line.variantId ?? ""}:${JSON.stringify(line.customization ?? [])}`;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      const existing = state.lines.find((l) =>
        sameLine(l, action.line.productId, action.line.variantId, action.line.customization),
      );
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) =>
            sameLine(l, action.line.productId, action.line.variantId, action.line.customization)
              ? {
                  ...l,
                  quantity: Math.min(l.quantity + action.line.quantity, 99),
                  product: l.product ?? action.line.product,
                }
              : l,
          ),
        };
      }
      return { ...state, lines: [...state.lines, action.line] };
    }
    case "setQty": {
      if (action.quantity <= 0) {
        return {
          ...state,
          lines: state.lines.filter(
            (l) => !sameLine(l, action.productId, action.variantId, action.customization),
          ),
        };
      }
      return {
        ...state,
        lines: state.lines.map((l) =>
          sameLine(l, action.productId, action.variantId, action.customization)
            ? { ...l, quantity: Math.min(action.quantity, 99) }
            : l,
        ),
      };
    }
    case "remove":
      return {
        ...state,
        lines: state.lines.filter(
          (l) => !sameLine(l, action.productId, action.variantId, action.customization),
        ),
      };
    case "note":
      return {
        ...state,
        lines: state.lines.map((l) =>
          sameLine(l, action.productId, action.variantId, action.customization)
            ? { ...l, giftNote: action.giftNote }
            : l,
        ),
      };
    case "coupon":
      return { ...state, couponCode: action.code };
    case "shipping":
      return { ...state, shippingMethodId: action.id };
    case "clear":
      return { ...initialState };
    default:
      return state;
  }
}

/**
 * The cart lives in a module-level external store rather than component state.
 * Reading localStorage is a side effect that cannot run during SSR, and
 * useSyncExternalStore is the supported way to fold that into render without
 * cascading setState-in-effect updates.
 */
let state: State = initialState;
let loaded = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded or private mode — the cart simply will not survive a reload */
  }
}

function loadFromStorage() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<State>;
    if (!Array.isArray(parsed.lines)) return;
    state = {
      lines: parsed.lines.filter(
        (l): l is CartLine =>
          Boolean(l) &&
          typeof l.productId === "string" &&
          (productById.has(l.productId) ||
            (typeof l.product?.id === "string" && l.product.id === l.productId)),
      ),
      couponCode: parsed.couponCode ?? null,
      shippingMethodId:
        shippingMethods.find((s) => s.id === parsed.shippingMethodId)?.id ??
        shippingMethods[0].id,
    };
  } catch {
    /* unreadable payload — fall back to an empty cart */
  }
}

function subscribe(listener: () => void) {
  loadFromStorage();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => initialState;
const isLoaded = () => loaded;
const isLoadedOnServer = () => false;

function dispatch(action: Action) {
  const next = reducer(state, action);
  if (next === state) return;
  state = next;
  persist();
  for (const listener of listeners) listener();
}

type CartContextValue = {
  lines: CartLineView[];
  count: number;
  summary: OrderSummary;
  couponCode: string | null;
  couponLabel: string | null;
  couponError: string | null;
  shippingMethodId: string;
  hydrated: boolean;
  drawerOpen: boolean;
  lastAdded: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (
    productId: string,
    quantity?: number,
    variantId?: string,
    options?: {
      openDrawer?: boolean;
      product?: Product;
      customization?: CartLine["customization"];
    },
  ) => void;
  setQty: (productId: string, quantity: number, variantId?: string, customization?: CartLine["customization"]) => void;
  remove: (productId: string, variantId?: string, customization?: CartLine["customization"]) => void;
  setNote: (productId: string, note: string, variantId?: string) => void;
  applyCoupon: (code: string) => boolean;
  clearCoupon: () => void;
  setShipping: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(subscribe, isLoaded, isLoadedOnServer);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const lines = useMemo<CartLineView[]>(
    () =>
      state.lines.flatMap((line) => {
        const product = line.product ?? productById.get(line.productId);
        if (!product) return [];
        const variant = product.variants?.find((v) => v.id === line.variantId);
        const unitPrice = product.price + (variant?.priceDelta ?? 0);
        return [{ ...line, product, variant, unitPrice, lineTotal: unitPrice * line.quantity }];
      }),
    [state.lines],
  );

  const summary = useMemo<OrderSummary>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const coupon = state.couponCode ? coupons[state.couponCode] : undefined;
    const discount = !coupon
      ? 0
      : coupon.type === "percent"
        ? Math.round((subtotal * coupon.value) / 100)
        : Math.min(coupon.value, subtotal);
    const method =
      shippingMethods.find((s) => s.id === state.shippingMethodId) ?? shippingMethods[0];
    const shipping =
      subtotal === 0 ? 0 : subtotal >= freeShippingThreshold ? 0 : method.price;
    const taxable = Math.max(subtotal - discount, 0);
    const tax = Math.round(taxable * taxRate);
    return { subtotal, discount, shipping, tax, total: taxable + shipping + tax };
  }, [lines, state.couponCode, state.shippingMethodId]);

  const add = useCallback(
    (
      productId: string,
      quantity = 1,
      variantId?: string,
      options?: {
        openDrawer?: boolean;
        product?: Product;
        customization?: CartLine["customization"];
      },
    ) => {
      const fields = options?.product?.customizationFields;
      if ((fields?.length ?? 0) > 0 && !(options?.customization?.length)) {
        return;
      }
      dispatch({
        type: "add",
        line: {
          productId,
          variantId,
          quantity,
          product: options?.product,
          customization: options?.customization,
        },
      });
      setLastAdded(productId);
      // Buy now navigates straight to checkout, so the drawer must stay shut.
      if (options?.openDrawer !== false) setDrawerOpen(true);
    },
    [],
  );

  const applyCoupon = useCallback((code: string) => {
    const normalised = code.trim().toUpperCase();
    if (!coupons[normalised]) {
      setCouponError("That code is not valid.");
      return false;
    }
    setCouponError(null);
    dispatch({ type: "coupon", code: normalised });
    return true;
  }, []);

  const value: CartContextValue = {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    summary,
    couponCode: state.couponCode,
    couponLabel: state.couponCode ? (coupons[state.couponCode]?.label ?? null) : null,
    couponError,
    shippingMethodId: state.shippingMethodId,
    hydrated,
    drawerOpen,
    lastAdded,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    add,
    setQty: (productId, quantity, variantId, customization) =>
      dispatch({ type: "setQty", productId, variantId, quantity, customization }),
    remove: (productId, variantId, customization) =>
      dispatch({ type: "remove", productId, variantId, customization }),
    setNote: (productId, giftNote, variantId) =>
      dispatch({ type: "note", productId, variantId, giftNote }),
    applyCoupon,
    clearCoupon: () => {
      setCouponError(null);
      dispatch({ type: "coupon", code: null });
    },
    setShipping: (id) => dispatch({ type: "shipping", id }),
    clear: () => dispatch({ type: "clear" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
