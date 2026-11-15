export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordValidationResult {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Evaluates password strength against the organization's standard policy:
 * minimum 8 characters, at least one digit, and at least one special symbol.
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;']/.test(password);
  const isValid = hasMinLength && hasNumber && hasSpecial;

  let errorMessage: string | undefined;
  if (!hasMinLength) {
    errorMessage = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  } else if (!hasNumber) {
    errorMessage = "La contraseña debe incluir al menos un número (0-9).";
  } else if (!hasSpecial) {
    errorMessage = "La contraseña debe incluir al menos un símbolo (@#$%!).";
  }

  return {
    hasMinLength,
    hasNumber,
    hasSpecial,
    isValid,
    errorMessage,
  };
}
