import { useCallback, useMemo, useState, type ReactNode } from "react";

import { Sheet, sheetConstants } from "@/shared/ui";
import { SheetStackContext, type SheetEntry } from "./SheetStackContext";

const BASE_Z_INDEX = 100;

export function SheetStackProvider({ children }: { children: ReactNode }) {
  const [sheets, setSheets] = useState<SheetEntry[]>([]);

  const openSheet = useCallback((entry: SheetEntry) => {
    setSheets((prev) => [...prev, entry]);
  }, []);

  const closeSheet = useCallback(() => {
    setSheets((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((sheet, index) =>
        index === prev.length - 1 ? { ...sheet, closing: true } : sheet,
      );
    });
  }, []);

  const removeSheet = useCallback((id: string) => {
    setSheets((prev) => prev.filter((sheet) => sheet.id !== id));
  }, []);

  const closeAll = useCallback(() => {
    setSheets([]);
  }, []);

  const value = useMemo(
    () => ({ sheets, openSheet, closeSheet, removeSheet, closeAll }),
    [sheets, openSheet, closeSheet, removeSheet, closeAll],
  );

  return (
    <SheetStackContext.Provider value={value}>
      {children}
      {sheets.map((sheet, index) => (
        <Sheet
          key={sheet.id}
          onClose={closeSheet}
          onRemove={() => removeSheet(sheet.id)}
          closing={sheet.closing ?? false}
          isTopMost={index === sheets.length - 1 && !sheet.closing}
          zIndex={BASE_Z_INDEX + index * 2}
          width={
            index === sheets.length - 1 ? sheetConstants.defaultWidth : sheetConstants.fullWidth
          }
        >
          {sheet.content}
        </Sheet>
      ))}
    </SheetStackContext.Provider>
  );
}
