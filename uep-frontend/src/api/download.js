import apiClient from './client';

// Les téléchargements passent par apiClient (et non un simple lien <a href>) pour porter le
// token d'accès ; le fichier reçu est ensuite proposé au navigateur sous son nom d'origine.
export async function downloadFile(url, fallbackName) {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] || '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  const name = encoded ? decodeURIComponent(encoded[1]) : plain ? plain[1] : fallbackName;

  const href = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.jpg,.jpeg,.png,.zip';

// Message d'erreur lisible pour une réponse d'API (y compris quand elle arrive en Blob).
export async function apiErrorMessage(err, fallback) {
  let data = err.response?.data;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  }
  return data?.message || fallback;
}
