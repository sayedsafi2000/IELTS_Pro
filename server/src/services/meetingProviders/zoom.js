const axios = require('axios');
const { decrypt, encrypt } = require('../cryptoService');

const SCOPES = ['meeting:write', 'meeting:read', 'user:read'];

function authUrl(state) {
  const url = new URL('https://zoom.us/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.ZOOM_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.ZOOM_OAUTH_REDIRECT);
  if (state) url.searchParams.set('state', state);
  return url.toString();
}

function basicAuthHeader() {
  const id = process.env.ZOOM_OAUTH_CLIENT_ID;
  const secret = process.env.ZOOM_OAUTH_CLIENT_SECRET;
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

async function exchangeCode(code) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.ZOOM_OAUTH_REDIRECT,
  });
  const { data } = await axios.post('https://zoom.us/oauth/token', params, {
    headers: { Authorization: basicAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const profile = await axios.get('https://api.zoom.us/v2/users/me', {
    headers: { Authorization: `Bearer ${data.access_token}` }
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    scope: data.scope || null,
    externalAccountEmail: profile.data?.email || null,
  };
}

async function refreshIfNeeded(prisma, integration) {
  if (integration.expiresAt && new Date(integration.expiresAt).getTime() > Date.now() + 60_000) {
    return decrypt(integration.accessToken);
  }
  if (!integration.refreshToken) return decrypt(integration.accessToken);
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: decrypt(integration.refreshToken),
  });
  const { data } = await axios.post('https://zoom.us/oauth/token', params, {
    headers: { Authorization: basicAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  await prisma.examinerIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: encrypt(data.access_token),
      refreshToken: data.refresh_token ? encrypt(data.refresh_token) : integration.refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    }
  });
  return data.access_token;
}

async function createMeeting(prisma, integration, { summary, description, startISO, durationMins }) {
  const token = await refreshIfNeeded(prisma, integration);
  const { data } = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic: summary,
      type: 2, // scheduled
      start_time: new Date(startISO).toISOString(),
      duration: durationMins,
      timezone: 'UTC',
      agenda: description,
      settings: { join_before_host: false, waiting_room: true, mute_upon_entry: true }
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return { externalId: String(data.id), meetingUrl: data.join_url };
}

async function cancelMeeting(prisma, integration, externalId) {
  const token = await refreshIfNeeded(prisma, integration);
  await axios.delete(`https://api.zoom.us/v2/meetings/${externalId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function rescheduleMeeting(prisma, integration, externalId, { startISO, durationMins }) {
  const token = await refreshIfNeeded(prisma, integration);
  await axios.patch(
    `https://api.zoom.us/v2/meetings/${externalId}`,
    { start_time: new Date(startISO).toISOString(), duration: durationMins, timezone: 'UTC' },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  const { data } = await axios.get(`https://api.zoom.us/v2/meetings/${externalId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return { externalId: String(data.id), meetingUrl: data.join_url };
}

module.exports = { authUrl, exchangeCode, createMeeting, cancelMeeting, rescheduleMeeting, SCOPES };
