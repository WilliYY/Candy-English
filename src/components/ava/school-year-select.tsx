"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { currentSchoolYear, FIRST_SCHOOL_YEAR } from "@/lib/school-year";

export function SchoolYearSelect({ year }: { year: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const lastYear = Math.max(FIRST_SCHOOL_YEAR, currentSchoolYear()) + 1;
  const years = Array.from({ length: lastYear - FIRST_SCHOOL_YEAR + 1 }, (_, i) => FIRST_SCHOOL_YEAR + i);
  if (!years.includes(year)) years.push(year);

  return (
    <label className="flex w-fit items-center gap-2 text-sm font-medium">
      Ano
      <select
        className="rounded-md border bg-background px-3 py-2"
        value={year}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.set("year", event.target.value);
          router.push(`${pathname}?${next}`, { scroll: false });
        }}
      >
        {years.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
