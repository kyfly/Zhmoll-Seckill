class Reply {
  constructor(isSuccessful, code, message, body) {
    this.type = isSuccessful;
    this.code = code;
    this.message = message;
    if (body)
      this.body = body;
  }
}

module.exports = Reply;