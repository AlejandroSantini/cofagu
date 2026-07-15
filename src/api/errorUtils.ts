import axios from 'axios';

export const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 429) {
      return 'Demasiadas peticiones. Por favor, espera un momento antes de reintentar.';
    }

    const data = err.response?.data;
    let message = data?.message || err.message || defaultMessage;

    // Check if it's a stringified JSON array (Zod error)
    if (typeof message === 'string' && message.trim().startsWith('[') && message.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(message);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
          message = parsed.map((e: { message?: string }) => e.message).filter(Boolean).join(' - ');
        }
      } catch {
        // If not valid JSON, leave it as is
      }
    } else if (Array.isArray(message)) {
      if (message.length > 0 && message[0].message) {
        message = message.map((e: { message?: string }) => e.message).filter(Boolean).join(' - ');
      }
    } else if (Array.isArray(data)) {
      if (data.length > 0 && data[0].message) {
        message = data.map((e: { message?: string }) => e.message).filter(Boolean).join(' - ');
      }
    }

    return message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return defaultMessage;
};
