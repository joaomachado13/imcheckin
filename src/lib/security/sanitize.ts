/**
 * Sanitize user input for use in Supabase queries
 * Removes characters that could be used for filter injection
 */
export function sanitizeSearchTerm(input: string): string {
  if (!input) return '';
  
  // Remove PostgREST filter special characters that could manipulate queries
  // These include: , . ( ) % * and other filter operators
  const sanitized = input
    .replace(/[,%().*\\]/g, '')  // Remove dangerous characters
    .trim()
    .slice(0, 100);  // Limit length to prevent DoS
  
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'A senha deve ter pelo menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra maiúscula' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra minúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos um número' };
  }
  return { valid: true };
}
