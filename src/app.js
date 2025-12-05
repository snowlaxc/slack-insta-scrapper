const { App } = require('@slack/bolt');
require('dotenv').config();
const { setUserConfig, deleteUserConfig } = require('./store');
const { initScheduler, sendImageToUser } = require('./scheduler');

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: process.env.PORT || 3000
});

const DAYS_OPTIONS = [
    { text: { type: 'plain_text', text: '월요일' }, value: '1' },
    { text: { type: 'plain_text', text: '화요일' }, value: '2' },
    { text: { type: 'plain_text', text: '수요일' }, value: '3' },
    { text: { type: 'plain_text', text: '목요일' }, value: '4' },
    { text: { type: 'plain_text', text: '금요일' }, value: '5' },
    { text: { type: 'plain_text', text: '토요일' }, value: '6' },
    { text: { type: 'plain_text', text: '일요일' }, value: '0' }
];

async function openSetupModal(client, triggerId) {
    try {
        const modalTitle = process.env.MODAL_TITLE || 'TSIS 알림 구독';
        const modalDescription = process.env.MODAL_DESCRIPTION || '매주 *첫 영업일 오전 11시*에 TSIS 인스타그램 소식을 보내드립니다.\n구독하시겠습니까? 📸';

        await client.views.open({
            trigger_id: triggerId,
            view: {
                type: 'modal',
                callback_id: 'setup_tsis_modal',
                title: {
                    type: 'plain_text',
                    text: modalTitle
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: modalDescription
                        }
                    }
                ],
                submit: {
                    type: 'plain_text',
                    text: '구독하기'
                }
            }
        });
    } catch (error) {
        console.error(error);
    }
}

app.command('/tsis-setup', async ({ ack, body, client }) => {
    await ack();
    await openSetupModal(client, body.trigger_id);
});

app.message('설정', async ({ message, say }) => {
    if (message.subtype === 'bot_message') return;

    const setupMessage = process.env.SETUP_MESSAGE || 'TSIS 알림 설정을 시작하려면 아래 버튼을 눌러주세요!';

    await say({
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: setupMessage
                }
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "설정하기"
                        },
                        action_id: "open_setup_modal_button"
                    }
                ]
            }
        ],
        text: "설정 버튼을 눌러주세요."
    });
});

app.action('open_setup_modal_button', async ({ ack, body, client }) => {
    await ack();
    await openSetupModal(client, body.trigger_id);
});

app.view('setup_tsis_modal', async ({ ack, body, client }) => {
    await ack();

    const userId = body.user.id;

    setUserConfig(userId);

    const subscriptionConfirmMessage = process.env.SUBSCRIPTION_CONFIRM_MESSAGE || '구독이 완료되었습니다! 📸\n매주 첫 영업일 오전 11시에 소식을 전해드리겠습니다!';
    await client.chat.postMessage({
        channel: userId,
        text: subscriptionConfirmMessage
    });

    // Send latest image immediately
    await sendImageToUser(app, userId);
});

app.command('/tsis-stop', async ({ ack, body, client }) => {
    await ack();

    const stopModalTitle = process.env.STOP_MODAL_TITLE || 'TSIS 알림 구독 해지';
    const stopModalDescription = process.env.STOP_MODAL_DESCRIPTION || '정말로 구독을 해지하시겠습니까?\n\n⚠️ *다음 작업이 수행됩니다:*\n• 주간 알림이 더 이상 전송되지 않습니다\n• 봇과의 모든 대화 내역이 삭제됩니다';

    await client.views.open({
        trigger_id: body.trigger_id,
        view: {
            type: 'modal',
            callback_id: 'stop_tsis_modal',
            title: {
                type: 'plain_text',
                text: stopModalTitle
            },
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: stopModalDescription
                    }
                }
            ],
            submit: {
                type: 'plain_text',
                text: '구독 해지'
            },
            close: {
                type: 'plain_text',
                text: '취소'
            }
        }
    });
});

app.view('stop_tsis_modal', async ({ ack, body, client }) => {
    await ack();

    const userId = body.user.id;

    try {
        // Delete user config from database
        deleteUserConfig(userId);

        // Get DM channel
        const { channel } = await client.conversations.open({
            users: userId
        });

        // Get conversation history
        let hasMore = true;
        let cursor = undefined;
        const messagesToDelete = [];

        while (hasMore) {
            const result = await client.conversations.history({
                channel: channel.id,
                limit: 100,
                cursor: cursor
            });

            // Filter bot messages
            const botMessages = result.messages.filter(msg => msg.bot_id);
            messagesToDelete.push(...botMessages);

            hasMore = result.has_more;
            cursor = result.response_metadata?.next_cursor;
        }

        // Delete bot messages
        for (const message of messagesToDelete) {
            try {
                await client.chat.delete({
                    channel: channel.id,
                    ts: message.ts
                });
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to delete message ${message.ts}:`, error);
            }
        }

        // Send confirmation message
        const unsubscribeConfirmMessage = process.env.UNSUBSCRIBE_CONFIRM_MESSAGE || '구독이 해지되었습니다.\n더 이상 알림을 받지 않습니다.';
        await client.chat.postMessage({
            channel: userId,
            text: unsubscribeConfirmMessage
        });

    } catch (error) {
        console.error('Error in stop_tsis_modal:', error);
        await client.chat.postMessage({
            channel: userId,
            text: '구독 해지 중 오류가 발생했습니다. 다시 시도해주세요.'
        });
    }
});

(async () => {
    await app.start();
    console.log('⚡️ Bolt app is running!');
    initScheduler(app);
})();
