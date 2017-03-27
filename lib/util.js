function gen_reply(code, message, body) {
  if (code instanceof Error) {
    const e = code;
    code = e.code;
    message = e.message;
  }
  return {
    code: code,
    message: message,
    body: body
  };
}

function _standardError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

module.exports = {
  reply: gen_reply,
  standardError: _standardError
};