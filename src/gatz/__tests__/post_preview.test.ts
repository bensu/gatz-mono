import { getPreviewLayout } from "../ui/post_preview.ts";
import * as T from "../types";

describe("post_preview", () => {
  const post = { id: "0", user_id: "uid_0", text: "post" } as T.Message;
  const m1 = { id: "1", user_id: "uid_1", text: "first message" } as T.Message;
  const m2 = { id: "2", user_id: "uid_2", text: "second message" } as T.Message;
  const m3 = { id: "3", user_id: "uid_3", text: "third message" } as T.Message;
  const m4 = { id: "4", user_id: "uid_4", text: "fourth message" } as T.Message;
  const m5 = { id: "5", user_id: "uid_5", text: "fifth message" } as T.Message;
  const m6 = { id: "6", user_id: "uid_6", text: "sixth message" } as T.Message;
  it("handles the basic case", () => {
    expect(getPreviewLayout([post], [])).toEqual({
      post,
      rows: [],
    });
  });
  it("direct replies", () => {
    expect(getPreviewLayout([post, m1], [])).toEqual({
      post,
      rows: [{ type: "message_row", message: m1 }],
    });
    expect(getPreviewLayout([post, m1, m2], [])).toEqual({
      post,
      rows: [
        { type: "message_row", message: m1 },
        { type: "message_row", message: m2 },
      ],
    });
    expect(getPreviewLayout([post, m1, m2, m3], [])).toEqual({
      post,
      rows: [
        { type: "message_row", message: m1 },
        { type: "message_row", message: m2 },
        { type: "message_row", message: m3 },
      ],
    });
    expect(getPreviewLayout([post, m1, m2, m3, m4], [])).toEqual({
      post,
      rows: [
        { type: "message_row", message: m1 },
        { type: "message_row", message: m2 },
        { type: "message_row", message: m3 },
        { type: "message_row", message: m4 },
      ],
    });
  });

  it("last replies", () => {
    expect(getPreviewLayout([post, m1, m2, m3, m4, m5], [])).toEqual({
      post,
      rows: [
        missingReplyRow([m1, m2, m3, m4]),
        { type: "message_row", message: m5 },
      ],
    });
    expect(getPreviewLayout([post, m1, m2, m3, m4, m5, m6], [])).toEqual({
      post,
      rows: [
        missingReplyRow([m1, m2, m3, m4, m5]),
        { type: "message_row", message: m6 },
      ],
    });
  });

  const mention0 = { mid: "0", by_uid: "uid_1" } as T.Mention;
  const mention1 = { mid: "1", by_uid: "uid_1" } as T.Mention;
  const mention2 = { mid: "2", by_uid: "uid_1" } as T.Mention;
  const mention3 = { mid: "3", by_uid: "uid_1" } as T.Mention;
  const mention4 = { mid: "4", by_uid: "uid_1" } as T.Mention;
  const mention5 = { mid: "5", by_uid: "uid_1" } as T.Mention;

  it("mentions don't change the layout while it shows every reply", () => {
    expect(getPreviewLayout([post], [mention1])).toEqual({
      post,
      rows: [],
    });
    expect(getPreviewLayout([post, m1], [mention1])).toEqual({
      post,
      rows: [{ type: "mention_row", mention: mention1, message: m1 }],
    });
    expect(getPreviewLayout([post, m1, m2], [mention1])).toEqual({
      post,
      rows: [
        { type: "mention_row", mention: mention1, message: m1 },
        { type: "message_row", message: m2 },
      ],
    });
    expect(getPreviewLayout([post, m1, m2, m3], [mention1, mention3])).toEqual({
      post,
      rows: [
        { type: "mention_row", mention: mention1, message: m1 },
        { type: "message_row", message: m2 },
        { type: "mention_row", mention: mention3, message: m3 },
      ],
    });
    expect(
      getPreviewLayout(
        [post, m1, m2, m3, m4],
        [mention1, mention2, mention3, mention4],
      ),
    ).toEqual({
      post,
      rows: [
        { type: "mention_row", mention: mention1, message: m1 },
        { type: "mention_row", mention: mention2, message: m2 },
        { type: "mention_row", mention: mention3, message: m3 },
        { type: "mention_row", mention: mention4, message: m4 },
      ],
    });
  });

  it("gets the same layout when there are only mentions in the post", () => {
    expect(getPreviewLayout([post, m1, m2, m3, m4, m5], [mention0])).toEqual({
      post,
      rows: [
        missingReplyRow([m1, m2, m3, m4]),
        { type: "message_row", message: m5 },
      ],
    });
  });

  const missingReplyRow = (ms: T.Message[]) => ({
    type: "missing_replies_row",
    missing_replies: ms.length,
    users: new Set(ms.map((m) => m.user_id)),
  });

  it("mentions get a different layout when there are mentions in the middle", () => {
    expect(getPreviewLayout([post, m1, m2, m3, m4, m5], [mention1])).toEqual({
      post,
      rows: [
        { type: "mention_row", message: m1, mention: mention1 },
        missingReplyRow([m2, m3, m4]),
        { type: "message_row", message: m5 },
      ],
    });
    expect(getPreviewLayout([post, m1, m2, m3, m4, m5], [mention2])).toEqual({
      post,
      rows: [
        { type: "message_row", message: m1 },
        { type: "mention_row", message: m2, mention: mention2 },
        missingReplyRow([m3, m4]),
        { type: "message_row", message: m5 },
      ],
    });
    expect(getPreviewLayout([post, m1, m2, m3, m4, m5], [mention3])).toEqual({
      post,
      rows: [
        missingReplyRow([m1, m2]),
        { type: "mention_row", message: m3, mention: mention3 },
        { type: "message_row", message: m4 },
        { type: "message_row", message: m5 },
      ],
    });
    expect(getPreviewLayout([post, m1, m2, m3, m4, m5], [mention4])).toEqual({
      post,
      rows: [
        missingReplyRow([m1, m2, m3]),
        { type: "mention_row", message: m4, mention: mention4 },
        { type: "message_row", message: m5 },
      ],
    });
    expect(getPreviewLayout([post, m1, m2, m3, m4, m5], [mention5])).toEqual({
      post,
      rows: [
        missingReplyRow([m1, m2, m3, m4]),
        { type: "mention_row", message: m5, mention: mention5 },
      ],
    });

    // combinatorial
    expect(
      getPreviewLayout([post, m1, m2, m3, m4, m5], [mention1, mention2]),
    ).toEqual({
      post,
      rows: [
        { type: "mention_row", message: m1, mention: mention1 },
        { type: "mention_row", message: m2, mention: mention2 },
        missingReplyRow([m3, m4]),
        { type: "message_row", message: m5 },
      ],
    });
    expect(
      getPreviewLayout([post, m1, m2, m3, m4, m5], [mention2, mention1]),
    ).toEqual({
      post,
      rows: [
        { type: "mention_row", message: m1, mention: mention1 },
        { type: "mention_row", message: m2, mention: mention2 },
        missingReplyRow([m3, m4]),
        { type: "message_row", message: m5 },
      ],
    });
    expect(
      getPreviewLayout(
        [post, m1, m2, m3, m4, m5],
        [mention1, mention2, mention3],
      ),
    ).toEqual({
      post,
      rows: [
        { type: "mention_row", message: m1, mention: mention1 },
        { type: "mention_row", message: m2, mention: mention2 },
        { type: "mention_row", message: m3, mention: mention3 },
        { type: "message_row", message: m4 },
        { type: "message_row", message: m5 },
      ],
    });
    expect(
      getPreviewLayout([post, m1, m2, m3, m4, m5], [mention2, mention3]),
    ).toEqual({
      post,
      rows: [
        { type: "message_row", message: m1 },
        { type: "mention_row", message: m2, mention: mention2 },
        { type: "mention_row", message: m3, mention: mention3 },
        { type: "message_row", message: m4 },
        { type: "message_row", message: m5 },
      ],
    });

    expect(
      getPreviewLayout([post, m1, m2, m3, m4, m5], [mention4, mention5]),
    ).toEqual({
      post,
      rows: [
        missingReplyRow([m1, m2, m3]),
        { type: "mention_row", message: m4, mention: mention4 },
        { type: "mention_row", message: m5, mention: mention5 },
      ],
    });
    expect(
      getPreviewLayout([post, m1, m2, m3, m4, m5], [mention5, mention4]),
    ).toEqual({
      post,
      rows: [
        missingReplyRow([m1, m2, m3]),
        { type: "mention_row", message: m4, mention: mention4 },
        { type: "mention_row", message: m5, mention: mention5 },
      ],
    });

    // intermediate cases

    // TODO: there shouldn't be one hanging missing reply
    expect(
      getPreviewLayout([post, m1, m2, m3, m4, m5], [mention2, mention4]),
    ).toEqual({
      post,
      rows: [
        { type: "message_row", message: m1 },
        { type: "mention_row", message: m2, mention: mention2 },
        { type: "message_row", message: m3 },
        { type: "mention_row", message: m4, mention: mention4 },
        { type: "message_row", message: m5 },
      ],
    });
    // intermediate cases
    expect(
      getPreviewLayout(
        [post, m1, m2, m3, m4, m5],
        [mention2, mention4, mention5],
      ),
    ).toEqual({
      post,
      rows: [
        { type: "message_row", message: m1 },
        { type: "mention_row", message: m2, mention: mention2 },
        { type: "message_row", message: m3 },
        { type: "mention_row", message: m4, mention: mention4 },
        { type: "mention_row", message: m5, mention: mention5 },
      ],
    });
  });
});
