const schedule = require('node-schedule');
const Holidays = require('date-holidays');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getAllConfigs } = require('./store');
require('dotenv').config();

const hd = new Holidays('KR');
const jobs = {};

// Scrape job at 10:00 AM daily
function runScraper() {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, 'scraper.py');
        const pythonPath = path.join(__dirname, '../venv/bin/python');
        exec(`${pythonPath} ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Scrape error: ${error.message}`);
                resolve(false);
                return;
            }
            if (stderr) {
                console.error(`Scrape stderr: ${stderr}`);
            }
            console.log(`Scrape stdout: ${stdout}`);
            resolve(true);
        });
    });
}

function initScraperJob() {
    // Parse SCRAPE_SCHEDULE or use default (10:55 AM KST)
    const scrapeSchedule = process.env.SCRAPE_SCHEDULE || '55 10 * * *';
    const [minute, hour] = scrapeSchedule.split(' ');
    
    // Use RecurrenceRule with timezone to ensure KST execution
    const rule = new schedule.RecurrenceRule();
    rule.hour = parseInt(hour);
    rule.minute = parseInt(minute);
    rule.tz = 'Asia/Seoul';
    
    schedule.scheduleJob(rule, async function () {
        console.log('Starting daily scrape job...');
        await runScraper();
    });
    console.log(`Initialized daily scraper job at ${hour}:${minute} KST`);
}

async function sendImageToUser(app, userId) {
    try {
        // Check for image
        const imagePath = path.join(__dirname, '../data/latest.jpg');

        if (!fs.existsSync(imagePath)) {
            console.log(`Image not found for ${userId}, attempting to scrape...`);
            const scraped = await runScraper();
            if (!scraped) {
                const profileUrl = process.env.INSTAGRAM_PROFILE_URL;
                await app.client.chat.postMessage({
                    channel: userId,
                    text: `오늘의 새로운 소식을 가져오지 못했습니다. 😢\n아래 링크에서 직접 확인해주세요!\n${profileUrl}`
                });
                return;
            }
        }

        if (fs.existsSync(imagePath)) {
            try {
                // Get DM channel ID
                const { channel } = await app.client.conversations.open({
                    users: userId
                });

                const messageTitle = process.env.MESSAGE_TITLE || 'Latest TSIS Post';
                const messageComment = process.env.MESSAGE_COMMENT || '이번주 주간메뉴표입니다!';
                await app.client.files.uploadV2({
                    channel_id: channel.id,
                    file: fs.createReadStream(imagePath),
                    filename: 'latest.jpg',
                    title: messageTitle,
                    initial_comment: messageComment
                });
                console.log(`Sent image to ${userId}`);
            } catch (uploadError) {
                console.error(`Failed to upload file to ${userId}:`, uploadError);
                const profileUrl = process.env.INSTAGRAM_PROFILE_URL;
                await app.client.chat.postMessage({
                    channel: userId,
                    text: `이미지를 전송하는 중 오류가 발생했습니다. 😢\n아래 링크에서 직접 확인해주세요!\n${profileUrl}`
                });
            }
        }
    } catch (error) {
        console.error(`Failed to send to ${userId}:`, error);
        try {
            const profileUrl = process.env.INSTAGRAM_PROFILE_URL;
            await app.client.chat.postMessage({
                channel: userId,
                text: `알 수 없는 오류가 발생했습니다. 😢\n아래 링크에서 직접 확인해주세요!\n${profileUrl}`
            });
        } catch (e) {
            console.error('Failed to send fallback message:', e);
        }
    }
}

function isFirstBusinessDay(date) {
    if (hd.isHoliday(date)) return false;
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (day === 0 || day === 6) return false; // Skip weekends

    // Check previous days of this week (back to Monday)
    for (let i = day - 1; i >= 1; i--) {
        const prevDate = new Date(date);
        prevDate.setDate(date.getDate() - (day - i));
        if (!hd.isHoliday(prevDate)) {
            return false; // Found a previous business day
        }
    }
    return true;
}

function initWeeklyJob(app) {
    // Run every day at 11:00 AM KST
    const rule = new schedule.RecurrenceRule();
    rule.hour = 11;
    rule.minute = 0;
    rule.tz = 'Asia/Seoul';

    schedule.scheduleJob(rule, async function () {
        console.log('Running daily check for weekly notification...');

        // Convert to KST
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(utc + kstOffset);

        if (isFirstBusinessDay(kstDate)) {
            console.log('Today is the first business day of the week! Sending notifications...');
            const allConfigs = getAllConfigs();
            for (const [userId, config] of Object.entries(allConfigs)) {
                if (config && config.subscribed) {
                    await sendImageToUser(app, userId);
                }
            }
        } else {
            console.log('Today is not the first business day. Skipping.');
        }
    });
    console.log('Initialized weekly notification job at 11:00 AM KST');
}

function initScheduler(app) {
    initScraperJob();
    initWeeklyJob(app);
}

module.exports = {
    initScheduler,
    sendImageToUser
};
