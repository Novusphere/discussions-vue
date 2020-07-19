# discussions-vue

This project contains the code base for the https://discussions.app project. It is fully open source and uses blockchain technology to provide a censorship resistant free speech platform.

Posts are written to the blockchain not to a centralized database and are then imported by the watcher (see below) into a local database for querying. This means if multiple parties host their own interface, content will not fragment. Someone who makes a post from interface A will also be making a post visible to interface B and vice-versa. This means even if an interface imposes strict moderation rules/censorship, nothing stops you from starting your own private community without content loss. This is completely different than getting kicked off of Reddit and then when your users move to your platform, they need to use a different interface all together to still read Reddit posts.

Public interfaces should comply with local laws, this means by hosting a public interface you take it upon yourself to comply with said laws. Freedom of speech does not mean lawless content, spam, etc.

Discord: https://discord.gg/PtXzUVr
Twitter: https://twitter.com/thenovusphere

Come chat with us, feedback is appreciated!

## Project setup (interface only)

Install
- nodejs: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
- vscode: [https://code.visualstudio.com/download](https://code.visualstudio.com/download)

```
npm install
npm run serve
```

You should now be able to access the interface on http://localhost:8080/ 

Since you are not self hosting the API, it will use by default the API provided by https://discussions.app

## Project setup (compiled interface + API)

Install
- mongodb: https://www.mongodb.com/try/download/community
- nodejs: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
- vscode: [https://code.visualstudio.com/download](https://code.visualstudio.com/download)

Execute
```
npm install
```

Create `./config/mongo.json`
```
{
	"connection": "mongodb://localhost:27017",
	"database": "discussions"
}
```

Register server API key with [https://www.dfuse.io/](https://www.dfuse.io/)
- **Note**: At some point we will implement EOS support for Hyperion as well

Create `./config/watcher.json`
```
{
	"dfuse": "server_DFUSE_TOKEN"
}
```
Create `./config/server-alpha.json`
- **Note**: If you wish to post from your interface and you're not running via `npm run serve` you must relay your own transactions as you'll be connected to your own API. To do this, you must fill in the `relay` object below.
- `relay.account` is the EOS account doing the transaction relay
- `relay.key` is the private key of the EOS account (active permission)
- `relay.pub` is the public key which to pay fees to. This should be your own wallet public key which you can get from [https://discussions.app/wallet/assets](https://discussions.app/wallet/assets)
- **Optionally** you can create `./config/server-beta.json` as well, with the same format as below.
```
{
    "port": 3007,
    "relay": {
        "account": "",
        "key": "",
        "pub": ""
    }
}
```

**Optionally** Generate the `sitemap.xml` file:
```
npm run sitemap
```
In a new terminal run the watcher and wait for it to catch up to the most recent time. You will know once it's caught up when you see multiple `Idle for...` messages.
```
npm run watcher
```
In a new terminal build the interface and run the server
```
npm run build && npm run server-alpha
```

Once fully synchronized you should see the same `state position = ...` repeated multiple times. At the time of writing this guide, this takes about ~20-30 minutes. It's currently unoptimized.

Now you can visit http://localhost:3007/ which should host the interface and API. You can verify the API is running by checking http://localhost:3007/v1/api/data/test?ping=pong which should look similar to:
```
{"payload":{"ping":"pong","time":1595190481877}}
```

## Commands
  

### Compiles and hot-reloads for development

```

npm run serve

```

  

### Compiles and minifies for production

```

npm run build

```

  

### Runs compiled build for production

```

npm run build && npm run server-alpha

```

  

### Runs compiled build for (server) testing

```

npm run build && npm run server-beta

```

  

### Runs watcher to monitor blockchain actions

```

npm run watcher

```

  

### Runs discord bot

Create `./config/discord.json`
- **Note:** See [https://discord.com/developers/docs/intro](https://discord.com/developers/docs/intro) for creating bot token
```
{
	"token": "DISCORD_BOT_TOKEN",
	"lastPostTime": 0,
	"ignoreTags": [
		"test"
	],
	"channel": "discussions"
}
```
Execute

```

npm run discord-bot

```

  

### Lints and fixes files

```

npm run lint

```

  

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).