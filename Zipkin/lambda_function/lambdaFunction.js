const { HttpHeaders } = require('zipkin');

function appendZipkinHeaderToContext (input, traceId) {
  const b3 = {};

  b3[HttpHeaders.TraceId] = traceId.traceId;
  b3[HttpHeaders.SpanId] = traceId.spanId;

  traceId.parentSpanId.ifPresent((psid) => {
    b3[HttpHeaders.ParentSpanId] = psid;
  });

  traceId.sampled.ifPresent((sampled) => {
    b3[HttpHeaders.Sampled] = sampled ? '1' : '0';
  });

  if (traceId.isDebug()) {
    b3[HttpHeaders.Flags] = '1';
  }

  return Object.assign(input, { ClientContext: Buffer.from(JSON.stringify(b3)).toString('base64') });
}

module.exports = {
  appendZipkinHeaderToContext
};
