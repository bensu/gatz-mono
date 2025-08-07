You were just working on a task. Help me check your work actually accomplishes the goal we set out to accomplish. If necessary, re-read the task's description.

I am not interested in running tests. I am not interested in running anything that is fake or has mocks. I want to run the code as it would work in production. 

To test backend changes, you are going to make one QA script that I can run with one command. This script should excercise the code in an environment as real as possible. Put the script in a file and make it executable so that I can run it in the terminal with one line.

Guidelines for the script:

- For example, if we are working on an HTTP server, this can be a bash script with curl that hits the right endpoints.
- If we are working with some internal Python or TypeScript functions, then call those functions directly with real data to see what they do.
- If we are working on something that touches the database, include SQL commands that read the DB state to verify that everything looks as expected.
- Only print data that is coming from a real source
- When printing the data, tell me what I should look for to verify that everything is working according to plan
- Keep the print output constrained to (a) the operation that was run, (b) the data that we need to check, and (c) what to check on it
- Don't include summaries or other long descriptions

For UI changes, you could say:

```md
To check this task was completed, folow these steps:

1. Start the server `uv run python -m shelp.cli http serve`
2. Start the frontend server `npm start`
3. Navigate to http://localhost:8081/tasks
4. Press on "Create new task"
5. Complete the form
6. Submit it

You should now see the create task in the task table view.
```