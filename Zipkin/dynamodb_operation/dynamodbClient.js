const { Annotation } = require('zipkin');

function requiredArg (name) {
  throw new Error(`DynamoDBClientInstrumentation: Missing required argument ${name}.`);
}

class DynamoDBClientInstrumentation {
  constructor ({
    tracer = requiredArg('tracer'),
    serviceName = tracer.localEndpoint.serviceName,
    remoteServiceName
  }) {
    this.tracer = tracer;
    this.serviceName = serviceName;
    this.remoteServiceName = remoteServiceName;
  }

  recordRequest (command) {
    this.tracer.setId(this.tracer.createChildId());

    this.tracer.recordServiceName(this.serviceName);
    this.tracer.recordRpc('dynamodb_operation');
    this.tracer.recordBinary('dynamodb.operation', command.constructor.name);
    this.tracer.recordBinary('dynamodb.table_name', command.input.TableName);
    this.tracer.recordAnnotation(new Annotation.ClientSend());

    if (this.remoteServiceName) {
      this.tracer.recordAnnotation(new Annotation.ServerAddr({
        serviceName: this.remoteServiceName
      }));
    }
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

module.exports = DynamoDBClientInstrumentation;
