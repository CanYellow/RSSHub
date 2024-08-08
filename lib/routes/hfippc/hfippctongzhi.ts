import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/:categoryId',
    categories: ['government'],
    example: '/hfippc/6ebc07b58d8944e88309e7258b1ecc98',
    parameters: { categoryId: 'param categoryId in wab address' },
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
            source: ['https://web.hfippc.cn/news.html?categoryId=:categoryId'],
            target: '/hfippc/:categoryId',
        },
    ],
    name: '合肥知识产权保护中心(合肥预审中心)',
    description: '通知公告， 其id目前是6ebc07b58d8944e88309e7258b1ecc98，可以从网址中截取到',
    maintainers: ['CanYellow'],
    handler,
};

async function handler(ctx) {
    const { categoryId } = ctx.req.param();

    const response = await ofetch(`https://web.hfippc.cn/news.html?categoryId=${categoryId}`);
    const $ = load(response);
    const baseUrl = 'https://web.hfippc.cn';

    const title = $('dl.fix.right_1 dd');
    const list = $('dl.fix.right_2 dd')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            const t = item.find('span').first();
            const pubDate = t
                .text()
                .replaceAll(/\D/g, '-')
                .slice(0, -1);

            return {
                title: a.text(),
                link: `${baseUrl}${a.attr('href')}`,
                pubDate: parseDate(pubDate),
                author: '合肥预审中心',
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);
                item.description = $('div.bottem').first().html();
                return item;
            })
        )
    );

    return {
        title: `合肥预审中心-${title.text()}`,
        link: `https://web.hfippc.cn/news.html?categoryId=${categoryId}`,
        item: items,
    };
}
