import Config from "@miz/ai/config/config.toml";
import { cloudsearch, comment_new, song_detail } from "NeteaseCloudMusicApi";
import { z } from "zod";

async function NeteaseMusic(keyword: string) {
  const id = await NameToID(keyword);
  if (!id) return undefined;
  const detail = await IDToDetail(id);
  if (!detail) return undefined;
  const comment = await IDToHotComment(id);
  return {
    albumPicture: detail.al.picUrl || undefined,
    comment,
    url: `${Config.Music.netease.url}${id}`,
    name: detail.name,
    singer: detail.ar.map((singer) => singer.name).join("、"),
    album: detail.al.name,
  };
}

async function NameToID(keyword: string) {
  const musicSchema = z.object({
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
      const music = musicSchema.safeParse(res);
      if (!music.success || !music.data.body.result.songs[0]) return undefined;
      return music.data.body.result.songs[0].id;
    })
    .catch((_) => undefined);
  return id;
}

async function IDToDetail(id: number) {
  const musicSchema = z.object({
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
  const detail = await song_detail({
    ids: id.toString(),
  })
    .then((res) => {
      const music = musicSchema.safeParse(res);
      if (!music.success) return undefined;
      return music.data.body.songs[0];
    })
    .catch((_) => undefined);
  return detail;
}

async function IDToHotComment(id: number) {
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
      const comment = commentSchema.safeParse(res);
      if (!comment.success || !comment.data.body.data.comments[0])
        return undefined;
      return comment.data.body.data.comments[0].content;
    })
    .catch((_) => undefined);
  return comment;
}

export { NeteaseMusic };
