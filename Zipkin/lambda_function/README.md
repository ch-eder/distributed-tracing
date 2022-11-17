# Instrument Lambda Function Invocation

The following describes how a lambda function can be instrumented to record another function invocation.

**Content:**
- [Prerequisites](#anker-prerequisites)
- [Necessary Steps](#anker-necessary_steps)
- [Usage](#anker-usage)

<a name="anker-prerequisites"></a>
## Prerequisites

As with no tracing, the corresponding security roles for enabling function invocation have to be enabled:

- `AWSLambdaBasicExecutionRole`
- `AWSLambdaExecute`
- `AWSLambdaRole`

Additionally, to use the AWS SDK v3, the lamda client has to be installed in a [lambda layer](../../other/lambda_instructions.md) and linked to the function. The installation can be performed by using the following command:

```
npm install --save @aws-sdk/client-lambda
```

> **Note:** The layer used in the master thesis (`layer_lambda_sdk`) can be found [here](../../lambda_resources). Note that all following examples will refer to the usage of this very layer.

<a name="anker-necessary_steps"></a>
## Necessary Steps

Since there is no pre-existing instrumented library for capturing lambda function invocations, the instrumentation has to be implemented from scratch. This is done by utilizing the scripts described in the following. To use the scripts, they must be encapsulated in a [`lambda_layer`](../../other/lambda_instructions.md).

<br>

:page_facing_up: **[`wrapLambda.js`](wrapLambda.js):**

<details><summary>Description</summary>

This file wraps the original `lambdaClient` of the `aws-sdk`, which is responsible for invoking a lambda function. As such, tracing is enabled. The file includes the following functions:

- `wrapLambda`:
  - ***Description:*** wraps a [`Lambda`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html) client to be traced with Zipkin and returns a `zipkinLambda` function for performing function invocations.
  - ***Parameters:***
    - *lambdaClient:* The [`Lambda`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html) to be wrapped for tracing
    - *tracer:* Zipkin Tracer to be used for tracing interactions
    - *serviceName (optional):* Name of the current service
    - *remoteServiceName (optional):* Name of the remote servie / database to be called
  - ***Returns:*** `zipkinLambda` function
- `zipkinLambda`:
  - ***Description:*** performs function invocations while recording the Request, the Response, and Errors
  - ***Parameters:***
    - *params:* to be used for function invocation; have to be specified according to the [specification](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property) of the AWS SDK
  - ***Returns:*** Result of the function invocation

> **Note:** The instrumentation is inspired by [`zipkin-instrumentation-request`](https://github.com/openzipkin/zipkin-js/tree/master/packages/zipkin-instrumentation-request) and other pre-existing instrumented libraries.

</details>

<br>

:page_facing_up: **[`lambdaClient.js`](lambdaClient.js):**

<details><summary>Description</summary>

In order to display a transparent picture of the trace, relevant properties of the function invocation have to be added. This is done by using the `lambdaClient.js`. The file includes an Instrumentation class with the following functions:

- `recordRequest`:
  - ***Description:*** records a function invocation by recording the following Zipkin Annotations:
    - `serviceName`: name of the current service (entered with construction of Instrumentation object)
    - `RPC`: in this case: `lambda_invoke`
    - `dynamodb.operation`: the type of operation (e.g., `PutItemCommand`)
    - `lambda.function_name`: the name of the lambda function to be invoked
    - `ClientSend`: Annotation indicating that the client has performed function invocation
    - `remoteServiceName` (optional): remoteServiceName, if specified during object construction
  - ***Parameters:***
    - *params:* to be used function invocation; have to be specified according to the [specification](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property) of the AWS SDK
  - ***Returns:*** instrumented `params` which contain trace information for metadata propagation
- `recordResponse`:
  - ***Description:*** records response by recording the following Zipkin Annotations:
    - `http.status_code`: status code of the function invocation
    - `ClientRecv`: Annotation indicating that the client has received a response
  - ***Parameters:***
    - *traceId:* current traceId
    - *statusCode:* status code of the function invocation
  - ***Returns:*** -
- `recordError`:
  - ***Description:*** records an error that occured during function invocation by recording the following Zipkin Annotations:
    - `error`: the error occurred during the function invocation
    - `ClientRecv`: Annotation indicating that the client has received a response
  - ***Parameters:***
    - *traceId:* current traceId
    - *error:* error occurred during the function invocation
  - ***Returns:*** -

> **Note:** The instrumentation is inspired by the Zipkin [`httpClient`](https://github.com/openzipkin/zipkin-js/blob/master/packages/zipkin/src/instrumentation/httpClient.js).

</details>

<br>

:page_facing_up: **[`lambdaFunction.js`](lambdaFunction.js):**

<details><summary>Description</summary>

Internally, the `lambdaClient.js` adjusts the `params` of the lambda function invocation to include relevant trace information. This enables the reference between single spans of different lambda function runs. The adjustment is performed by utilizing the `lambdaFunction.js`, which comprises the following function:

- `appendZipkinHeaderToContext`:
  - ***Description:*** appends the Zipkin `b3` headers for metadata propagation to the `ClientContext` of the Lambda `params` for function invocations. This enables propagating the Zipkin `b3` context to the invoked function. The trace information is stored in the `ClientContext` variable, which results in the `X-Amz-Client-Context` header [[source_1](https://github.com/aws/aws-sdk-js/blob/307e82673b48577fce4389e4ce03f95064e8fe0d/apis/lambda-2015-03-31.normal.json), [source_2](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property)].
  - ***Parameters:***
    - *params:* the original `params`, which are adjusted for context propagation
    - *traceId:* the Zipkin traceID, which contains the context information to be appended to the `params`
  - ***Returns:*** instrumented `params`

> **Note:** The instrumentation is inspired by the Zipkin [`request`](https://github.com/openzipkin/zipkin-js/blob/master/packages/zipkin/src/request.js).

</details>

<br>

> **Note:** In the master thesis, the scripts were encapsulated in a `zipkin-instrumentation-lambda` module and made available using an `index.js` file. The used layer (`zipin_layer_lambda`) can be found [here](../../lambda_resources). Note that the following example will refer to the usage of this very layer.

<a name="anker-usage"></a>
## Usage

After linking the necessary layers ([`zipkin_layer_core`](../../lambda_resources) and [`zipkin_layer_lambda`](../../lambda_resources)), the instrumentation can by used as follows:

```javascript
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const tracerFactory = require('zipkin-tracing-factory');
const wrapLambda = require('zipkin-instrumentation-lambda');

const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const tracer = tracerFactory(process.env.ZIPKIN_ENDPOINT, process.env.SERVICE_NAME);

// wrap the lambda client
const serviceName = process.env.SERVICE_NAME;
const remoteServiceName = 'two_functions_b';
const zipkinLambda = wrapLambda(lambdaClient, { tracer, serviceName, remoteServiceName });

exports.handler = async function (event) {
  const input = {
    FunctionName: '1_function_invocation_b',
    Payload: '{ "value" : 5 }'
  };

  try {
    // use wrapped version of lambda client
    const response = await zipkinLambda(InvokeCommand, input);
    return JSON.parse(Buffer.from(response.Payload));
  } catch (error) {
    console.error(error.message);
  }
};
```

Assuming that the `1_function_invocation_b` function is specified as follows:

```javascript
exports.handler = async function (event) {
  return await event.value * 2;
};
```

Additionally, set the following environment variables:

| Variable | Value | Description |
| -----| -----| ---- |
| `ZIPKIN_ENDPOINT` | <your_host>:9411| Host on which Zipkin Backend is running. |
| `SERVICE_NAME` | e.g., orderService | Name of the current service. |
