We are trying to merge two branches and are hitting simple merge conflicts.

Look at files that failed to merge:

1. Look at the merge conflict files and put them in your TODO.
2. Read each merge conflict file, look at the conflict, and make a hypothesis on why it failed. If the fix seems simple enough, go ahead and make it. If you think there is some ambiguity on how it should be resolved, gather it as a quesiton to the user.
2. For generated files like uv.lock, package-json.lock, or .coverage simply ignore them, we'll regenerate them when we are done with the rest of the files
3. If you've looked at a few files and have open questions, ask the questions to the user.
4. Repeat until done.

Now that all the conflicts have been solved, remake all the generated files.