import { Route } from '@/types';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import logger from '@/utils/logger';
import puppeteer from '@/utils/puppeteer';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch'; // 统一使用的请求库

export const route: Route = {
    path: '/col/:column',
    categories: ['government'],
    example: 'www.cnipa.gov.cn/col/col75',
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
            target: '/col/:column',
        },
    ],
    name: 'CNIPA',
    maintainers: ['CanYellow'],
    handler,
};

async function handler(ctx) {
    const { column } = ctx.req.param();

    // 导入 puppeteer 工具类并初始化浏览器实例
    const browser = await puppeteer();
    // 打开一个新标签页
    const page = await browser.newPage();
    // 拦截所有请求
    await page.setRequestInterception(true);
    // 仅允许某些类型的请求
    page.on('request', (request) => {
        // request.continue();
        // 在这次例子，我们只允许 HTML 请求
        request.resourceType() === 'document' || request.resourceType() === 'script' ? request.continue() : request.abort();
    });
    // 访问目标链接
    const link = `https://www.cnipa.gov.cn/col/${column}`;

    // ofetch 请求会被自动记录，
    // 但 puppeteer 请求不会
    // 所以我们需要手动记录它们
    logger.http(`Requesting ${link}`);
    await page.goto(link, {
        // 指定页面等待载入的时间
        waitUntil: 'domcontentloaded',
    });
    // 获取页面的 HTML 内容
    const response = await page.content();
    // 关闭标签页
    page.close();

    const $ = load(response);

    // const li = $('ul.list.clearfix li');

    // console.log(response);
    // console.log(li);

    const list = $('ul.list.clearfix li')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            const span = item.find('span').first();
            return {
                title: a.text(),
                link: a.attr('href'),
                pubDate: parseDate(span.text()),
                author: '国家知识产权局',
            };
        });

    // .map((item)=>{return $(item).text()});

    // console.log(list);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);

                // 选择类名为“comment-body”的第一个元素
                item.description = $('div.article').first().html();

                // 上面每个列表项的每个属性都在此重用，
                // 并增加了一个新属性“description”
                return item;
            })
        )
    );

    return {
        // 源标题
        title: '国知局工作通知',
        // 源链接
        link: `https://www.cnipa.gov.cn/col/${column}/index.html`,
        // 源文章
        item: items,
    };
}
