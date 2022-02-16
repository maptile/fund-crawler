const chalk = require('chalk');
const chalk16 = new chalk.Instance({level: 1});

let showDebug = false;

function _log(space,  msg, e){
  if(e){
    console.log(`${space}${msg}`, e);
  } else {
    console.log(`${space}${msg}`);
  }
}

function getLogger(leadingSpace){
  if(!leadingSpace){
    leadingSpace = 0;
  }

  const space = ''.padStart(leadingSpace, ' ');

  return {
    debug: (msg, e) => {
      if(showDebug){
        _log(space, chalk16.dim.cyan(msg), e);
      }
    },

    info: (msg, e) => {
      _log(space, chalk16.reset(msg), e);
    },

    warn: (msg, e) => {
      _log(space, chalk16.yellow(msg), e);
    },

    error: (msg, e) => {
      _log(space, chalk16.red(msg), e);
    }
  };
}

function debug(value){
  showDebug = value;
}

module.exports = {
  getLogger,
  debug
};
