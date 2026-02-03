import { FormatterState } from '../graph';

/**
 * Verifier Node.
 * Validates that code was successfully parsed and linted.
 */
export async function verificationNode(state: FormatterState): Promise<Partial<FormatterState>> {
  console.log("--- Verification Start ---");

  // Check if we have lines to verify
  const lines = state.formattedLines || [];
  if (lines.length === 0) {
      console.warn("No code to verify.");
      return { 
        verificationStatus: 'failed',
        iterationCount: 1 
      };
  }

  // Check lint status
  const hasErrors = state.lintErrors && state.lintErrors.length > 0;
  
  if (hasErrors) {
      console.log(`Verification: ${state.lintErrors!.length} lint errors remain.`);
      return {
        verificationStatus: 'failed',
        iterationCount: 1
      };
  }

  console.log(`Verification: Successfully formatted ${lines.length} lines.`);
  return {
    verificationStatus: 'passed',
    iterationCount: 1
  };
}
