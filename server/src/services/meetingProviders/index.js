const google = require('./google');
const zoom = require('./zoom');

const PROVIDERS = {
  GOOGLE_MEET: google,
  ZOOM: zoom,
};

function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown meeting provider: ${name}`);
  return p;
}

module.exports = { getProvider, PROVIDERS };
