# Lambda instructions

The following contains lambda specific instructions.

## Creating a Lambda Function in Node.js

Create a new npm project using `npm init -y`. Add your function code and install necessary libraries using `npm install ...`.

**Zip the function:**

After the function is created, zip the function and upload it to AWS. In order to be executable, the zip must be of the following structure:

`function.zip`
- `node_modules`
- `index.js`
- `package.json`
- `package-lock`

> **Hint:** Zip the function in the directory itself and explicitly include all relevant files by selecting them.

## Creating a Lambda Layer in Node.js

In order to create a lambda layer in `Node.js`, the following steps have to be performed.

1. Create a folder named `nodejs`
2. Switch to the `nodejs` folder
3. Create a new `Node.js` project with `npm init -y`
4. Add layer functionalities
    - Install libraries with `npm install ...`
    - Create node.js scripts under the `node_modules` folder

**Zip the layer:**

After the layer is created, zip the layer and upload it to AWS. In order to be executable, the zip must be of the following structure:

`nodejs.zip`
- `nodejs`
  - `node_modules`
    - moduleA
    - moduleB
    - myNodeJSScript.js
  - `package.json`
  - `package-lock.json`
