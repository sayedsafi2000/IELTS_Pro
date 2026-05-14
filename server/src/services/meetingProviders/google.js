const { google } = require('googleapis');
const { decrypt, encrypt } = require('../cryptoService');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

function authUrl(state) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

async function exchangeCode(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope || null,
    externalAccountEmail: profile.email || null,
  };
}

async function getAuthorizedClient(prisma, integration) {
  const client = getOAuthClient();
  client.setCredentials({
    access_token: decrypt(integration.accessToken),
    refresh_token: integration.refreshToken ? decrypt(integration.refreshToken) : undefined,
    expiry_date: integration.expiresAt ? integration.expiresAt.getTime() : undefined,
  });

  client.on('tokens', async (tokens) => {
    const update = {};
    if (tokens.access_token) update.accessToken = encrypt(tokens.access_token);
    if (tokens.refresh_token) update.refreshToken = encrypt(tokens.refresh_token);
    if (tokens.expiry_date) update.expiresAt = new Date(tokens.expiry_date);
    if (Object.keys(update).length) {
      await prisma.examinerIntegration.update({ where: { id: integration.id }, data: update });
    }
  });

  return client;
}

async function createMeeting(prisma, integration, { summary, description, startISO, durationMins, attendees }) {
  const auth = await getAuthorizedClient(prisma, integration);
  const calendar = google.calendar({ version: 'v3', auth });
  const start = new Date(startISO);
  const end = new Date(start.getTime() + durationMins * 60_000);
  const requestId = `ielts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary,
      description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees,
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        }
      }
    }
  });

  const meetingUrl = res.data.hangoutLink || res.data.conferenceData?.entryPoints?.[0]?.uri || null;
  return { externalId: res.data.id, meetingUrl };
}

async function cancelMeeting(prisma, integration, externalId) {
  const auth = await getAuthorizedClient(prisma, integration);
  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.delete({ calendarId: 'primary', eventId: externalId, sendUpdates: 'all' });
}

async function rescheduleMeeting(prisma, integration, externalId, { startISO, durationMins }) {
  const auth = await getAuthorizedClient(prisma, integration);
  const calendar = google.calendar({ version: 'v3', auth });
  const start = new Date(startISO);
  const end = new Date(start.getTime() + durationMins * 60_000);
  const res = await calendar.events.patch({
    calendarId: 'primary',
    eventId: externalId,
    sendUpdates: 'all',
    requestBody: { start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } }
  });
  return { externalId: res.data.id, meetingUrl: res.data.hangoutLink || null };
}

module.exports = { authUrl, exchangeCode, createMeeting, cancelMeeting, rescheduleMeeting, SCOPES };
