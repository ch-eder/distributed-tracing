const { Annotation } = require('zipkin');
const LambdaFunction = require('./lambdaFunction');

function requiredArg (name) {
  throw new Error(`LambdaClientInstrumentation: Missing required argument ${name}.`);
}

class LambdaClientInstrumentation {
  constructor ({
    tracer = requiredArg('tracer'),
    serviceName = tracer.localEndpoint.serviceName,
    remoteServiceName
  }) {
    this.tracer = tracer;
    this.serviceName = serviceName;
    this.remoteServiceName = remoteServiceName;
  }

  recordRequest (input) {
    this.tracer.setId(this.tracer.createChildId());
    const traceId = this.tracer.id;

    this.tracer.recordServiceName(this.serviceName);
    this.tracer.recordRpc('lambda_invoke');
    this.tracer.recordBinary('lambda.function_name', input.FunctionName);
    this.tracer.recordAnnotation(new Annotation.ClientSend());

    if (this.remoteServiceName) {
      this.tracer.recordAnnotation(new Annotation.ServerAddr({
        serviceName: this.remoteServiceName
      }));
    }

    return LambdaFunction.appendZipkinHeaderToContext(input, traceId);
  }

  recordResponse (traceId, statusCode) {
    this.tracer.setId(traceId);
    this.tracer.recordBinary('http.status_code', statusCode.toString());
    if (statusCode < 200 || statusCode > 399) {
      this.tracer.recordBinary('error', statusCode.toString());
    }
    this.tracer.recordAnnotation(new Annotation.ClientRecv());
  }

  recordError (traceId, error) {
    this.tracer.setId(traceId);
    this.tracer.recordBinary('error', error.toString());
    this.tracer.recordAnnotation(new Annotation.ClientRecv());
  }
}

module.exports = LambdaClientInstrumentation;
