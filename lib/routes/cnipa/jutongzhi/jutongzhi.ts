import { Route } from '@/types';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch'; // 统一使用的请求库

export const route: Route = {
    path: '/:column',
    categories: ['government'],
    example: '/cnipa/col75',
    parameters: { column: '`col75`为通知页' },
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
            source: ['www.cnipa.gov.cn/col/:column', 'www.cnipa.gov.cn/col/:column/index.html'],
            target: '/cnipa/:column',
        },
    ],
    name: 'CNIPA',
    maintainers: ['CanYellow'],
    handler,
};

async function handler(ctx) {
    const { column } = ctx.req.param();

    const response = await ofetch(`https://www.cnipa.gov.cn/col/${column}/index.html`);
    const $ = load(response, { scriptingEnabled: false, xml: true });

    const title = $('ul.df-tit li:nth-child(2)');
    const data = $('script[type=text/xml]');

    const subhtml = load(data.text());
    const list = subhtml('li')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            const t = item.find('span').first();
            return {
                title: a.text(),
                link: a.attr('href'),
                pubDate: parseDate(t.text()),
                author: '国知局',
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);
                item.description = $('div.article').first().html();
                return item;
            })
        )
    );

    return {
        title: String(title.text()),
        link: `https://www.cnipa.gov.cn/col/${column}/index.html`,
        item: items,
    };
}
