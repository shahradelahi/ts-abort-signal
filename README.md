# abort-signal

[![CI](https://github.com/shahradelahi/ts-abort-signal/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/shahradelahi/ts-abort-signal/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/abort-signal.svg)](https://www.npmjs.com/package/abort-signal)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](/LICENSE)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/abort-signal)
[![Install Size](https://packagephobia.com/badge?p=abort-signal)](https://packagephobia.com/result?p=abort-signal)

_abort-signal_ is a utility library for working with `AbortSignal` in JavaScript and TypeScript. It provides a modern, intuitive API to simplify common cancellation and timeout patterns.

---

- [Installation](#-installation)
- [Usage](#-usage)
  - [Timeout](#timeout)
  - [Combining Signals](#combining-signals)
  - [From an Event](#from-an-event)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#license)

## 📦 Installation

```bash
pnpm install abort-signal
```

<details>
<summary>Install using your favorite package manager</summary>

**npm**

```bash
npm install abort-signal
```

**yarn**

```bash
yarn add abort-signal
```

</details>

## 📖 Usage

### Timeout

The most common use case: aborting an operation if it takes too long.

```typescript
try {
  // Request will fail if it takes longer than 3 seconds.
  const response = await fetch(url, { signal: Abort.timeout(3000) });
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Request timed out!');
  }
}
```

### Combining Signals

Abort an operation from one of several sources, like a timeout OR a user click.

```typescript
const userClickSignal = Abort.fromEvent(cancelButton, 'click');
const timeoutSignal = Abort.timeout(10000);

// Aborts on user click OR timeout, whichever comes first.
const combinedSignal = Abort.any([userClickSignal, timeoutSignal]);
await longRunningOperation({ signal: combinedSignal });
```

### From an Event

Bridge the DOM/event world with the cancellation world.

```typescript
// Signal will abort as soon as the user navigates away or closes the tab.
const signal = Abort.fromEvent(window, 'unload');
await saveDraftToServer({ signal });
```

## 📚 Documentation

For detailed API documentation on all methods, please see [the API docs](https://www.jsdocs.io/package/abort-signal).

## 🤝 Contributing

Want to contribute? Awesome! To show your support is to star the project, or to raise issues on [GitHub](https://github.com/shahradelahi/ts-abort-signal).

Thanks again for your support, it is much appreciated! 🙏

## License

[MIT](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/ts-abort-signal/graphs/contributors).
