import Config from "@miz/ai/config/config.toml";
import { UrlToJson } from "@miz/ai/src/core/http";
import { z } from "zod";

type Listing = {
  hq: boolean;
  pricePerUnit: number;
  worldName: string;
  total: number;
  quantity: number;
  retainerName: string;
  tax: number;
};

type StockData = {
  currentAveragePriceNQ: number;
  currentAveragePriceHQ: number;
  minPriceNQ: number;
  minPriceHQ: number;
  listings: Listing[];
};

async function TradingBoard(region: string, goods: string) {
  const serverMapping: Record<string, string> = {
    猫: "猫小胖",
    猪: "莫古力",
    狗: "豆豆柴",
    鸟: "陆行鸟",
  };
  const serverName = serverMapping[region];
  if (!serverName)
    return `未查询到 "${region}" 服务器,请检查服务器别名\n服务器别名仅支持 "猫|猪|狗|鸟"`;
  const searchGoods = await SearchGoods(serverName, goods);
  if (!searchGoods)
    return `未在 ${serverName} 区查询到 "${goods}" 商品,请检查商品名。`;
  if (!searchGoods.goodsDetail.listings.length)
    return `您查询的 "${goods}" 商品目前全服缺货。`;
  const goodsList = [];
  const goodsInfo = (
    quality: string,
    listing: Partial<Listing>,
    currentAveragePrice: number
  ) =>
    `-${quality}:\n  服务器: ${listing.worldName}\n  卖家: ${listing.retainerName}\n  均价: ${currentAveragePrice}\n  现价: ${listing.pricePerUnit}\n  数量: ${listing.quantity}\n  总价: ${listing.total}\n  税费: ${listing.tax}`;
  if (searchGoods.goodsDetail.minPriceHQ) {
    goodsList.push(
      goodsInfo(
        "高品质",
        searchGoods.stock.hq,
        searchGoods.goodsDetail.currentAveragePriceHQ
      )
    );
  }
  if (searchGoods.goodsDetail.minPriceNQ) {
    goodsList.push(
      goodsInfo(
        "普通品质",
        searchGoods.stock.nq,
        searchGoods.goodsDetail.currentAveragePriceNQ
      )
    );
  }
  return `您查询的: ${goods} 商品价目如下\n${goodsList.join("\n")}`;
}

async function SearchGoods(region: string, goods: string) {
  const goodsIntro = await GoodsIntro(goods);
  if (!goodsIntro) return undefined;
  const goodsDetail = await GoodsDetail(region, goodsIntro.ID);
  if (!goodsDetail) return undefined;
  const Stock = (data: StockData) => {
    const findListing = (hq: boolean, price: number): Partial<Listing> =>
      data.listings.find((v) => v.hq === hq && v.pricePerUnit === price) || {};
    return {
      hq: {
        ...findListing(true, data.minPriceHQ),
      },
      nq: {
        ...findListing(false, data.minPriceNQ),
      },
    };
  };
  const stock = Stock(goodsDetail);
  return {
    goodsDetail,
    stock,
  };
}

async function GoodsIntro(goods: string) {
  const goodsIntroJson = await UrlToJson(
    `${Config.FF14.intro.url}?${new URLSearchParams({
      indexes: "item",
      sort_order: "asc",
      limit: "1",
      columns: "ID,Name",
      string: goods,
    })}`
  );
  const goodsIntroSchema = z.object({
    Results: z
      .array(
        z.object({
          ID: z.number(),
          Name: z.string(),
        })
      )
      .min(1),
  });
  const goodsIntro = goodsIntroSchema.safeParse(goodsIntroJson);
  if (!goodsIntro.success) return undefined;
  return goodsIntro.data.Results[0];
}

async function GoodsDetail(region: string, itemID: number) {
  const goodsDetailJson = await UrlToJson(
    `${Config.FF14.detail.url}/${encodeURI(region)}/${itemID}`
  );
  const goodsDetailSchema = z.object({
    currentAveragePriceNQ: z.number(),
    currentAveragePriceHQ: z.number(),
    minPriceNQ: z.number(),
    minPriceHQ: z.number(),
    listings: z
      .array(
        z.object({
          hq: z.boolean(),
          pricePerUnit: z.number(),
          worldName: z.string(),
          total: z.number(),
          quantity: z.number(),
          retainerName: z.string(),
          tax: z.number(),
        })
      )
      .min(1),
  });
  const goodsDetail = goodsDetailSchema.safeParse(goodsDetailJson);
  if (!goodsDetail.success) return undefined;
  return goodsDetail.data;
}

export { TradingBoard };
