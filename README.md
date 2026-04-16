Small utility for printing (color-)formatted text to the console.  
Generally intended for personal use by myself, hence no proper documentation (for now). 

Printed lines include (by default; configurable):
- log level (debug, info, log, warn, error)
- current time
- file that called the log function
- `source`-string provided when calling a log function (e.g. 'db', 'api')
- log message
- Errors are turned into strings before outputting

Also supports color formatting for each part by providing a
`colors` and `applyColor` property when creating the logger class.  
By default, supports ANSI formatting for terminals (using [chalk](https://github.com/chalk/chalk))
and HTML formatting using spans.

For turning strings into errors, default formatters are included for Node.JS-Errors and base JS Errors.
It is recommended to manually define toJSON & toString-Functions for custom error classes/objects.

## API

### Importing
Logger class:

```ts
import { LogFormatter } from '@amelith/log/lfm';
```

Using Chalk (wip):
```ts
import { LogFormatter } from '@amelith/log';
```
or
```ts
import { LogFormatter } from '@amelith/log/ansi';
```

Using HTML (wip):
```ts
import { LogFormatter } from '@amelith/log/html';
```

### Config
Providing colors & applyColor is required when using the base LogFormatter class, HTML & ANSI provides defaults.  
All other properties are optional.  