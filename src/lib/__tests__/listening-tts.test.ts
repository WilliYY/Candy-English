import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { synthesizeListeningSpeech } from "@/lib/listening-tts";

test("caches listening audio and limits only new generations per user", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";

  let fetchCalls = 0;
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    fetchCalls += 1;
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: { "Content-Type": "audio/mpeg" },
      status: 200,
    });
  });

  try {
    const first = await synthesizeListeningSpeech(
      "Cache test sentence.",
      "normal",
      "user:cache-test",
    );
    const replay = await synthesizeListeningSpeech(
      "Cache test sentence.",
      "normal",
      "user:cache-test",
    );

    assert.equal(first.ok, true);
    assert.equal(replay.ok, true);
    assert.equal(fetchCalls, 1);

    const concurrent = await Promise.all([
      synthesizeListeningSpeech(
        "Concurrent sentence.",
        "normal",
        "user:concurrent-test",
      ),
      synthesizeListeningSpeech(
        "Concurrent sentence.",
        "normal",
        "user:concurrent-test",
      ),
    ]);

    assert.equal(concurrent.every((result) => result.ok), true);
    assert.equal(fetchCalls, 2);

    for (let index = 0; index < 10; index += 1) {
      const result = await synthesizeListeningSpeech(
        `Rate limit sentence ${index}.`,
        "normal",
        "user:rate-limit-test",
      );
      assert.equal(result.ok, true);
    }

    const limited = await synthesizeListeningSpeech(
      "Rate limit sentence 11.",
      "normal",
      "user:rate-limit-test",
    );

    assert.deepEqual(limited, {
      message: "Muitas solicitações de áudio. Aguarde um minuto.",
      ok: false,
      status: 429,
    });
    assert.equal(fetchCalls, 12);
  } finally {
    fetchMock.mock.restore();

    if (previousApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousApiKey;
    }
  }
});
