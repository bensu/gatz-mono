You are an expert in TypeScript, jest, and unit testing TypeScript logic and functions. Given a file with TypeScript functions and logic, you implement all the necessary unit tests to make sure they don't regress.

You almost never change the business logic itself, except for:

- mark certain functions or values safe for export
- add test identifiers or logging to functions if needed for testing

We have a series of steps for you to follow. Each consists of two prompts:

- action-prompt: executes the step
- check-prompt: helps you check if the action-prompt succeeded

Execute each of the action-prompts separately and then check your work with the corresponding check-prompt. If the check-prompt fails but you see a clear way to fix it, then make a fix plan and execute that.

Guidelines:

- If you fail with the check-prompt multiple times, then stop and ask the user for help.
- The user will give you a TEST_FILE and a LOGIC_FILE. Try to only keep your work to those two.

Here are the steps in order:

<identify-invariants>
<action-prompt>
LOGIC_FILE exposes a number of functions to other modules.

Identify which are those functions are exported. Then, read through each of the exported functions and add them to your TODO. 

For each of them make notes of the functionality they provide. If there are any invariants that they are keeping, take note of those as well.

Then write a long comment and add it in the LOGIC_FILE before each function signature to explain what you found about each of these functions. For each property or invariant you find, name it with a slug like [keeps-sorted] and put that at the beginning of the description.

A function signature should look like this when you are done with it:

```js
/**
 * Main data processing function that validates and transforms input data.
 * 
 * This function serves as the primary entry point for data transformation,
 * applying validation rules and converting data to the expected output format.
 * 
 * Key functionality and invariants:
 * - [input-validation] Validates all input parameters before processing
 * - [data-transformation] Transforms input data to standardized output format
 * - [error-handling] Returns consistent error objects for invalid inputs
 * - [immutability] Does not modify input parameters, returns new objects
 * 
 * This pattern provides:
 * - Consistent data validation across the application
 * - Standardized error handling for data processing failures
 * - Predictable output format for downstream consumers
 * 
 * The validation includes:
 * - Type checking for all required fields
 * - Range validation for numeric values
 * - Format validation for string patterns
 * 
 * Used by multiple modules as the primary data processing pipeline,
 * ensuring consistent behavior across different entry points.
 * 
 * @param data - Input data object to be processed
 * @param options - Processing options and configuration
 * @returns Processed data object or error result
 */
export const processData = (data: InputData, options: ProcessingOptions) => {
```

Do this with comments, no need to write code yet.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you find a series of exported functions in LOGIC_FILE that can be tested?
2. Did you write comments in LOGIC_FILE explaining each of the properties or invariants the slugs refer to?
3. Do the comments have slugs like [keeps-sorted]?
4. Did you only add comments? You shouldn't have changed the code's functionality.

No need to read the files themselves, you can check by looking at your own output in the context.
</check-prompt>
</identify-invariants>


<annotate-expressions>
<action-prompt>
Now, add all the invariant slugs you created into your TODO.

For each slug in the function descriptions, read the function implementation and identify the most important expressions that keeps that property or invariant.

Annotate those expressions with the relevant slug in a comment. Only use the slug, no need to include the entire property description. If multiple slugs are appropriate, include them each of them.

If it seems more idiomatic to put it in a previous line, do so. For example:

          // [input-validation]
          if (!data || typeof data !== 'object') {
            return { error: 'Invalid input data' };
          }

If instead it seems more idiomatic to put it at the end of the line, do that. For example:

      const result = transformData(validatedInput); // [data-transformation]
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you find the spots in the codebase for each of the slugs?
2. Did you add the appropriate slug annotations?

No need to read the files themselves, you can check by looking at your own output in the context.

If you are missing any slugs, repeat the last step, <annotate-expression:action-prompt>, on the slugs that you are missing.
</check-prompt>
</annotate-expressions>


<create-test-plan>
<action-prompt>
Now load each of the functions with descriptions into your TODO. For each function description, write a test plan in the TEST_FILE that includes:

1. The happy path to be tested
2. Edge cases to be tested
3. Tests for the properties and invariants for each of the slugs

Do not write the tests themselves but rather, descriptions of what you'd want each of the tests to check for in comments in the TEST_FILE.

Like before, prepend the test descriptions which the slug of the property or invariant that the test is tracking.

Do this with comments, no need to write code yet.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you write a test plan for each of the functions that you previously identified?
2. Did you put that test plan in TEST_FILE?
3. Did you cover a happy path, edge cases, and the slug invariants for each of the functions?

No need to read the files themselves, you can check by looking at your own output in the context.

If you are missing any of these, repeat the last step, <annotate-expression:create-test-plan>, on the functions you are missing.
</check-prompt>
</create-test-plan>

<write-each-test>
<action-prompt>
Load each of the test descriptions in TEST_FILE in your TODO list.

For each test description, write the accompanying tests right below the test description. Include the slug of the property or invariant that it is testing in the tests description.

Here is an example of the actual unit test below its corresponding test description:

```tsx
/**
 * [input-validation] Tests for input validation
 * 
 * Happy Path:
 * - Valid input data should pass validation
 * - Function should accept well-formed objects
 * - Required fields should be properly validated
 * 
 * Edge Cases:
 * - Null or undefined input should be rejected
 * - Empty objects should be handled appropriately
 * - Invalid data types should return error
 * 
 * TODO: Implement explicit tests for input validation
 */
describe('[input-validation] Input validation', () => {
  it('should accept valid input data', () => {
    const validInput = {
      id: 'test-123',
      name: 'Test Item',
      value: 42
    };
    
    const result = processData(validInput, { strict: true });
    
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it('should reject null or undefined input', () => {
    const result1 = processData(null as any, { strict: true });
    const result2 = processData(undefined as any, { strict: true });
    
    expect(result1.error).toBe('Invalid input data');
    expect(result2.error).toBe('Invalid input data');
  });

  it('should reject invalid data types', () => {
    const invalidInputs = [
      'string',
      123,
      [],
      true
    ];
    
    invalidInputs.forEach(input => {
      const result = processData(input as any, { strict: true });
      expect(result.error).toBe('Invalid input data');
    });
  });
});
```

After writing each test, run it and see if it is working properly with:

yarn test TEST_FILE -- -t "name of the test" 

Fix that test before you move into the next one. You can't check off a test from the TODO list if the test doesn't pass.

Repeat this action-prompt for each of the unit tests descriptions.

You can now write TypeScript logic for the tests in TEST_FILE but avoid writing in the LOGIC_FILE. You can freely change LOGIC_FILE to:

- mark certain functions or values safe for export
- add test identifiers or logging to functions if needed for testing
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you write tests for each of the items described by the test plan?
2. Did the tests pass?

If you are missing any parts of the test plan, repeat the last step, <write-each-test:action-prompt>, on the parts that you are missing.
</check-prompt>
</write-each-test>


If it is ever not clear what to do next or what a command means, first re-read this file, `.claude/commands/logic-unit-tester.md`. If that doesn't work, ask the user for help.

When you first get started ask the user for the TEST_FILE and LOGIC_FILE they want you to work on.