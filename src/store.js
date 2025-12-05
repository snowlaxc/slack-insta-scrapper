const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../db.json');

function loadDb() {
    if (!fs.existsSync(DB_PATH)) {
        return {};
    }
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading DB:', error);
        return {};
    }
}

function saveDb(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving DB:', error);
    }
}

function setUserConfig(userId) {
    const db = loadDb();
    db[userId] = { subscribed: true };
    saveDb(db);
}

function getUserConfig(userId) {
    const db = loadDb();
    return db[userId];
}

function getAllConfigs() {
    return loadDb();
}

function deleteUserConfig(userId) {
    const db = loadDb();
    if (db[userId]) {
        delete db[userId];
        saveDb(db);
        return true;
    }
    return false;
}

module.exports = {
    setUserConfig,
    getUserConfig,
    getAllConfigs,
    deleteUserConfig
};
