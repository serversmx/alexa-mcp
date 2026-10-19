import Alexa from 'alexa-remote2';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  chmodSync,
  renameSync,
  copyFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { findRoutineToDelete } from './routines.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveAuthDir() {
  const envDir = process.env.ALEXA_MCP_AUTH_DIR;
  if (envDir) {
    return envDir.startsWith('~/') ? join(homedir(), envDir.slice(2)) : envDir;
  }
  return join(__dirname, '..', '.auth-data');
}

const AUTH_DIR = resolveAuthDir();
const AUTH_FILE = join(AUTH_DIR, 'auth.json');

/**
 * A registration is only usable if it carries everything alexa-remote2 needs
 * to authenticate without a browser: the session cookie, the refresh token and
 * the signing keys (macDms). Anything less means a login prompt later on.
 */
function isCompleteRegistration(reg) {
  return !!(
    reg &&
    typeof reg.localCookie === 'string' &&
    reg.localCookie.length > 0 &&
    reg.refreshToken &&
    reg.macDms &&
    reg.macDms.adp_token &&
    reg.macDms.device_private_key
  );
}

export class AlexaClient {
  constructor() {
    this.alexa = new Alexa();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const savedAuth = this._loadAuth();
    if (!savedAuth) {
      throw new Error(
        'No authentication data found. Run "npm run auth" first to authenticate with Amazon.'
      );
    }

    const registration = savedAuth.formerRegistrationData;
    const seenTokenDate = registration && registration.tokenDate;

    // Persist every registration alexa-remote2 hands us. It emits 'cookie'
    // after the initial load and again after each refresh; only the refreshes
    // carry a new tokenDate, and those are the ones that must reach disk, or
    // the next process would refresh from an already-rotated refreshToken and
    // Amazon would send us back to the login page.
    if (!this._persistListenerAttached) {
      this._persistListenerAttached = true;
      this.alexa.on('cookie', () => {
        const fresh = this.alexa.cookieData;
        if (!isCompleteRegistration(fresh)) return;
        if (fresh.tokenDate === seenTokenDate) return;
        this._saveAuth({
          cookie: fresh.localCookie,
          formerRegistrationData: fresh,
          amazonPage: fresh.amazonPage || savedAuth.amazonPage || 'amazon.com',
          authenticatedAt: savedAuth.authenticatedAt,
          refreshedAt: new Date().toISOString(),
        });
      });
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 30s'));
      }, 30000);

      this.alexa.init(
        {
          // Hand over the whole registration object, not just the cookie
          // string. Given the object, alexa-remote2 recovers macDms and skips
          // the call to Amazon while the token is under 24h old; given a bare
          // string it cannot, and every single init rotates the token.
          cookie: isCompleteRegistration(registration)
            ? registration
            : savedAuth.cookie,
          formerRegistrationData: registration,
          macDms: registration && registration.macDms,
          proxyOwnIp: '127.0.0.1',
          proxyPort: 0,
          amazonPage: savedAuth.amazonPage || 'amazon.com',
          acceptLanguage: 'es-MX',
          amazonPageProxyLanguage: 'es_MX',
          useWsMqtt: false,
          cookieRefreshInterval: 4 * 24 * 60 * 60 * 1000, // 4 days
        },
        (err) => {
          clearTimeout(timeout);
          if (err) {
            if (err.message && err.message.includes('Cookie')) {
              reject(
                new Error(
                  'Authentication expired. Run "npm run auth" to re-authenticate.'
                )
              );
            } else {
              reject(err);
            }
            return;
          }
          this.initialized = true;
          resolve();
        }
      );
    });
  }

  // --- Device Management ---

  async getDevices() {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.getDevices((err, result) => {
        if (err) return reject(err);
        const devices = (result?.devices || []).map((d) => ({
          name: d.accountName,
          serialNumber: d.serialNumber,
          deviceType: d.deviceType,
          deviceFamily: d.deviceFamily,
          online: d.online,
          capabilities: d.capabilities,
        }));
        resolve(devices);
      });
    });
  }

  // --- Smart Home ---

  async getSmarthomeDevices() {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.getSmarthomeDevicesV2((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async getSmarthomeGroups() {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.getSmarthomeGroups((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async querySmarthomeDevices(entityIds) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.querySmarthomeDevices(entityIds, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  // --- Announcements ---

  async announce(serialNumber, message) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.sendSequenceCommand(
        serialNumber,
        'announcement',
        message,
        (err) => {
          if (err) return reject(err);
          resolve({ success: true });
        }
      );
    });
  }

  async speakSSML(serialNumber, ssml) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.sendSequenceCommand(serialNumber, 'ssml', ssml, (err) => {
        if (err) return reject(err);
        resolve({ success: true });
      });
    });
  }

  async textCommand(serialNumber, text) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.sendSequenceCommand(
        serialNumber,
        'textCommand',
        text,
        (err) => {
          if (err) return reject(err);
          resolve({ success: true });
        }
      );
    });
  }

  // --- Volume ---

  async setVolume(serialNumber, volume) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.sendSequenceCommand(
        serialNumber,
        'volume',
        volume,
        (err) => {
          if (err) return reject(err);
          resolve({ success: true });
        }
      );
    });
  }

  async getAllDeviceVolumes() {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.getAllDeviceVolumes((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  // --- Routines ---

  async getRoutines() {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.getAutomationRoutines((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async executeRoutine(routine) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.executeAutomationRoutine(routine, (err) => {
        if (err) return reject(err);
        resolve({ success: true });
      });
    });
  }

  async deleteRoutine(automationId, expectedName) {
    const routine = findRoutineToDelete(await this.getRoutines(), automationId, expectedName);
    this._enrichCookie();
    await new Promise((resolve, reject) => {
      this.alexa.httpsGet(
        `/api/behaviors/automations/${encodeURIComponent(automationId)}`,
        (err) => (err ? reject(err) : resolve()),
        { method: 'DELETE' }
      );
    });
    return routine;
  }

  // --- Lists ---

  async getLists() {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.getListsV2((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async getListItems(listId) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.getListItemsV2(listId, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  async addListItem(listId, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.addListItem(listId, value, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  // --- Group Management ---

  _enrichCookie() {
    const cookie = this.alexa.cookie;
    if (!cookie) return;
    const cookies = {};
    cookie.split(';').forEach((c) => {
      const [name, ...rest] = c.trim().split('=');
      cookies[name] = rest.join('=');
    });
    let enriched = cookie;
    // Add at-main/ubid-main aliases for regional cookies (required for write ops)
    for (const suffix of ['acbmx', 'acbus', 'acbde', 'acbuk', 'acbjp', 'acbin']) {
      if (cookies[`at-${suffix}`] && !cookies['at-main']) {
        enriched += `; at-main=${cookies[`at-${suffix}`]}`;
      }
      if (cookies[`ubid-${suffix}`] && !cookies['ubid-main']) {
        enriched += `; ubid-main=${cookies[`ubid-${suffix}`]}`;
      }
    }
    this.alexa.cookie = enriched;
  }

  async createSmarthomeGroup(name, applianceIds) {
    await this.init();
    this._enrichCookie();
    return new Promise((resolve, reject) => {
      const flags = {
        method: 'POST',
        data: JSON.stringify({
          name,
          type: 'SPACE',
          applianceIds: applianceIds || [],
        }),
      };
      this.alexa.httpsGet('/api/phoenix/group', (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }, flags);
    });
  }

  async updateSmarthomeGroup(groupId, name, applianceIds) {
    await this.init();
    this._enrichCookie();
    return new Promise((resolve, reject) => {
      const flags = {
        method: 'PUT',
        data: JSON.stringify({
          name,
          applianceIds: applianceIds || [],
        }),
      };
      this.alexa.httpsGet(`/api/phoenix/group/${groupId}`, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }, flags);
    });
  }

  async deleteSmarthomeGroup(groupId) {
    await this.init();
    this._enrichCookie();
    return new Promise((resolve, reject) => {
      this.alexa.deleteSmarthomeGroup(groupId, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  // --- Bluetooth ---

  async getBluetoothDevices() {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.getBluetoothDevices((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  // --- Do Not Disturb ---

  async setDoNotDisturb(serialNumber, enabled) {
    await this.init();
    return new Promise((resolve, reject) => {
      this.alexa.sendSequenceCommand(
        serialNumber,
        'deviceDoNotDisturb',
        enabled,
        (err) => {
          if (err) return reject(err);
          resolve({ success: true });
        }
      );
    });
  }

  // --- Auth helpers ---

  _loadAuth() {
    if (!existsSync(AUTH_FILE)) return null;
    try {
      return JSON.parse(readFileSync(AUTH_FILE, 'utf8'));
    } catch {
      return null;
    }
  }

  _saveAuth(data) {
    if (!isCompleteRegistration(data && data.formerRegistrationData)) {
      // Never let a partial refresh overwrite a working registration.
      return false;
    }
    try {
      if (existsSync(AUTH_FILE)) copyFileSync(AUTH_FILE, `${AUTH_FILE}.prev`);
      // Write to a temp file and rename, so a crash mid-write cannot leave a
      // truncated auth.json behind (that also costs a full re-login).
      const tmp = `${AUTH_FILE}.tmp`;
      writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      chmodSync(tmp, 0o600);
      renameSync(tmp, AUTH_FILE);
      return true;
    } catch {
      return false;
    }
  }
}
