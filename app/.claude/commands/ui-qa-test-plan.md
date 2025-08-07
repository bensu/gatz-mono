You are an expert in TypeScript, React, Expo, and QA testing methodologies for mobile and web applications. Given a React component file, you analyze the code to identify all user-facing features and interactions that require manual QA testing, then generate comprehensive test cases in CSV format.

QA test case generation helps ensure that every user interaction, edge case, and feature behavior is properly validated by human testers after code changes. This prevents regressions and ensures quality user experiences.

You focus on identifying:
- User interactions (taps, long presses, swipes, text input)
- Conditional UI states and rendering paths  
- Error handling and edge cases
- Navigation flows and state changes
- Accessibility features
- Platform-specific behaviors

We have a series of steps for you to follow. Each step consists of two prompts:

action-prompt: executes the step
check-prompt: helps you check if the action-prompt succeeded

Execute each of the action-prompts separately and then check your work with the corresponding check-prompt. If the check-prompt fails but you see a clear way to fix it, then make a fix plan and execute that.

<analyze-component-structure>
<action-prompt>
Read through COMPONENT_FILE and identify all the key structural elements that affect user experience:

1. User Interactions: Find all onPress, onLongPress, onChangeText, onSwipe, and other user event handlers
2. Conditional Rendering: Identify all conditional logic that shows/hides UI elements based on props or state
3. Navigation: Look for any navigation calls (router.push, navigation.navigate, etc.)
4. State Changes: Find useState, useEffect, and other state management that affects UI
5. Error Handling: Identify try/catch blocks, error states, and fallback UI
6. Props and Configuration: Note important props that change component behavior
7. Platform Differences: Look for Platform.OS checks or platform-specific code

Create a structured analysis in a temporary file `tmp/component-analysis.txt` with sections for each category above. Include line numbers and brief descriptions.

For each interaction or behavior, also note:
- The trigger (what user action causes it)
- The expected outcome (what should happen)
- Any dependencies (props, state, or conditions required)

This analysis will form the foundation for generating test cases.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you identify all user interactions in the component?
2. Did you find all conditional rendering logic?
3. Did you note navigation flows and state changes?
4. Did you identify error handling scenarios?
5. Did you create the analysis file with line numbers and descriptions?
</check-prompt>
</analyze-component-structure>

<identify-test-scenarios>
<action-prompt>
Based on the component analysis, identify all the distinct test scenarios that need QA validation. Put all the test scenarios in your TODO list.

For each scenario, determine:

1. Happy Path Tests: Normal user flows that should work as expected
2. Edge Case Tests: Boundary conditions, empty states, maximum values
3. Error Path Tests: What happens when things go wrong (network errors, invalid input)
4. State Transition Tests: Moving between different UI states
5. Accessibility Tests: Screen reader support, keyboard navigation
6. Platform Tests: iOS vs Android differences if applicable

Match each scenario to existing slug annotations in COMPONENT_FILE where possible. If a scenario doesn't have a corresponding slug, create a new meaningful slug with the format [feature-action-context].

Create a test scenario inventory in `tmp/test-scenarios.txt` organized by category:

```
HAPPY PATH SCENARIOS:
[message-send] - User sends a text message
[message-edit] - User edits their own message
[message-delete] - User deletes their own message

EDGE CASE SCENARIOS:  
[message-send-empty] - User tries to send empty message
[message-send-max-length] - User sends message at character limit

ERROR PATH SCENARIOS:
[message-send-network-error] - Message sending fails due to network
[message-edit-permission-error] - User tries to edit someone else's message
...
```

For each scenario, also note the setup requirements and key validation points.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Did you identify happy path scenarios for all major features?
- Did you find edge cases and boundary conditions?
- Did you identify error handling scenarios?
- Did you match scenarios to existing slugs where possible?
- Did you create meaningful new slugs for unmatched scenarios?
- Did you organize scenarios by category in the inventory file?
</check-prompt>
</identify-test-scenarios>

<create-detailed-test-steps>
<action-prompt>
Load the list of scenarios from `tmp/test-scenarios.txt` into your TODO list. For each test scenario identified, create detailed step-by-step testing instructions that a human QA tester can follow. Use this format:

Test Name: Clear, descriptive name that includes the main action
Steps: Numbered list of exact actions the tester should take
Expected Result: What should happen after completing all steps

Focus on being specific and actionable:
- Use exact UI element names from the component
- Include specific gestures (tap, long press, swipe direction)
- Specify expected visual feedback, animations, or state changes
- Include validation of text content, button states, navigation
- Note any platform-specific behaviors to test

Example format:
```
[message-flagging] - Message can be flagged successfully
Steps:
1. Navigate to a chat with messages
2. Long press on any message you didn't send
3. Tap "Flag" from the context menu
4. Verify alert appears with text "Are you sure you want to flag this message?"
5. Tap "Yes"
Expected: Message disappears from chat, success toast appears

[message-flagging-cancel] - Message flagging can be cancelled  
Steps:
1. Navigate to a chat with messages
2. Long press on any message you didn't send
3. Tap "Flag" from the context menu
4. Verify alert appears with text "Are you sure you want to flag this message?"
5. Tap "No"
Expected: Alert dismisses, message remains visible, no changes to chat
```

Write all test cases to `tmp/detailed-test-cases.txt`.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Did you create detailed test steps for each scenario?
- Are the steps specific and actionable for a human tester?
- Did you include expected results for each test case?
- Did you cover both positive and negative test cases?
</check-prompt>
</create-detailed-test-steps>

<generate-csv-output>
<action-prompt>
Convert the detailed test cases into the requested CSV format with columns: slug, name, steps to test.

Read the test cases from `tmp/detailed-test-cases.txt` and load them into a TODO list. Create a properly formatted CSV file at `qa-test-cases.csv`.

Format requirements:
- `slug`: The slug identifier in brackets, e.g., [message-flagging]
- `name`: Concise but descriptive test name
- `step to test`: One of the steps to test

Repeat the `slug` and `name` as many times as needed so that all the `steps to test` have their own row. Add an empty row between each of the different slugs.

Example CSV rows:
```csv
slug,name,step to test
[message-flagging],Messages can be flagged,"1. Long press on a message",
[message-flagging],Messages can be flagged,"2. Tap Flag, 3. Check for Alert with Sure?"
[message-flagging],Messages can be flagged,"3. Check for Alert with Sure?"
[message-flagging],Messages can be flagged,"4. Press Yes", 
[message-flagging],Messages can be flagged,"Expected: Message disappears"

[message-flagging-cancel],Message flagging can be cancelled,"1. Long press on a message"
[message-flagging-cancel],Message flagging can be cancelled,"2. Tap Flag"
[message-flagging-cancel],Message flagging can be cancelled,"3. Check for Alert with ""Sure?"
[message-flagging-cancel],Message flagging can be cancelled,"4. Press No", 
[message-flagging-cancel],Message flagging can be cancelled,"Expected: Message doesn't disappear"
```

Ensure proper CSV escaping for quotes and commas within the test steps. Include a header row.

Group related test cases together (e.g., all message-related tests, then navigation tests, etc.) for better organization in the spreadsheet.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Did you create a properly formatted CSV file?
- Does the CSV include the header row with correct column names?
- Are all test cases converted to the specified format?
- Did you properly escape quotes and commas in the CSV?
- Are related test cases grouped together?
- Can the CSV be opened in a spreadsheet application?
</check-prompt>
</generate-csv-output>

<review-and-validate>
<action-prompt>
Review the generated CSV file to ensure completeness and quality:

1. **Coverage Check**: Compare against the original component analysis to ensure all major features have test cases
2. **Quality Check**: Verify that test steps are clear, specific, and actionable
3. **Consistency Check**: Ensure slug naming follows a consistent pattern
4. **Completeness Check**: Verify both positive and negative test cases are included
5. **Edge Case Check**: Confirm edge cases and error scenarios are covered

Read through `qa-test-cases.csv` and identify any gaps or issues:

- Missing test scenarios for important features
- Unclear or ambiguous test steps  
- Inconsistent slug naming
- Missing edge cases or error scenarios
- Steps that are too vague for a tester to follow

Create a quality assessment in `tmp/qa-review.txt` noting:
- Total number of test cases generated
- Coverage of major component features
- Any identified gaps or recommendations
- Suggestions for additional test cases if needed

If significant gaps are found, add the missing test cases to the CSV file.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Did you review the CSV for completeness against the component features?
- Are all test steps clear and actionable?
- Is the slug naming consistent throughout?
- Did you verify both positive and negative test cases are included?
- Did you identify and address any significant gaps?
- Did you create a quality assessment documenting the review?
</check-prompt>
</review-and-validate>

Guidelines:

- If you fail with the check-prompt multiple times, then stop and ask the user for help.
- The user will give you a COMPONENT_FILE. Focus your analysis on that single file.
- Prioritize user-facing functionality over internal implementation details.
- Write test cases from the perspective of an end user, not a developer.
- Include accessibility testing where relevant (screen readers, keyboard navigation).
- Consider platform differences (iOS vs Android) where the component handles them.
- Focus on realistic user scenarios rather than contrived edge cases.
- If some functionality is not testable through UI interactions, document this clearly.

If it is ever not clear what to do next or what a command means, first re-read this file, `.claude/commands/qa-test-generator.md`. If that doesn't work, ask the user for help.

When you first get started ask the user for the COMPONENT_FILE they want you to analyze for QA test case generation.