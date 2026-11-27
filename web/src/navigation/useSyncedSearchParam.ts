"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Bidirectional URL search-param hook for page-level tabs and filters.
 * Derives state directly from Next.js searchParams and updates via router.replace.
 */
export function useSyncedSearchParam<T extends string>(
  key: string,
  defaultValue: T,
  allowedValues?: readonly T[]
): [T, (nextValue: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(key);
  const value: T =
    raw && (!allowedValues || allowedValues.includes(raw as T))
      ? (raw as T)
      : defaultValue;

  const setSyncedValue = useCallback(
    (nextValue: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextValue === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, nextValue);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, defaultValue, pathname, router, searchParams]
  );

  return [value, setSyncedValue];
}
