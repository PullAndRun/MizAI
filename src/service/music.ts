import config from "@miz/ai/config/config.toml";
import { cloudsearch, comment_new, song_detail } from "NeteaseCloudMusicApi";
import { z } from "zod";

async function pick(keyword: string) {
  const id = await fetchID(keyword);
  if (!id) return undefined;
  const song = await fetchSong(id);
  if (!song) return undefined;
  const comment = await fetchHotComment(id);
  return {
    albumPicture: song.al.picUrl || undefined,
    comment,
    url: `${config.music.url}${id}`,
    name: song.name,
    singer: song.ar.map((singer) => singer.name).join("、"),
    album: song.al.name,
  };
}

async function fetchID(keyword: string) {
  const searchSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      result: z.object({
        songs: z
          .array(
            z.object({
              id: z.number(),
            })
          )
          .min(1),
      }),
    }),
  });
  const id = await cloudsearch({
    keywords: keyword,
    limit: 1,
  })
    .then((res) => {
      const result = searchSchema.safeParse(res);
      if (!result.success || !result.data.body.result.songs[0])
        return undefined;
      return result.data.body.result.songs[0].id;
    })
    .catch((_) => undefined);
  return id;
}

async function fetchSong(id: number) {
  const songSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      songs: z
        .array(
          z.object({
            name: z.string(),
            al: z.object({ picUrl: z.string(), name: z.string() }),
            ar: z.array(z.object({ name: z.string() })).min(1),
          })
        )
        .min(1),
    }),
  });
  const song = await song_detail({
    ids: id.toString(),
  })
    .then((res) => {
      const result = songSchema.safeParse(res);
      if (!result.success) return undefined;
      return result.data.body.songs[0];
    })
    .catch((_) => undefined);
  return song;
}

async function fetchHotComment(id: number) {
  const commentSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      data: z.object({
        comments: z
          .array(
            z.object({
              content: z.string(),
            })
          )
          .min(1),
      }),
    }),
  });
  const comment = await comment_new({
    id: id,
    type: 0,
    pageNo: 1,
    pageSize: 1,
    sortType: 2,
  })
    .then((res) => {
      const result = commentSchema.safeParse(res);
      if (!result.success || !result.data.body.data.comments[0])
        return undefined;
      return result.data.body.data.comments[0].content;
    })
    .catch((_) => undefined);
  return comment;
}

export { fetchHotComment, fetchID, fetchSong, pick };
