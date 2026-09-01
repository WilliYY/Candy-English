import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AgendaDateRail } from "@/components/ava/agenda-date-rail";

test("renders every agenda day as an accessible selectable date", () => {
  const markup = renderToStaticMarkup(
    <AgendaDateRail
      days={[
        {
          attendedCount: 1,
          dateLabel: "26 de agosto",
          day: 26,
          key: "2026-08-26",
          lessonCount: 3,
          missedCount: 1,
          pendingCount: 1,
          weekdayLabel: "Qua",
          weekdayLongLabel: "Quarta-feira",
        },
        {
          attendedCount: 0,
          dateLabel: "27 de agosto",
          day: 27,
          key: "2026-08-27",
          lessonCount: 0,
          missedCount: 0,
          pendingCount: 0,
          weekdayLabel: "Qui",
          weekdayLongLabel: "Quinta-feira",
        },
      ]}
      onSelectDay={() => undefined}
      selectedDayKey="2026-08-26"
      todayKey="2026-08-26"
    />,
  );

  assert.equal((markup.match(/<button/g) ?? []).length, 2);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /aria-current="date"/);
  assert.match(
    markup,
    /aria-label="Selecionar Quarta-feira, 26 de agosto: 3 aulas"/,
  );
  assert.match(markup, />Hoje</);
  assert.match(markup, /3 aulas/);
  assert.match(markup, /Sem aulas/);
});
