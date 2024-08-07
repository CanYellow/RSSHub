import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/ipc/:nav',
    categories: ['government'],
    example: '/court/ipc/20',
    parameters: { nav: 'left navigation' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['https://ipc.court.gov.cn/zh-cn/news/more-5-:nav.html'],
            target: '/court/ipc/:nav',
        },
    ],
    name: '最高法-知识产权法庭',
    description: `| 裁判要旨 | 案例分析 | 精品裁判 |
  | -------- | -------- | -------- |
  | 32    | 20     | 25     |`,
    maintainers: ['CanYellow'],
    handler,
};

async function handler(ctx) {
    const { nav } = ctx.req.param();

    const response = await ofetch(`https://ipc.court.gov.cn/zh-cn/news/more-5-${nav}.html`);
    const $ = load(response);
    const baseUrl = 'https://ipc.court.gov.cn/';

    const list = $('div.listing ul > li')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            const t = item.find('span.right').first();
            return {
                title: a.text(),
                link: `${baseUrl}${a.attr('href')}`,
                pubDate: parseDate(t.text()),
                author: '最高法-知产庭',
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);
                item.description = $('div.detail').first().html();
                return item;
            })
        )
    );

    return {
        title: '高法知产裁判',
        link: `https://ipc.court.gov.cn/zh-cn/news/more-5-${nav}.html`,
        item: items,
    };
}
