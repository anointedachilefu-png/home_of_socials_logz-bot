export const generateOrderId = (): string => {
  const prefix = 'HS';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const formatCurrency = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const escapeMarkdown = (text: string | undefined): string => {
  if (!text) return '';
  return text
    .replace(/_/g, '\_')
    .replace(/\*/g, '\*')
    .replace(/\[/g, '\[')
    .replace(/\]/g, '\]')
    .replace(/\(/g, '\(')
    .replace(/\)/g, '\)')
    .replace(/~/g, '\~')
    .replace(/`/g, '\`')
    .replace(/>/g, '\>')
    .replace(/#/g, '\#')
    .replace(/\+/g, '\+')
    .replace(/-/g, '\-')
    .replace(/=/g, '\=')
    .replace(/\|/g, '\|')
    .replace(/\{/g, '\{')
    .replace(/\}/g, '\}')
    .replace(/\./g, '\.')
    .replace(/!/g, '\!');
};
