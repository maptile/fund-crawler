const watchedFunds = [
  '000000',
  '000001',
];

const providerSettings = {
  disable: [], // define which provider to disable
  morningstar: { // optinal, specify for morning star, will fill username and password
    credential: {
      username: '',
      password: ''
    }
  }
};

module.exports = {
  watchedFunds,
  providerSettings
};
