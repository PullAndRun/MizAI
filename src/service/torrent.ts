import Config from "@miz/ai/config/config.toml";
import { UrlToJson } from "@miz/ai/src/core/http";
import { z } from "zod";

async function Search(query: string) {
  const searchJson = await UrlToJson(
    `${Config.Bitmagnet.url}`,
    { "Content-Type": "application/json" },
    {
      method: "post",
      body: JSON.stringify({
        query: `{
  torrentContent {
    search(
      input: {
        queryString: "${query}"
        limit: ${Config.Bitmagnet.limit}
        page: 1
        orderBy: [{ field: ${Config.Bitmagnet.field}, descending: true }]
      }
    ) {
      items {
        torrent {
          name
          size
          magnetUri
        }
      }
    }
  }
}`,
      }),
    }
  );
  const searchSchema = z.object({
    data: z.object({
      torrentContent: z.object({
        search: z.object({
          items: z
            .array(
              z.object({
                torrent: z.object({
                  name: z.string(),
                  size: z.number(),
                  magnetUri: z.string(),
                }),
              })
            )
            .min(1),
        }),
      }),
    }),
  });
  const search = searchSchema.safeParse(searchJson);
  if (!search.success) return undefined;
  return search.data.data.torrentContent.search.items;
}

export { Search };
