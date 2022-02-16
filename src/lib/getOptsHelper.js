const moment = require('moment');

function has(o){
  return !(typeof o == 'undefined' || o == null);
}

function getLongestParamLength(defs){
  let maxLength = 0;

  for(const def of defs){
    let length = def.name.length;

    if(has(def.alias)){
      length++;
    }

    if(length > maxLength){
      maxLength = length;
    }
  }

  return maxLength;
}

function getDef(defs){
  const result = {
    alias: {},
    default: {},
    string: [],
    boolean: []
  };

  for(const def of defs){
    if(has(def.alias)){
      result.alias[def.alias] = def.name;
    }

    if(has(def.defaultValue)){
      result.default[def.name] = def.defaultValue;
    }

    if(has(def.type) && def.type == String){
      result.string.push(def.name);
    }

    if(has(def.type) && def.type == Boolean){
      result.boolean.push(def.name);
    }
  }

  return result;
}

function getUsage(defs){
  const maxLength = getLongestParamLength(defs) + 16;

  const result = [];

  for(const def of defs){
    let line = '';

    if(has(def.alias)){
      line += `  -${def.alias}, --${def.name}`.padEnd(maxLength, ' ');
    } else {
      line += `  --${def.name}`.padEnd(maxLength, ' ');
    }

    line += def.description;

    if(def.required){
      line += ' *required*';
    }

    if(has(def.defaultValue)){
      line += ' (default: ' + def.defaultValue + ')';
    }

    if(has(def.min)){
      line += ' (min: ' + def.min + ')';
    }

    if(has(def.max)){
      line += ' (max: ' + def.max + ')';
    }

    result.push(line);
  }

  return result;
}

function getAllAvailableArgNames(defs){
  const names = {
    '_': true // _ is a special token
  };

  for(const def of defs){
    names[def.name] = true;

    if(def.alias){
      names[def.alias] = true;
    }
  }

  return names;
}

function validate(args, defs){
  // check required args and convert arg values
  for(const def of defs){
    if(typeof args[def.name] == 'undefined' && def.required){
      return {
        hasError: true,
        parameter: def.name,
        error: 'required'
      };
    }

    if(typeof args[def.name] == 'undefined'){
      continue;
    }

    switch(def.type){
      case String:
        args[def.name] = args[def.name].toString();
        break;
      case Number:
        if(args[def.name].toString().indexOf('.') >= 0){ // float
          args[def.name] = parseFloat(args[def.name]);
        } else {
          args[def.name] = parseInt(args[def.name]);
        }

        if(isNaN(args[def.name])){
          return {
            hasError: true,
            parameter: def.name,
            error: 'type error'
          };
        }

        if(has(def.max)){
          if(args[def.name] > def.max){
            return {
              hasError: true,
              parameter: def.name,
              error: 'exceed the max value ' + def.max
            };
          }
        }

        if(has(def.min)){
          if(args[def.name] < def.min){
            return {
              hasError: true,
              parameter: def.name,
              error: 'lower than min value ' + def.min
            };
          }
        }

        break;
      case Boolean:
        // args[def.name] = args[def.name] == 'true';
        break;
      case Date:
        args[def.name] = moment.utc(args[def.name]);

        if(!args[def.name].isValid()){
          return {
            hasError: true,
            parameter: def.name,
            error: 'type error'
          };
        }
        break;
    }
  }

  const usedArgNames = Object.keys(args);

  const defsHash = getAllAvailableArgNames(defs);

  // check unknown args
  for(const name of usedArgNames){
    if(!defsHash[name]){
      return {
        hasError: true,
        parameter: name,
        error: 'invalid'
      };
    }
  }

  return {hasError: false};
}

module.exports = {
  getDef,
  getUsage,
  validate
};
