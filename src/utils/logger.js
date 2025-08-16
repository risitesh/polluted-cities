const logger = {
  info: (message, payload) => {
    if (payload) {
      if (typeof payload === 'object') {
        console.log(message, JSON.stringify(payload, null, 2));  // Pretty-printing the object
      } else {
        console.log(message, payload);
      }
    } else {
      console.log(message);
    }
  },
  error: (message, payload) => {
    if (payload) {
      if (typeof payload === 'object') {
        console.error(message, JSON.stringify(payload, null, 2));  // Pretty-printing the object
      } else {
        console.error(message, payload);
      }
    } else {
      console.error(message);
    }
  }
};

module.exports = { logger };
