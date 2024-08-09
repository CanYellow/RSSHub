import { Route } from '@/types';
import { load } from 'cheerio';
import { parseRelativeDate } from '@/utils/parse-date';
import cache from '@/utils/cache';
import got from '@/utils/got'; // 自订的 got

export const route: Route = {
    path: '/news',
    categories: ['news'],
    example: '/zhichanli/news',
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
            source: ['https://www.zhichanli.com/', 'https://www.zhichanli.com/#'],
            target: '/zhichanli/news',
        },
    ],
    name: '知产力',
    description: '默认的最新文章内容，没有任何参数',
    maintainers: ['CanYellow'],
    handler,
};

async function handler() {
    const response = await got('https://www.zhichanli.com/', {
        headers: {
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        },
    });
    const $ = load(response.data);
    const baseUrl = 'https://www.zhichanli.com';
    const title = $('div.kr-home-flow-title.weight-bold');
    const list = $('div.kr-home-flow-list > div.kr-home-flow-item:nth-child(-n+5) div.article-item-info.clearfloat.col-xl-9.col-lg-9.col-md-9.col-sm-9.col-xs-9.padding_l_r0')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            const t = item.find('span.kr-flow-bar-time.col-xl-4.col-lg-4.col-md-4.col-sm-12').first();

            return {
                title: a.text(),
                link: `${baseUrl}${a.attr('href')}`,
                pubDate: parseRelativeDate(t.text()),
                author: '知产力',
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
                item.description = $('div.article-wrapper.common-width').first().html();
                return item;
            })
        )
    );

    return {
        title: `知产力-${title.text()}`,
        link: 'https://www.zhichanli.com/',
        item: items,
    };
}
