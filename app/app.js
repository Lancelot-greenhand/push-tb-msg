const EventEmitter = require('events')
const instapush = require("instapush");
const config = require('../config')
const puppeteer = require('puppeteer')
require('./utils')
class App extends EventEmitter {
    constructor(opt) {
        super()
        this.init()
    }
    init() {
        this.on('boot', (name) => {
            this.boot()
        })
    }
    async boot() {
        this.browser = await puppeteer.launch({ headless: false })
        let page = await this.browser.newPage()
        let mouse = page.mouse
            // page.setViewport({
            //     width: 375,
            //     height: 667
            // })

        await page.goto('https://login.taobao.com/member/login.jhtml?f=top&redirectURL=https%3A%2F%2Fwww.taobao.com%2F', {
            waitUntil: 'networkidle2'
        })
        let pswLoginIcon = await page.$('#J_Quick2Static')
        await pswLoginIcon.click()
            // const html = await page.evaluate((el) => {
            //     return el
            // }, pswLoginIcon);
        await page.focus('#J_Form .ph-label')
        await page.type('#J_Form .ph-label', config.taobao.account, {
            delay: 10
        })
        await page.type('#TPL_password_1', config.taobao.password, {
            delay: 100
        })
        await page.waitFor(1000)
            // 滑块验证
        await this.slideBlock(page)

        // const block = await page.evaluate(() => {
        //     console.log(document)
        //     console.log()
        // })

        let loginBtn = await page.$('#J_SubmitStatic')
        await loginBtn.click()
        console.log('点击登录')
        await page.waitFor(5000)
            //  有可能又出滑块
        try {
            await page.waitForSelector('#J_SubmitStatic')
            console.log('可能需要再次登录')
            const pages = await this.browser.pages()
                // console.log(pages)
            console.log('又出了滑块')
            await this.slideBlock(page)
                // }
        } catch (error) {
            console.log('没有再次出现', error)
        }

        await page.waitFor(5000)
        try {
            let confirmBtn = await page.$('#J_AgreementBtn')
                // 有可能会出现同意协议按钮
            if (confirmBtn) {
                await confirmBtn.click()
            }
        } catch (error) {

        }
        // await page.goto('https://www.taobao.com', {
        //     waitUntil: 'networkidle2'
        // })
        console.log('进入主页')
        await page.waitFor(3000)
        await page.goto('https://msg.taobao.com/message/list.htm', {
            waitUntil: 'networkidle2'
        })
        console.log('进入消息页面')
        await page.waitForSelector('.msg_item_link')
        console.log('找到消息')
            // links = await page.$('.msg_item_link')
        const urls = await page.evaluate(() => {
            let links = document.querySelectorAll('.msg_item_link')
            let url = Array.from(links).map(link => {
                return 'https:' + link.getAttribute('href')
            })
            return url
        });
        // console.log('物流url', urls)
        for (let i = 0; i < urls.length; i++) {
            await page.goto(urls[i], {
                waitUntil: 'networkidle2'
            })
            let today = new Date().Format('yyyy-MM-dd')
            let date = await page.$eval('#J_listtext2 .latest .date', (el) => { return el.innerHTML })
            if (today === date) {
                let week = await page.$eval('#J_listtext2 .latest .week', (el) => { return el.innerHTML })
                let time = await page.$eval('#J_listtext2 .latest .time', (el) => { return el.innerHTML })
                let text = await page.$eval('#J_listtext2 .latest .text', (el) => { return el.innerHTML })
                let message = date + week + time + text
                instapush.settings({
                    id: config.instapush.id,
                    secret: config.instapush.secret,
                });

                instapush.notify({ "event": "yourLifecare", "trackers": { message } }, function(err, response) {
                    console.log(response);
                });
            }

            // console.log(date, week, time, text)
        }
        await page.close()
        await this.browser.close()

    }
    async slideBlock(page) {
        let self = this
        return new Promise(async function(resolve, reject) {
            let mouse = page.mouse
            try {
                await page.waitFor('#nc_1_n1z', { timeout: 5000 })
                const blocks = await page.$('#nc_1_n1z')
                console.log('滑块验证')
                const bound = await blocks.boundingBox()
                    // 如果有滑动验证
                if (bound) {
                    console.log('has bound', bound)
                    mouse.move(bound.x, bound.y)
                    mouse.down()
                    await page.waitFor(1000)
                    mouse.move(bound.x + 50, bound.y + self.getRandomDistance(), { steps: 10 })
                    await page.waitFor(1000)
                    mouse.move(bound.x + 100, bound.y + self.getRandomDistance(), { steps: 20 })
                    await page.waitFor(1000)
                    mouse.move(bound.x + 150, bound.y + self.getRandomDistance(), { steps: 20 })
                    await page.waitFor(1000)
                    mouse.move(bound.x + 2000, bound.y + self.getRandomDistance(), { steps: 20 })
                    mouse.move(bound.x + 300, bound.y + self.getRandomDistance(), { steps: 20 })
                    await page.waitFor(1000)
                    try {
                        await page.waitFor('.errloading', { timeout: 5000 })
                        let reset = await page.$('.errloading')
                        if (reset) {
                            console.log('滑块验证不通过')
                            const result = await page.evaluate(async function() {
                                noCaptcha.reset(1)
                            })
                            await page.focus('#J_Form .ph-label')
                            await self.slideBlock(page)
                            resolve()
                        } else {
                            resolve()
                        }
                    } catch (error) {
                        resolve()
                    }
                } else {
                    resolve()
                }
            } catch (error) {
                console.log('没有滑块')
                resolve()
            }

        })

    }
    getRandomDistance(max = 10) {
        return (Math.random() * max) + 1
    }
}

module.exports = App