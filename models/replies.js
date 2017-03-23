class Reply {
  constructor(isSuccessful, code, message, body) {
    if (isSuccessful instanceof Error) {
      const e = isSuccessful;
      this.isSuccessful = e.isSuccessful;
      this.code = e.code;
      this.message = e.message;
      return;
    }
    this.type = isSuccessful;
    this.code = code;
    this.message = message;
    if (body)
      this.body = body;
  }
}

module.exports = Reply;