# gatz

This is the backend for a chat app.

To start the app:

1. Create a new `secrets.env` file
2. Run `bb generate-secrets` and paste the output into `secrets.env`
3. Run `bb dev`

# Architecture

Main concepts:

- Users
- Groups of Users
  - Don't assume they are few and long-standing. Groups are formed constantly and forgotten quickly
  - O(100) not O(1M)
  - If O(1M) ever happens, it would need a different UI and imply different trade-offs
- Discussions
  - belong to one Group
  - Many of them, often short-lived
  - This is the unit at which you read messages
- Messages
  - They belong to a Discussion

User operations

- user-by-id
- user-by-name
  - unique-by-name
- users-for-discussion

Discussions

- discussion-by-id
- discussions-by-user-id

Messages

- message-by-id
  - maybe not!
- messages-by-discussion
- messages-by-user?
  - you only need the latest messages for each discussion to render a preview
- message to users

  - redirect every message to the users that are listening to it

- search?

Sharding

The natural storage shard seems to be Discussion:

- Discussions can't be shared by user because there is no natural partition because the users are very connected
- You need to get all the discussion's messages at once, and you
- You mostly interact with one discussion at a time
- Shard failure

  - _It is fine if certain discussions are slower than others or they are not available_
  - For any given user, it is better to have some discussions broken that everything

- You want the message id to include the discussions's shard in it
- But the discussion can be sharded by the user that originally created
  - You are hoping that the user that created it will be more active and (if the rebalancing of users was true), their shard
- The problem with this is that some users might be massively more active than others in creating discussions, unbalancing the shards.
  - But also, by the time you are as big as WhatsApp (and sharding matters), there is nobody that can send enough messages (without an API) to unbalance the shards.

## Users

Sharded by their own key.

Is it worth trying to shard similar users together? Ideally, you want to do this such that:

1. Users that chat together, stay together. That way you minimize the number of hops that a transaction has to make
2. The shards are still balanced. You accept that in many cases, people are going to be caught in between shards.

There is probably some well-researched algorithms to do this. Sometimes you can use proxies like their country or ip.
Ideally you can also _rebalance_ users after seeing their pattern of use. But if that means changing their id, then you are screwed! You can then shard them by their sharding key, which starts being exactly their id. Does it make sense to change users shard?
Rebalancing seems super complicated and something better left to the computer.

Groups are sharded by the key of their maker. That way, the maker can edit it directly.

When somebody else becomes the admin, they have to reach a different shard.

Message to users

There is one server per user (same as the shard), reaching into the other shards.

Each server maps to a user shard and to a discussion shard.

You can shard discussions first at the database layer, and later at the server level, etc.

User changes can also be modeled via events but it is not strictly necessary. The number of edits is smaller, and many of them are update on field (e.g. bio if that is a thing)

## Discussions

Sharded by their own key.

There are some edits to the discussion object themselves:

- Name and description can change
- Can you add people? Yes, you can add people from the group.
- Moderator behavior, lots of stuff

## Messages

You want everything message related to be event driven:

- new-message
- edit-message
- delete-message
- react-to-message

are all events that play in a Kafka-like log, sharded by discussion (and thus order is preserved), and which can be played back.

The "message state" is simply derived from playing back the message. The log makes it very easy to replicate the events to all the consumers without having to think about ordering or anything.

# Offline mode and message storage

Storing all the messages is a lot of costs, which is why WhatsApp and Signal don't do it. If you are doing search via ES, then you have to support it. (But I would charge separately for that)

Otherwise, you need a backup system and a way to reboot the state based on the backup. What should the mechanism of that be? All the events together is a fine one.

Images as are content hashed and addressed from the events.

## Costs

At scale, the costs are SMS, file transfer, and servers. You can reduce SMS by depending on other verification methods?
