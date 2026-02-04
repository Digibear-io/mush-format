import chalk from 'chalk';

/**
 * Modern, accessible color utilities for mform CLI
 */

// Brand colors
export const brand = {
  primary: chalk.hex('#9D4EDD'),      // Rich purple
  secondary: chalk.hex('#3C096C'),    // Deep purple
  accent: chalk.hex('#7209B7'),       // Vibrant purple
  success: chalk.hex('#06FFA5'),      // Bright green
  warning: chalk.hex('#FFB627'),      // Warm yellow
  error: chalk.hex('#FF006E'),        // Vibrant pink/red
  info: chalk.hex('#4CC9F0'),         // Cyan blue
  muted: chalk.gray,
  dim: chalk.dim,
};

// Semantic colors for different message types
export const log = {
  // Success messages
  success: (msg: string) => console.log(brand.success('✓ ') + chalk.white(msg)),
  
  // Error messages
  error: (msg: string) => console.error(brand.error('✗ ') + chalk.white(msg)),
  
  // Warning messages
  warning: (msg: string) => console.warn(brand.warning('⚠ ') + chalk.white(msg)),
  
  // Info messages
  info: (msg: string) => console.log(brand.info('ℹ ') + chalk.white(msg)),
  
  // Step/progress messages
  step: (msg: string) => console.log(brand.primary('▸ ') + chalk.white(msg)),
  
  // Subsection/detail messages
  detail: (msg: string) => console.log('  ' + brand.muted('→ ') + chalk.gray(msg)),
  
  // Highlighted messages
  highlight: (msg: string) => console.log(brand.accent('★ ') + chalk.bold.white(msg)),
  
  // Section headers
  section: (msg: string) => {
    console.log('');
    console.log(brand.primary.bold('═'.repeat(50)));
    console.log(brand.primary.bold(`  ${msg}`));
    console.log(brand.primary.bold('═'.repeat(50)));
  },
  
  // Subsection headers
  subsection: (msg: string) => {
    console.log('');
    console.log(brand.secondary('─'.repeat(40)));
    console.log(brand.secondary(`  ${msg}`));
    console.log(brand.secondary('─'.repeat(40)));
  },
};

// Formatters for inline text styling
export const fmt = {
  // File paths
  path: (path: string) => brand.info(path),
  
  // File names
  file: (name: string) => brand.accent.bold(name),
  
  // Numbers/counts
  number: (num: number | string) => brand.primary.bold(String(num)),
  
  // Commands
  command: (cmd: string) => chalk.cyan(`\`${cmd}\``),
  
  // Keys/config values
  key: (key: string) => brand.warning(key),
  
  // Status indicators
  status: {
    passed: () => brand.success('PASSED'),
    failed: () => brand.error('FAILED'),
    pending: () => brand.warning('PENDING'),
    running: () => brand.info('RUNNING'),
  },
  
  // Code/technical terms
  code: (code: string) => chalk.magenta(code),
  
  // URLs
  url: (url: string) => chalk.underline.cyan(url),
  
  // Emphasis
  bold: (text: string) => chalk.bold.white(text),
  dim: (text: string) => chalk.dim(text),
  
  // Label with value
  label: (label: string, value: string) => brand.muted(label + ': ') + chalk.white(value),
};

// Banner for CLI startup
export function printBanner() {
  console.log('');
  console.log(brand.primary.bold('  ███╗   ███╗███████╗ ██████╗ ██████╗ ███╗   ███╗'));
  console.log(brand.primary.bold('  ████╗ ████║██╔════╝██╔═══██╗██╔══██╗████╗ ████║'));
  console.log(brand.accent.bold('  ██╔████╔██║█████╗  ██║   ██║██████╔╝██╔████╔██║'));
  console.log(brand.accent.bold('  ██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██╗██║╚██╔╝██║'));
  console.log(brand.secondary.bold('  ██║ ╚═╝ ██║██║     ╚██████╔╝██║  ██║██║ ╚═╝ ██║'));
  console.log(brand.secondary.bold('  ╚═╝     ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝'));
  console.log('');
  console.log(brand.muted('  MUSHcode Pre-processor & Formatter'));
  console.log('');
}

// Progress spinner (for long operations)
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start() {
    this.interval = setInterval(() => {
      process.stdout.write(`\r${brand.info(this.frames[this.currentFrame])} ${chalk.white(this.message)}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }

  update(message: string) {
    this.message = message;
  }

  succeed(message?: string) {
    this.stop();
    console.log(`\r${brand.success('✓')} ${chalk.white(message || this.message)}`);
  }

  fail(message?: string) {
    this.stop();
    console.log(`\r${brand.error('✗')} ${chalk.white(message || this.message)}`);
  }

  warn(message?: string) {
    this.stop();
    console.log(`\r${brand.warning('⚠')} ${chalk.white(message || this.message)}`);
  }

  private stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r\x1b[K'); // Clear line
    }
  }
}

export default {
  brand,
  log,
  fmt,
  printBanner,
  Spinner,
};
