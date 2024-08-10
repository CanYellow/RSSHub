import { Route } from '@/types';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';
import got from '@/utils/got';

export const route: Route = {
    path: 'cponline/:id',
    categories: ['government'],
    example: '/cnipa/cponline/Zxgg',
    parameters: { id: 'id in wab address, between word select and word more' },
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
            source: ['https://cponline.cnipa.gov.cn/GzfwYwblGlwhTMVC/GzfwYwblGlwhT/select:idMore'],
            target: '/cnipa/cponline/:id',
        },
    ],
    name: '专利业务办理系统-通知公告',
    description: '专利业务办理系统通知公告， 其id目前是Zxgg，可以从网址中截取到，即`select`与`More`之间的部分。',
    maintainers: ['CanYellow'],
    handler,
};

async function handler() {
    const response = await got(`https://cponline.cnipa.gov.cn/index`, {
        headers: {
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        },
    });

    const $ = load(response.data);
    const baseUrl = 'https://cponline.cnipa.gov.cn';
    const title = $('div.bl-index-notice-list.bl-index-list span.title');
    const list = $('div.bl-index-notice-list.bl-index-list ul > li')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('span.title > a').first();
            const t = item.find('span.time').first();

            return {
                title: a.text(),
                link: `${baseUrl}${a.attr('href')}`,
                pubDate: parseDate(t.text()),
                author: '专利业务办理系统',
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await got(item.link, {
                    headers: {
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
                    },
                });
                const $ = load(response.data);
                item.description = decodeURI($('div.bl-sub-content.sp').first().html());
                return item;
            })
        )
    );

    return {
        title: `专利业务办理系统-${title.text()}`,
        link: `https://cponline.cnipa.gov.cn/index`,
        item: items,
    };
}
