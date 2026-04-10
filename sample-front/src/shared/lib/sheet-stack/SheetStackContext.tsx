import { createContext, useContext, type ReactNode } from "react";

export type SheetEntry = {
  id: string;
  content: ReactNode;
  closing?: boolean;
};

export type SheetStackContextValue = {
  sheets: SheetEntry[];
  openSheet: (entry: SheetEntry) => void;
  closeSheet: () => void;
  removeSheet: (id: string) => void;
  closeAll: () => void;
};

export const SheetStackContext = createContext<SheetStackContextValue | null>(null);

export function useSheetStack(): SheetStackContextValue {
  const ctx = useContext(SheetStackContext);
  if (!ctx) {
    throw new Error("useSheetStack must be used within a SheetStackProvider");
  }
  return ctx;
}
