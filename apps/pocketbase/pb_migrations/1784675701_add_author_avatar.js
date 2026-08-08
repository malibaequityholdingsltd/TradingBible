/// <reference path="../pb_data/types.d.ts" />

// Store the author's avatar URL alongside forum posts so avatars can render
// without exposing the whole users collection.
migrate(
  (app) => {
    ["forum_threads", "forum_replies"].forEach((name) => {
      const col = app.findCollectionByNameOrId(name);
      if (!col.fields.getByName("authorAvatar")) {
        col.fields.add(new TextField({
          name: "authorAvatar",
          max: 500,
          required: false,
        }));
        app.save(col);
      }
    });
  },
  (app) => {
    ["forum_threads", "forum_replies"].forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name);
        col.fields.removeByName("authorAvatar");
        app.save(col);
      } catch (_) {}
    });
  },
);
