function gen_reply(code, message, body) {
  if (code instanceof Error) {
    const e = code;
    code = e.code;
    message = code ? e.message : '哎呀呀，出了点错~';
    console.error(e);
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

function _gen(len) {
  len = len || 40;
  const charset = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  const maxPos = charset.length;
  let result = '';
  for (i = 0; i < len; i++)
    result += charset.charAt(Math.floor(Math.random() * maxPos));
  return result;
}

module.exports = {
  reply: gen_reply,
  standardError: _standardError,
  genToken: _gen
};