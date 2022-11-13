# A Comparison of Distributed Tracing Tools in Serverless Applications

*This is the repository accompanying the master thesis "A comparison of distributed tracing tools in serverless applications". This work aims to compare distributed tracing tools in serverless applications and evaluate the challenges and potentials of using distributed tracing to determine coverage criteria for integration tests. The repository contains information about utilized microbenchmarks, as well as documentation for integrating selected tracing tools in serverless applications. Based on obtained results, one tracing tool was selected for determining the test coverage in serverless applications. For details on the latter aspect, please refer to the dedicated repository [serverless-test-coverage](https://github.com/ch-eder/serverless-test-coverage)*

**Content:**

- [Microbenchmarks](#anker-microbenchmarks)
- [Instrumentation using Distributed Tracing](#distributed_tracing_tools)

<a name="anker-microbenchmarks"></a>
## Microbenchmarks

In total, five different Microbenchmarks are used to evaluate the distributed tracing tools. The Microbenchmarks are described in the following:

<details><summary><b>Lambda Function Invokation</b></summary>

The first microbenchmark comprises a simple function invocation.

<img src="../resources/microbenchmark_1.svg" width="350" title="Microbenchmark 1" alt="Microbenchmark 1">

<br>

**Prerequisites:**

 In order to allow a lambda function to invoke another function, the following security roles have to be enabled:

- `AWSLambdaBasicExecutionRole`
- `AWSLambdaExecute`
- `AWSLambdaRole`

A lambda function can then invoke another lambda function by using the AWS SDK. Since the AWS SDK v3 is used for this purpose, the SDK has to be installed in a [lambda layer](other/lambda_instructions.md) and linked to the function. The installation can be performed by using the following command:

```
npm install --save @aws-sdk/client-lambda
```

> **Note:** The layer used in the master thesis (`layer_lambda_sdk`) can be found [here](../lambda_resources). Note that all following examples will refer to the usage of this very layer.

**Implementation:**

Now, assume there is a lambda function that doubles a given value:

```javascript
exports.handler = async function (event) {
  return await event.value * 2;
};
```

The function can then be invoked using the following code:

```javascript
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const lambdaClient = new LambdaClient({ region: 'us-east-1' });

exports.handler = async function (event) {
  const input = {
    FunctionName: '1_function_invocation_b',
    Payload: '{ "value" : 5 }'
  };

  const command = new InvokeCommand(input);

  try {
    const response = await lambdaClient.send(command);
    return JSON.parse(Buffer.from(response.Payload));
  } catch (error) {
    console.error(error.message);
  }
};
```

</details>

<details><summary><b>HTTP GET Request</b></summary>

The second microbenchmark is embodied by performing an HTTP GET request using the module `axios`.

<img src="../resources/microbenchmark_2.svg" width="350" title="Microbenchmark 2" alt="Microbenchmark 2">

<br>

**Prerequisites:**

In order to be able to use `axios`, the module has to be installed in a [lambda layer](other/lambda_instructions.md) and linked to the function. The installation can be performed by using the following command:

```
npm install --save axios
```

> **Note:** The layer used in the master thesis (`layer_axios`) can be found [here](../lambda_resources). Note that all following examples will refer to the usage of this very layer.

**Implementation:**

The HTTP GET request can then be performed by using the following code:

```javascript
const axios = require('axios');

exports.handler = async function (event) {
  try {
    const response = await axios.get('https://example.com/users/2');
    return response.data;
  } catch (error) {
    console.error(error.message);
  }
};
```

> **Note:** The received payload has a size of 280 bytes.

</details>

<details><summary><b>HTTP POST Request</b></summary>

The third microbenchmark is embodied by performing an HTTP POST request using the module `axios`.

<img src="../resources/microbenchmark_3.svg" width="350" title="Microbenchmark 3" alt="Microbenchmark 3">

<br>

**Prerequisites:**

In order to be able to use `axios`, the module has to be installed in a [lambda layer](other/lambda_instructions.md) and linked to the function. The installation can be performed by using the following command:

```
npm install --save axios
```

> **Note:** The layer used in the master thesis (`layer_axios`) can be found [here](../lambda_resources). Note that all following examples will refer to the usage of this very layer.

**Implementation:**

The HTTP POST request can then be performed by using the following code:

```javascript
const axios = require('axios');

exports.handler = async function (event) {
  try {
    const data = {
      first_name: 'Mats',
      last_name: 'Winter',
      email: 'mats.winter@example.com',
      job: 'Backend Developer'
    };

    const response = await axios.post('https://example.com/users', data);
    return response.data;
  } catch (error) {
    console.error(error.message);
  }
};
```

> **Note:** The sent payload has a size of 102 bytes.

</details>

<details><summary><b>DynamoDB Read Operation</b></summary>

The fourth microbenchmark comprises a DynamoDB read operation.

<img src="../resources/microbenchmark_4.svg" width="350" title="Microbenchmark 4" alt="Microbenchmark 4">

<br>

**Prerequisites:**

 In order to allow a lambda function to perform a DynamoDB read operation, the following security role has to be enabled:

- `AmazonDynamoDBReadOnlyAccess` / `AmazonDynamoDBFullAccess`

A lambda function can perform a DynamoDB operation using the AWS SDK. Since the AWS SDK v3 is used for this purpose, the SDK has to be installed in a [lambda layer](other/lambda_instructions.md) and linked to the function. The installation can be performed by using the following command:

```
npm install --save @aws-sdk/client-dynamodb
```

> **Note:** The layer used in the master thesis (`layer_dynamodb_sdk`) can be found [here](../lambda_resources). Note that all following examples will refer to the usage of this very layer.

**Implementation:**

The DynamoDB read operation can then be performed by using the following code:

```javascript
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });

exports.handler = async function (event) {
  const input = {
    TableName: 'EvaluationTable',
    Key: {
      Id: { N: '1' }
    }
  };

  const command = new GetItemCommand(input);

  try {
    const response = await dynamoDBClient.send(command);
    return response.Item;
  } catch (error) {
    console.error(error.message);
  }
};
```

> **Note:** To successfully test the function, ensure that the specified item exists in the database.

</details>

<details><summary><b>DynamoDB Write Operation</b></summary>

Finally, the last microbenchmark is a DynamoDB write operation.

<img src="../resources/microbenchmark_5.svg" width="350" title="Microbenchmark 5" alt="Microbenchmark 5">

<br>

**Prerequisites:**

The prerequisites of performing a DynamoDB write operation are similar to the prerequisites of performing a DynamoDB read operation:

In order to allow a lambda function to perform a DynamoDB write operation, the following security role has to be enabled:

- `AmazonDynamoDBFullAccess`

A lambda function can perform a DynamoDB operation using the AWS SDK. Since the AWS SDK v3 is used for this purpose, the SDK has to be installed in a [lambda layer](other/lambda_instructions.md) and linked to the function. The installation can be performed by using the following command:

```
npm install --save @aws-sdk/client-dynamodb
```

> **Note:** The layer used in the master thesis (`layer_dynamodb_sdk`) can be found [here](../lambda_resources). Note that all following examples will refer to the usage of this very layer.

**Implementation:**

The DynamoDB write operation can then be performed by using the following code:

```javascript
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });

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
    const response = await dynamoDBClient.send(command);
    return response.$metadata;
  } catch (error) {
    console.error(error.message);
  }
};
```

</details>

<a name="anker-distributed_tracing_tools"></a>
## Instrumentation using Distributed Tracing

Different Distributed Tracing Tools were used to instrument the Microbenchmarks:

- [Zipkin](Zipkin/README.md)
- [Jaeger](Jaeger/README.md)
- [SigNoz](SigNoz/README.md)
- [Apache SkyWalking](SkyWalking/README.md)
