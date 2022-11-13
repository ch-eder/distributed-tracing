# Instrument DynamoDB Operation

The following describes how a lambda function can be instrumented to record a DynamoDB operation.

**Content:**
- [Prerequisites](#anker-prerequisites)
- [Necessary Steps](#anker-necessary_steps)
- [Usage](#anker-usage)

<a name="anker-prerequisites"></a>
## Prerequisites

As with no tracing, the corresponding security roles for enabling function invocation have to be enabled:

- `AmazonDynamoDBFullAccess`

Additionally, to use the AWS SDK v3, the dynamodb client has to be installed in a [lambda layer](../../other/lambda_instructions.md) and linked to the function. The installation can be performed by the following command:

```
npm install --save @aws-sdk/client-dynamodb
```

> **Note:** The layer used in the master thesis (`layer_dynamodb_sdk`) can be found [here](../../../lambda_resources). Note that all following examples will refer to the usage of this very layer.

<a name="anker-necessary_steps"></a>
## Necessary Steps

Since there is no pre-existing instrumented library for capturing lambda function invocations, the instrumentation has to be implemented from scratch. This is done by utilizing the scripts described in the following. To use the scripts, they have to be encapsulated in a [`lambda_layer`](../../other/lambda_instructions.md).

<br>

:page_facing_up: **[`wrapDynamoDB.js`](wrapDynamoDB.js):**

<details><summary>Implementation Details</summary>

This file wraps the original `DynamoDBClient` of the `aws-sdk`, which is responsible for performing DynamoDB operations. As such, tracing is enabled. The file includes the following functions:

- `wrapDynamoDB`:
  - ***Description:*** wraps a [`DynamoDBClient`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/index.html) to be traced with Zipkin and returns a `zipkinDynamoDB` function for performing database operations
  - ***Parameters:***
    - *dynamodb_client:* The [`DynamoDBClient`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/index.html) to be wrapped for tracing
    - *tracer:* Zipkin Tracer to be used for tracing interactions
    - *serviceName (optional):* Name of the current service
    - *remoteServiceName (optional):* Name of the remote servie / database to be called
  - ***Returns:*** `zipkinDynamoDB` function
- `zipkinDynamoDB`:
  - ***Description:*** performs database operations while recording the Request, the Response, and Errors
  - ***Parameters:***
    - *command:* to be executed; has to implement the [`Command`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/classes/command.html) interface of the AWS SDK
  - ***Returns:*** Response from database

> **Note:** The instrumentation is inspired by [`zipkin-instrumentation-request`](https://github.com/openzipkin/zipkin-js/tree/master/packages/zipkin-instrumentation-request) and other pre-existing instrumented libraries.

</details>

<br>

:page_facing_up: **[`dynamodbClient.js`](dynamodbClient.js):**

<details><summary>Implementation Details</summary>

In order to display a transparent picture of the trace, relevant information has to be added. This is done by using the `dynamodbClient.js`. The file includes an Instrumentation class with the following functions:

- `recordRequest`:
  - ***Description:*** records a database request by recording the following Zipkin Annotations:
    - `serviceName`: name of the current service (entered with construction of Instrumentation object)
    - `RPC`: in this case: `dynamodb_operation`
    - `dynamodb.operation`: the type of operation, (e.g., `PutItemCommand`)
    - `dynamodb.table_name`: the name of the table on which operation is performed
    - `ClientSend`: Annotation indicating that client has sent database request
    - `remoteServiceName` (optional): remoteServiceName, if specified during object construction
  - ***Parameters:***
    - *command:* to be recorded; has to implement the [`Command`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/classes/command.html) interface of the AWS SDK
  - ***Returns:*** -
- `recordResponse`:
  - ***Description:*** records database response by recording the following Zipkin Annotations:
    - `http.status_code`: status code of the operation
    - `ClientRecv`: Annotation indicating that the client has received a response from the database
  - ***Parameters:***
    - *traceId:* current traceId
    - *statusCode:* status code of the database operation
  - ***Returns:*** -
- `recordError`:
  - ***Description:*** records an error that occured during database operation by recording the following Zipkin Annotations:
    - `error`: the error occurred during the database operation
    - `ClientRecv`: Annotation indicating that the client has received a response from the database
  - ***Parameters:***
    - *traceId:* current traceId
    - *error:* error occurred during the database operation
  - ***Returns:*** -

> **Note:** The instrumentation is inspired by the Zipkin [`httpClient`](https://github.com/openzipkin/zipkin-js/blob/master/packages/zipkin/src/instrumentation/httpClient.js).

</details>

<br>

> **Note:** In the master thesis, the scripts were encapsulated in a `zipkin-instrumentation-dynamodb` module and made available using an `index.js` file. The used layer (`zipkin_layer_dynamodb`) can be found [here](../../../lambda_resources). Note that the following example will refer to the usage of this very layer.

<a name="anker-usage"></a>
## Usage

After linking the necessary layers ([`zipkin_layer_core`](../../../lambda_resources) and [`zipkin_layer_dynamodb`](../../../lambda_resources)), the instrumentation can be performed as listed in the following details sections:

<details><summary><b>Read Operation</b></summary>

```javascript
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const tracerFactory = require('zipkin-tracing-factory');
const wrapDynamoDB = require('zipkin-instrumentation-dynamodb');

const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });
const tracer = tracerFactory(process.env.ZIPKIN_ENDPOINT, process.env.SERVICE_NAME);

// wrap the dynamoDB client
const serviceName = process.env.SERVICE_NAME;
const remoteServiceName = 'database';
const zipkinDynamoDB = wrapDynamoDB(dynamoDBClient, { tracer, serviceName, remoteServiceName });

exports.handler = async function (event) {
  const input = {
    TableName: 'EvaluationTable',
    Key: {
      Id: { N: '1' }
    }
  };

  const command = new GetItemCommand(input);

  try {
    // use wrapped version of dynamodb client
    const response = await zipkinDynamoDB(command);
    return response.$metadata;
  } catch (error) {
    console.error(error.message);
  }
};
```

</details>

<details><summary><b>Write Operation</b></summary>

```javascript
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const tracerFactory = require('zipkin-tracing-factory');
const wrapDynamoDB = require('zipkin-instrumentation-dynamodb');

const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });
const tracer = tracerFactory(process.env.ZIPKIN_ENDPOINT, process.env.SERVICE_NAME);

// wrap the dynamoDB client
const serviceName = process.env.SERVICE_NAME;
const remoteServiceName = 'database';
const zipkinDynamoDB = wrapDynamoDB(dynamoDBClient, { tracer, serviceName, remoteServiceName });

exports.handler = async function (event) {
  const input = {
    TableName: 'EvaluationTable',
    Item: {
      Id: { N: '1' },
      Value: { S: 'New Item' }
    }
  };

  const command = new PutItemCommand(input);

  try {
    // use wrapped version of dynamodb client
    const response = await zipkinDynamoDB(command);
    return response.$metadata;
  } catch (error) {
    console.error(error.message);
  }
};
```

</details>

> **Note:** The instrumentation capabilities are not restricted on the usage for the [`GetItemCommand`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/classes/getitemcommand.html) (read operation) and the [`PutItemCommand`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/classes/putitemcommand.html) (write operation). Other Commands implementing the [`Command`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/classes/command.html) interface can be traced as well.

Additionally, set the following environment variables:

| Variable | Value | Description |
| -----| -----| ---- |
| `ZIPKIN_ENDPOINT` | <your_host>:9411| Host on which Zipkin Backend is running. |
| `SERVICE_NAME` | e.g., orderService | Name of the current service. |
