const LambdaClientInstrumentation = require('./lambdaClient');

function wrapLambda (lambdaClient, { tracer, serviceName, remoteServiceName }) {
  const instrumentation = new LambdaClientInstrumentation({ tracer, serviceName, remoteServiceName });

  return async function zipkinLambda (CommandClass, input) {
    return await tracer.scoped(async () => {
      const instrumentedInput = instrumentation.recordRequest(input);
      const traceId = tracer.id;

      const instrumentedCommand = new CommandClass(instrumentedInput);

      try {
        const response = await lambdaClient.send(instrumentedCommand);
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

module.exports = wrapLambda;
