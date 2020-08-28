import './bootstrap';
import * as commands from './commands/index';
import {default as chalk} from 'chalk';

const command = process.argv[2] || null;

if (!command) {
  showAvailableCommands();
}

// @ts-ignore
const commandKey: string | undefined = Object.keys(commands).find(
  // @ts-ignore
  (c) => commands[c].command === command,
);

if (!commandKey) {
  showAvailableCommands();
}

//@ts-ignore
const commandInstance = new commands[commandKey]();
commandInstance.run().catch(console.error);

function showAvailableCommands() {
  console.log(chalk.green('Loopback Console'));
  console.log(chalk.green(''));
  console.log(chalk.green('Available Commands'));
  console.log(chalk.green(''));
  for (const c in commands) {
    console.log(
      // @ts-ignore
      ` - ${chalk.green(commands[c].command)}: ${commands[c].description}`,
    );
  }
  console.log('');
  process.exit();
}
