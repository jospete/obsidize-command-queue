# @obsidize/command-queue

A stupidly simple async queue.

Designed primarily to guard single-entry-point interfaces from being bombarded with calls from 
independent sources (e.g. multiple angular components hitting a single cordova API at once).

## Installation

- npm:

```bash
npm install --save @obsidize/command-queue
```

## Usage

```typescript
import {CommandQueue} from '@obsidize/command-queue';

const queue = new CommandQueue();
const result = await queue.add(() => doSomePromiseStuff());

const resultList = await Promise.all([1, 2, 3, 4, 5].map(v => {
	return queue.add(() => doSomePromiseStuffSerially(v));	
}));

// If the result is a deferred Observable
const observable = queue.observe(() => generatedDeferredObservable());
```