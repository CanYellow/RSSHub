import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/prai/:column',
    categories: ['government'],
    example: '/cnipa/prai/col2650',
    parameters: { column: 'page column identity' },
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
            source: ['https://www.cnipa.gov.cn/col/:column/index.html'],
            target: '/cnipa/cponline/:id',
        },
    ],
    name: '专利复审和无效案例中心',
    description: '专利复审和无效案例，源自复审和无效官网，column是网址中`col+数字`。',
    maintainers: ['CanYellow'],
    handler,
};

async function handler(ctx) {
    const { column } = ctx.req.param();

    const response = await ofetch(`https://www.cnipa.gov.cn/col/${column}/index.html`);
    const $ = load(response, { scriptingEnabled: false, xml: true });

    const title = $('div.channelname');
    const data = $('script[type=text/xml]');
    const subhtml = load(data.text());
    const list = subhtml('li')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            const t = item.find('span.bt-data-time').first();

            return a.attr('href').startsWith('http') ? {
                    title: a.text(),
                    link: a.attr('href'),
                    pubDate: parseDate(t.text().replaceAll(/[[\]]/g, '')),
                    author: '复审无效案例中心',
                } : undefined;
        });

    const nonull = list.filter((x) => x !== undefined);
    const items = await Promise.all(
        nonull.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);
                item.description = $('div.page_detail').first().html();
                return item;
            })
        )
    );

    return {
        title: `案例中心-${title.text()}`,
        link: `https://cponline.cnipa.gov.cn/index`,
        item: items,
        // item: list,
    };
}
