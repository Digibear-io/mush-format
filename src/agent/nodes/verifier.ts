import { FormatterState } from '../graph';
import { log, fmt } from '../../utils/colors';

/**
 * Verifier Node.
 * Validates that code was successfully parsed and linted.
 */
export async function verificationNode(state: FormatterState): Promise<Partial<FormatterState>> {
  log.subsection('Verification');

  // Check if we have lines to verify
  const lines = state.formattedLines || [];
  if (lines.length === 0) {
      log.warning('No code to verify');
      return { 
        verificationStatus: 'failed',
        iterationCount: 1 
      };
  }

  // Check lint status
  const hasErrors = state.lintErrors && state.lintErrors.length > 0;
  
  if (hasErrors) {
      log.error(`${fmt.number(state.lintErrors!.length)} lint errors remain`);
      return {
        verificationStatus: 'failed',
        iterationCount: 1
      };
  }

  log.success(`Successfully formatted ${fmt.number(lines.length)} lines`);
  return {
    verificationStatus: 'passed',
    iterationCount: 1
  };
}
