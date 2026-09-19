import { configureStore, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/**
 * Redux is reserved for *ephemeral UI state* (frontend-architecture.md §11).
 * Anything that touches server state (products, worlds, cart contents, orders)
 * must never live here — it belongs in TanStack Query.
 *
 * `ui` is the Phase 1 placeholder slice establishing that pattern. Real slices
 * (cart drawer open/closed, checkout wizard step) are added per Phase and
 * wired here as further reducers.
 */
const uiSlice = createSlice({
  name: "ui",
  initialState: {
    mobileNavOpen: false,
  },
  reducers: {
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
  },
});

export const { setMobileNavOpen } = uiSlice.actions;

export function makeStore() {
  return configureStore({
    reducer: {
      ui: uiSlice.reducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];