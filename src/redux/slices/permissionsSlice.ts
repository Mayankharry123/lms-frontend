import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../utils/apiClient";
import { extractAllPaths, extractAllSlugs, mapMenu, withAdvancedDeviceInventoryPage } from "../../services/Side";
import type { ApiSidebarItem, NavigationItem } from "../../services/Side";

interface PermissionsState {
  sidebarMenu: NavigationItem[];
  allPermittedPaths: string[];
  allPermittedSlugs: string[];
  loading: boolean;
  permissionsLoaded: boolean;
}

const initialState: PermissionsState = {
  sidebarMenu: [],
  allPermittedPaths: [],
  allPermittedSlugs: [],
  loading: false,
  permissionsLoaded: false,
};

export const fetchSidebarPermissions = createAsyncThunk(
  "permissions/fetchSidebarPermissions",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<any>("/permissions/sidebar");
      const rawItems = Array.isArray(res?.data) ? (res.data as ApiSidebarItem[]) : [];
      const { menu, paths } = withAdvancedDeviceInventoryPage(
        mapMenu(rawItems),
        extractAllPaths(rawItems)
      );

      return {
        sidebarMenu: menu,
        allPermittedPaths: paths,
        allPermittedSlugs: extractAllSlugs(rawItems),
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to load permissions");
    }
  }
);

const permissionsSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    clearPermissions: (state) => {
      state.sidebarMenu = [];
      state.allPermittedPaths = [];
      state.allPermittedSlugs = [];
      state.loading = false;
      state.permissionsLoaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSidebarPermissions.pending, (state) => {
        state.loading = true;
        state.permissionsLoaded = false;
      })
      .addCase(fetchSidebarPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.permissionsLoaded = true;
        state.sidebarMenu = action.payload.sidebarMenu;
        state.allPermittedPaths = action.payload.allPermittedPaths;
        state.allPermittedSlugs = action.payload.allPermittedSlugs;
        })
        .addCase(fetchSidebarPermissions.rejected, (state) => {
        state.loading = false;
        state.permissionsLoaded = false;
        state.sidebarMenu = [];
        state.allPermittedPaths = [];
        state.allPermittedSlugs = [];
      });
  },
});

export const { clearPermissions } = permissionsSlice.actions;
export default permissionsSlice.reducer;
