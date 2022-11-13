const DynamoDBClientInstrumentation = require('./dynamoDBClient');

function wrapDynamoDB (dynamoDBClient, { tracer, serviceName, remoteServiceName }) {
  const instrumentation = new DynamoDBClientInstrumentation({ tracer, serviceName, remoteServiceName });

  return async function zipkinDynamoDB (command) {
    return await tracer.scoped(async () => {
      instrumentation.recordRequest(command);
      const traceId = tracer.id;

      try {
        const response = await dynamoDBClient.send(command);
        tracer.scoped(() => {
          instrumentation.recordResponse(traceId, response.$metadata.httpStatusCode);
        });

        return response;
      } catch (error) {
        tracer.scoped(() => {
          instrumentation.recordError(traceId, error);
        });

        return error;
      }
    });
  };
}

module.exports = wrapDynamoDB;
