import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/:categoryId',
    categories: ['government'],
    example: '/ahippc/a5e96b641ade4fc9b50b4f9504ba0f62',
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
            source: ['https://www.ahippc.cn/news.html?categoryId=:categoryId'],
            target: '/ahippc/:categoryId',
        },
    ],
    name: '安徽省知识产权保护中心(安徽预审中心)',
    description: '通知公告， 其id目前是a5e96b641ade4fc9b50b4f9504ba0f62，可以从网址中截取到',
    maintainers: ['CanYellow'],
    handler,
};

async function handler(ctx) {
    const { categoryId } = ctx.req.param();

    const response = await ofetch(`https://www.ahippc.cn/news.html?categoryId=${categoryId}`);
    const $ = load(response);
    const baseUrl = 'https://www.ahippc.cn';

    const title = $('dl.fix.right_1 dd');
    const list = $('dl.fix.right_2 dd')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            const t = item.find('span').first();
            let href = a.attr('href');

            if (href.search(/https?:\/\//) === -1) {
                href = `${baseUrl}${href}`;
            }

            return {
                title: a.text(),
                link: href,
                pubDate: parseDate(t.text()),
                author: '安徽省预审中心',
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);
                item.description = $('div.ny_right').first().html();
                return item;
            })
        )
    );

    return {
        title: `安徽省预审中心-${title.text()}`,
        link: `https://www.ahippc.cn/news.html?categoryId=${categoryId}`,
        item: items,
    };
}
