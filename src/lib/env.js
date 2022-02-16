const path = require('path');

function getAppDir(){
  return path.dirname(require.main.filename);
}

module.exports = {
  getAppDir
}
